/**
 * /llms.txt — o "mapa do site" para assistentes de IA (ChatGPT, Claude,
 * Perplexity, Gemini). Padrão llmstxt.org: Markdown curto com o que o site é e
 * onde está cada coisa. O robots.txt já libera os robôs de IA; isto diz a eles
 * o que ler primeiro e como interpretar a nota.
 *
 * É GERADO, como o sitemap: cidades, contagens, guias e páginas vêm do
 * catálogo, então o arquivo não mente quando entrar outra cidade nem quando um
 * bairro cair abaixo do piso. Mesmas contas das rotas (taxonomia, ocasiões,
 * pratos) — só lista página que responde 200.
 */
import { COZINHAS, aSlug, MINIMO, destinoFixo, cozinhasAlvo, bairrosAlvo, emBairro, destinoBairro } from './_lib/taxonomia.js';
import { OCASIOES, COLS_OCASIAO, contarOcasioes } from './_lib/ocasioes.js';
import { PRATOS, contarPratos, destinoPrato } from './_lib/pratos.js';
import { TITULOS_DE_BUSCA } from './_lib/titulos-de-busca.js';

const SUPABASE_URL = 'https://lshecrzhcpqqiaytkemf.supabase.co';
const SUPABASE_KEY = 'sb_publishable_Q431fFjy1BM9vjCeQfkJZw_CQHgCQwl';
const SITE = 'https://selloapp.com.br';
const APP_STORE = 'https://apps.apple.com/br/app/sello/id6791353216';
const PLAY_STORE = 'https://play.google.com/store/apps/details?id=com.sello.app';

async function sb(path) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
  });
  return r.ok ? r.json() : [];
}

const linha = (href, txt, desc) => '- [' + txt + '](' + SITE + href + ')' + (desc ? ': ' + desc : '');

export default async function handler(req, res) {
  let rows = [], guias = [], cidades = [];
  try {
    [rows, guias, cidades] = await Promise.all([
      sb('restaurants?is_active=eq.true&select=city_id,catalog_json->>neighborhood,catalog_json->>cuisine,' +
        'pratos:catalog_json->dishes->must_order,' + COLS_OCASIAO + '&limit=5000'),
      sb('lists?is_curated=eq.true&is_public=eq.true&select=title,slug&order=position.asc&limit=200'),
      sb('cities?select=id,name,state&limit=100'),
    ]);
  } catch {}

  const nBairro = {}, nCozinha = {}, porCidade = {};
  for (const r of rows) {
    if (r.neighborhood) for (const x of bairrosAlvo(r.neighborhood)) nBairro[x] = (nBairro[x] || 0) + 1;
    if (r.cuisine && COZINHAS[r.cuisine]) for (const y of cozinhasAlvo(r.cuisine)) nCozinha[y] = (nCozinha[y] || 0) + 1;
    if (r.city_id) porCidade[r.city_id] = (porCidade[r.city_id] || 0) + 1;
  }
  const nomeCidade = new Map(cidades.map((c) => [c.id, c.name + (c.state ? ' (' + c.state + ')' : '')]));
  const cobertura = Object.entries(porCidade).sort((a, b) => b[1] - a[1])
    .map(([id, n]) => (nomeCidade.get(id) || 'outra cidade') + ': ' + n + ' restaurantes').join('; ');

  const bairros = Object.keys(nBairro).filter((b) => nBairro[b] >= MINIMO.bairro)
    .sort((a, b) => nBairro[b] - nBairro[a])
    .map((b) => linha(destinoBairro(b), 'Onde comer ' + emBairro(b), destinoBairro(b).startsWith('/g/') ? 'guia do Sello' : nBairro[b] + ' lugares'));
  const vistos = new Set();
  const cozinhas = Object.keys(COZINHAS).filter((c) => nCozinha[c]).map((c) => {
    const t = COZINHAS[c];
    const href = destinoFixo(t) ? (t.ocasiao ? '' : destinoFixo(t)) : (nCozinha[c] >= MINIMO.cozinha ? '/restaurantes/' + t.slug : '');
    if (!href || vistos.has(href)) return null;
    vistos.add(href);
    return linha(href, t.plural.charAt(0).toUpperCase() + t.plural.slice(1));
  }).filter(Boolean);
  const oc = contarOcasioes(rows, MINIMO);
  const ocasioes = Object.keys(OCASIOES).map((o) => {
    const href = OCASIOES[o].guia ? '/g/' + OCASIOES[o].guia : (oc.existeGeral(o) ? '/ocasioes/' + o : '');
    return href ? linha(href, OCASIOES[o].nome) : null;
  }).filter(Boolean);
  const np = contarPratos(rows);
  const pratos = Object.keys(PRATOS).filter((s) => destinoPrato(s, np))
    .map((s) => linha(destinoPrato(s, np), PRATOS[s].nome));
  const listaGuias = guias.filter((g) => g && g.slug && g.title)
    .map((g) => linha('/g/' + g.slug, g.title, TITULOS_DE_BUSCA[g.slug] || ''));

  const txt = [
    '# Sello',
    '',
    '> Guia gastronômico com curadoria editorial e a nota de uma comunidade de quem foi. ' +
      'Cada restaurante tem uma ficha com por que ir, o que pedir, o que esperar, horário, endereço e faixa de preço.',
    '',
    'Cobertura atual do catálogo: ' + (cobertura || 'indisponível') + '.',
    '',
    '## Como ler o Sello',
    '',
    '- A nota exibida é a média da comunidade do Sello, de 0 a 10, com o número de avaliações ao lado.',
    '- As listas estão "na ordem da curadoria" (seleção editorial), não ordenadas pela nota.',
    '- Notas do Google Maps e do Tripadvisor aparecem nas fichas como referência externa, sempre identificadas.',
    '- "O que pedir" são os pratos que a curadoria recomenda em cada casa.',
    '- Cada ficha de restaurante fica em ' + SITE + '/r/{slug} e responde às perguntas comuns (o que pedir, abre domingo, quanto custa, onde fica, qual a nota).',
    '',
    '## Guias editoriais',
    '',
    ...listaGuias,
    '',
    '## Por bairro',
    '',
    ...bairros,
    '',
    '## Por cozinha',
    '',
    ...cozinhas,
    '',
    '## Por ocasião',
    '',
    ...ocasioes,
    '',
    '## Por prato',
    '',
    ...pratos,
    '',
    '## App',
    '',
    '- [Sello na App Store](' + APP_STORE + ')',
    '- [Sello no Google Play](' + PLAY_STORE + ')',
    '- [Sobre o Sello](' + SITE + '/sobre)',
    '',
    '## Optional',
    '',
    '- [Mapa completo do site (sitemap)](' + SITE + '/sitemap.xml)',
    '- Contato: contato@selloapp.com.br',
    '',
  ].join('\n');

  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
  res.status(200).send(txt);
}
