/**
 * /guias — o índice dos guias.
 *
 * Os 50 guias existem e respondem 200 desde sempre, mas NADA no site aponta
 * para eles: quem chegava na home não tinha caminho, e o Google só os conhecia
 * pelo sitemap. Guia sem porta de entrada é conteúdo bom sem leitor.
 *
 * Esta página é a porta. Para o visitante, é o lugar de vasculhar a curadoria
 * sem baixar nada; para a busca, é o que amarra os 50 numa estrutura em vez de
 * 50 páginas soltas — e página que recebe link de dentro do próprio site é
 * lida como mais importante que página órfã.
 *
 * É também a porta das páginas de bairro e de cozinha (lugares.js): sem ela, a
 * única entrada de uma página de bairro era outra página de bairro.
 *
 * Gerada, não escrita: a curadoria muda no app toda semana e um índice à mão
 * nasceria desatualizado.
 */

import { TITULOS_DE_BUSCA } from './titulos-de-busca.js';
import {
  COZINHAS, aSlug, MINIMO, destinoFixo, mapaDeCidades, cidadeDasLinhas, migalhas, rodape, jsonLd, CSS_NAV,
} from './taxonomia.js';
import { OCASIOES, COLS_OCASIAO, contarOcasioes } from './ocasioes.js';

const SUPABASE_URL = 'https://lshecrzhcpqqiaytkemf.supabase.co';
const SUPABASE_KEY = 'sb_publishable_Q431fFjy1BM9vjCeQfkJZw_CQHgCQwl';
const SITE = 'https://selloapp.com.br';
const OG_FALLBACK = `${SITE}/assets/img/hero.jpg`;

function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

async function sb(path) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
  });
  return r.ok ? r.json() : [];
}

/** As páginas de bairro e de cozinha que passam do piso — o mesmo critério da
 *  rota (lugares.js) e do sitemap. Link para página abaixo do piso levaria a
 *  um 404. Cozinha com guia fica de fora: ela já está na lista de guias, e a
 *  página dela só redireciona (308) para ele. */
function descoberta(rows) {
  const nBairro = {}, nCozinha = {};
  for (const r of rows) {
    if (r.neighborhood) nBairro[r.neighborhood] = (nBairro[r.neighborhood] || 0) + 1;
    if (r.cuisine && COZINHAS[r.cuisine]) nCozinha[r.cuisine] = (nCozinha[r.cuisine] || 0) + 1;
  }
  const porNome = (x, y) => x.localeCompare(y, 'pt-BR');
  const bairros = Object.keys(nBairro)
    .filter((b) => nBairro[b] >= MINIMO.bairro)
    .sort(porNome)
    .map((b) => ({ href: '/onde-comer/' + aSlug(b), txt: b }));
  const cozinhas = Object.keys(nCozinha)
    .filter((c) => !destinoFixo(COZINHAS[c]) && nCozinha[c] >= MINIMO.cozinha)
    .sort((x, y) => porNome(COZINHAS[x].plural, COZINHAS[y].plural))
    .map((c) => ({ href: '/restaurantes/' + COZINHAS[c].slug, txt: COZINHAS[c].plural }));
  /* Ocasiões: a página geral quando existe; quando um guia disputa a busca,
   * o link vai para o guia (é para lá que a página geral redireciona). */
  const oc = contarOcasioes(rows, MINIMO);
  const ocasioes = Object.keys(OCASIOES)
    .map((o) => {
      const href = OCASIOES[o].guia ? '/g/' + OCASIOES[o].guia : (oc.existeGeral(o) ? '/ocasioes/' + o : '');
      return href ? { href, txt: OCASIOES[o].nome } : null;
    })
    .filter(Boolean);
  return { bairros, cozinhas, ocasioes };
}

function pilulas(id, titulo, links) {
  if (!links.length) return '';
  const li = links.map((l) => `<li><a href="${esc(l.href)}">${esc(l.txt)}</a></li>`).join('');
  return `<h2 id="${id}">${esc(titulo)}</h2><ul class="rel">${li}</ul>`;
}

