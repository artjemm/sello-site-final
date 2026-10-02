/**
 * IndexNow — avisa Bing, Yandex (e quem mais participar) que URLs mudaram.
 *
 * POR QUE
 * O Google lê o sitemap no ritmo dele; o Bing aceita ser avisado. E o índice
 * do Bing alimenta mais do que o Bing: é a base de busca de vários
 * assistentes de IA. Avisar custa uma requisição.
 *
 * COMO FUNCIONA
 * Lê o sitemap publicado (https://selloapp.com.br/sitemap.xml), junta as
 * <loc> e manda tudo num POST para https://api.indexnow.org/indexnow, que
 * repassa aos buscadores participantes. Quem recebe confere a posse do site
 * baixando o arquivo da chave em `keyLocation` — por isso o arquivo
 * `<CHAVE>.txt` precisa estar NO AR antes da primeira execução. O script
 * confere isso sozinho e para se a chave não bater.
 *
 * USO (da raiz do repositório, Node 18+)
 *   node scripts/indexnow.mjs                    # todas as URLs do sitemap
 *   node scripts/indexnow.mjs --since 2026-10-01 # só as com lastmod >= data
 *   node scripts/indexnow.mjs --dry-run          # mostra o que mandaria, não manda
 *
 * QUANDO RODAR
 * Depois de um deploy que muda páginas, ou de uma rodada grande no catálogo.
 * Não precisa de toda hora: reenviar URL que não mudou não ajuda, e mandar
 * demais pode fazer o serviço passar a ignorar o site (resposta 429).
 *
 * A chave não é segredo — ela fica pública no próprio site por desenho do
 * protocolo. Trocar a chave = criar outro <CHAVE>.txt na raiz e mudar KEY.
 */

const HOST = 'selloapp.com.br';
const SITE = `https://${HOST}`;
const KEY = '6b14ee3459aca5d45bdb301d14e920eb';
const KEY_LOCATION = `${SITE}/${KEY}.txt`;
const ENDPOINT = 'https://api.indexnow.org/indexnow';
const LOTE = 10000; // limite do protocolo por requisição

function argumento(nome) {
  const i = process.argv.indexOf(nome);
  return i > -1 ? process.argv[i + 1] : undefined;
}

/** <url> do sitemap → { loc, lastmod }. Regex basta: o sitemap é nosso e
 *  plano (sem índice de sitemaps, sem namespaces extras). */
function lerSitemap(xml) {
  return [...xml.matchAll(/<url>([\s\S]*?)<\/url>/g)].map((m) => ({
    loc: (m[1].match(/<loc>([^<]+)<\/loc>/) || [])[1],
    lastmod: (m[1].match(/<lastmod>([^<]+)<\/lastmod>/) || [])[1],
  })).filter((u) => u.loc)
    .map((u) => ({ ...u, loc: u.loc.replace(/&amp;/g, '&') }));
}

async function main() {
  const desde = argumento('--since');
  const seco = process.argv.includes('--dry-run');

  // 1. A chave publicada tem que ser esta; senão o aviso é recusado (403).
  const chave = await fetch(KEY_LOCATION).then((r) => (r.ok ? r.text() : ''));
  if (chave.trim() !== KEY) {
    console.error(`A chave não está no ar em ${KEY_LOCATION}. Faça o deploy do arquivo antes.`);
    process.exit(1);
  }

  // 2. URLs do sitemap ao vivo.
  const r = await fetch(`${SITE}/sitemap.xml`);
  if (!r.ok) {
    console.error(`Sitemap respondeu ${r.status}.`);
    process.exit(1);
  }
  let urls = lerSitemap(await r.text());
  // Com --since, URL sem lastmod fica de fora: não dá para saber se mudou.
  if (desde) urls = urls.filter((u) => u.lastmod && u.lastmod >= desde);
  const lista = urls.map((u) => u.loc).filter((u) => u.startsWith(SITE + '/'));

  console.log(`${lista.length} URLs${desde ? ` com lastmod >= ${desde}` : ''}.`);
  if (!lista.length) return;
  if (seco) {
    lista.slice(0, 20).forEach((u) => console.log('  ' + u));
    if (lista.length > 20) console.log(`  … e mais ${lista.length - 20}`);
    return;
  }

  // 3. Envio em lotes. 200 = aceito; 202 = aceito, chave ainda em validação.
  for (let i = 0; i < lista.length; i += LOTE) {
    const urlList = lista.slice(i, i + LOTE);
    const resp = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ host: HOST, key: KEY, keyLocation: KEY_LOCATION, urlList }),
    });
    console.log(`Lote ${i / LOTE + 1}: ${urlList.length} URLs → HTTP ${resp.status} ${await resp.text()}`);
    if (resp.status >= 400) process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
