/**
 * IndexNow automático — roda uma vez por dia pelo cron da Vercel (vercel.json).
 *
 * POR QUE
 * O ChatGPT e o Copilot buscam no índice do Bing: página que o Bing não tem,
 * eles não citam. O Bing aceita ser AVISADO de que uma URL mudou (IndexNow),
 * em vez de esperar o robô passar. O script manual (scripts/indexnow.mjs)
 * dependia de alguém lembrar de rodar depois de cada rodada no catálogo —
 * ninguém lembra. Aqui o aviso sai sozinho.
 *
 * O QUE MANDA
 * As URLs do sitemap com <lastmod> nos últimos 2 dias. O lastmod é a data
 * EDITORIAL (ver sitemap.js): restaurante que entrou ou teve o texto
 * reescrito, guia editado, e as páginas de bairro/cozinha/ocasião que mostram
 * esses restaurantes. Dois dias, e não um, para uma falha de execução não
 * perder nada. Reenviar o que não mudou é o que faz o serviço passar a
 * ignorar o site, por isso não se manda o sitemap inteiro todo dia.
 *
 * QUEM PODE CHAMAR
 * O cron da Vercel manda `Authorization: Bearer $CRON_SECRET` quando a
 * variável existe no projeto. Sem a variável, aceita só o user-agent do cron.
 * O pior que um estranho conseguiria é um aviso a mais ao Bing — ainda assim,
 * não fica aberto.
 */

const HOST = 'selloapp.com.br';
const SITE = `https://${HOST}`;
const KEY = '6b14ee3459aca5d45bdb301d14e920eb';
const KEY_LOCATION = `${SITE}/${KEY}.txt`;
const ENDPOINT = 'https://api.indexnow.org/indexnow';
const JANELA_DIAS = 2;

function autorizado(req) {
  const h = req.headers || {};
  const segredo = process.env.CRON_SECRET;
  if (segredo) return h.authorization === `Bearer ${segredo}`;
  return /vercel-cron/i.test(h['user-agent'] || '');
}

export default async function handler(req, res) {
  if (!autorizado(req)) {
    res.status(401).json({ ok: false });
    return;
  }

  const xml = await fetch(`${SITE}/sitemap.xml`).then((r) => (r.ok ? r.text() : ''));
  const desde = new Date(Date.now() - JANELA_DIAS * 864e5).toISOString().slice(0, 10);
  const urls = [...xml.matchAll(/<url>([\s\S]*?)<\/url>/g)]
    .map((m) => ({
      loc: ((m[1].match(/<loc>([^<]+)<\/loc>/) || [])[1] || '').replace(/&amp;/g, '&'),
      lastmod: (m[1].match(/<lastmod>([^<]+)<\/lastmod>/) || [])[1],
    }))
    .filter((u) => u.loc.startsWith(SITE + '/') && u.lastmod && u.lastmod >= desde)
    .map((u) => u.loc);

  if (!urls.length) {
    res.status(200).json({ ok: true, enviadas: 0, desde });
    return;
  }

  const resp = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ host: HOST, key: KEY, keyLocation: KEY_LOCATION, urlList: urls.slice(0, 10000) }),
  });
  // O log da função na Vercel é onde se confere se o aviso está saindo.
  console.log(`indexnow: ${urls.length} URLs desde ${desde} → HTTP ${resp.status}`);
  res.status(200).json({ ok: resp.status < 400, enviadas: urls.length, desde, indexnow: resp.status });
}