export default async function handler(req, res) {
  let guias = [], catalogo = [], cidades = [];
  try {
    [guias, catalogo, cidades] = await Promise.all([
      sb('lists?is_curated=eq.true&is_public=eq.true&select=title,subtitle,slug,cover&order=position.asc&limit=200'),
      sb('restaurants?is_active=eq.true&select=city_id,catalog_json->>neighborhood,catalog_json->>cuisine,' + COLS_OCASIAO + '&limit=2000'),
      sb('cities?select=id,name,state&limit=100'),
    ]);
  } catch {
    /* Banco fora do ar devolve a página com a casca e sem a lista, que ainda
     * leva ao app. Melhor que um 500. */
  }
  guias = guias.filter((g) => g && g.slug && g.title);
  const { bairros, cozinhas, ocasioes } = descoberta(catalogo);

  const itens = guias
    .map((g) => {
      /* O nome editorial é o link que a pessoa lê. O título de busca entra como
       * legenda: ajuda quem está varrendo a página a entender do que trata sem
       * ter que decifrar o nome — a mesma razão de ele existir no <title>. */
      const busca = TITULOS_DE_BUSCA[g.slug];
      return (
        `<li><a href="/g/${esc(g.slug)}">${esc(g.title)}</a>` +
        (g.subtitle ? `<span class="sub">${esc(g.subtitle)}</span>` : '') +
        (busca ? `<span class="meta">${esc(busca)}</span>` : '') +
        `</li>`
      );
    })
    .join('');

  /* A cidade vem do catálogo (restaurants.city_id → cities), não do código —
   * ver taxonomia.js. Se o catálogo tiver mais de uma cidade, o título fica
   * sem cidade em vez de afirmar a errada. UF no <title>, nome no texto. */
  const cidade = cidadeDasLinhas(catalogo, mapaDeCidades(cidades));
  const title = cidade && cidade.uf
    ? `Guias de restaurantes em ${cidade.uf} | Sello`
    : 'Guias de restaurantes | Sello';
  const h1 = cidade ? `Guias de ${cidade.nome}` : 'Guias do Sello';
  const description =
    `${guias.length} guias com curadoria do Sello: por cozinha, por bairro e por ocasião. ` +
    (cidade ? `Onde comer em ${cidade.nome}, escolhido a dedo.` : 'Onde comer, escolhido a dedo.');

  const trilha = migalhas([{ nome: 'Início', href: '/' }, { nome: 'Guias', href: '/guias' }]);
  const jsonld = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Guias do Sello',
    description,
    url: `${SITE}/guias`,
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: guias.length,
      itemListElement: guias.map((g, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        name: g.title,
        url: `${SITE}/g/${g.slug}`,
      })),
    },
  };

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=86400');
  res.status(200).send(`<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}" />
<link rel="canonical" href="${SITE}/guias" />
<meta property="og:type" content="website" />
<meta property="og:site_name" content="Sello" />
<meta property="og:locale" content="pt_BR" />
<meta property="og:url" content="${SITE}/guias" />
<meta property="og:title" content="${esc(title)}" />
<meta property="og:description" content="${esc(description)}" />
<meta property="og:image" content="${OG_FALLBACK}" />
${jsonLd(jsonld)}
${jsonLd(trilha.ld)}
<link rel="icon" href="/favicon.svg" />
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Anton+SC&family=Open+Sans:wght@400;600;700&display=swap" rel="stylesheet" />
<style>
  :root { --red:#E30F2F; --ink:#0D111B; --muted:#4D5461; }
  * { box-sizing:border-box; }
  body { margin:0; font-family:'Open Sans',system-ui,sans-serif; color:var(--ink);
         background:#fff; padding:40px 24px 64px; }
  main { max-width:680px; margin:0 auto; }
  .kicker { font-size:13px; color:var(--red); font-weight:700; text-transform:uppercase;
            letter-spacing:.06em; margin-bottom:6px; }
  h1 { font-family:'Anton SC',sans-serif; font-weight:400; text-transform:uppercase;
       font-size:32px; line-height:1.12; margin:0 0 12px; }
  .lead { color:var(--muted); font-size:16px; line-height:1.55; margin:0 0 32px; }
  h2 { font-family:'Anton SC',sans-serif; font-weight:400; text-transform:uppercase;
       font-size:18px; letter-spacing:.02em; margin:44px 0 12px; scroll-margin-top:16px; }
  ul { list-style:none; margin:0; padding:0; }
  li { padding:16px 0; border-top:1px solid #F1F1F3; }
  li a { display:block; color:var(--ink); font-weight:700; font-size:17px; text-decoration:none; }
  li a:hover { text-decoration:underline; }
  .sub { display:block; color:var(--muted); font-size:15px; line-height:1.5; margin-top:3px; }
  .meta { display:block; color:#9AA0A8; font-size:13px; margin-top:4px; }
  ul.rel { display:flex; flex-wrap:wrap; gap:8px; }
  ul.rel li { padding:0; border:0; }
  ul.rel a { display:inline-block; border:1.5px solid #E4E4E7; border-radius:999px;
             padding:7px 13px; font-size:13px; font-weight:400; }
  ul.rel a:hover { border-color:var(--red); color:var(--red); text-decoration:none; }
  .foot { margin-top:40px; text-align:center; font-size:14px; }
  .foot a { color:var(--red); font-weight:700; text-decoration:none; }
${CSS_NAV}
</style>
</head>
<body>
  <main>
    ${trilha.html}
    <div class="kicker">Sello</div>
    <h1>${esc(h1)}</h1>
    <p class="lead">${esc(description)}</p>
    <ul>${itens}</ul>
    ${pilulas('bairros', 'Onde comer por bairro', bairros)}
    ${pilulas('cozinhas', 'Por cozinha', cozinhas)}
    ${pilulas('ocasioes', 'Por ocasião', ocasioes)}
    <div class="foot"><a href="/baixar">Baixar o app</a></div>
  </main>
  ${rodape()}
<script defer src="/_vercel/insights/script.js"></script>
</body>
</html>`);
}
