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
 * Gerada, não escrita: a curadoria muda no app toda semana e um índice à mão
 * nasceria desatualizado.
 */

import { TITULOS_DE_BUSCA } from './titulos-de-busca.js';

const SUPABASE_URL = 'https://lshecrzhcpqqiaytkemf.supabase.co';
const SUPABASE_KEY = 'sb_publishable_Q431fFjy1BM9vjCeQfkJZw_CQHgCQwl';
const SITE = 'https://selloapp.com.br';
const OG_FALLBACK = `${SITE}/assets/img/hero.jpg`;

function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

export default async function handler(req, res) {
  let guias = [];
  try {
    const r = await fetch(
      `${SUPABASE_URL}/rest/v1/lists?is_curated=eq.true&is_public=eq.true&select=title,subtitle,slug,cover&order=position.asc&limit=200`,
      { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } },
    );
    if (r.ok) guias = await r.json();
  } catch {
    /* Banco fora do ar devolve a página com a casca e sem a lista, que ainda
     * leva ao app. Melhor que um 500. */
  }

  const itens = guias
    .filter((g) => g && g.slug && g.title)
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

  const title = 'Guias de restaurantes de São Paulo | Sello';
  const description =
    `${guias.length} guias com curadoria do Sello: por cozinha, por bairro e por ocasião. ` +
    `Onde comer em São Paulo, escolhido a dedo.`;

  const jsonld = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Guias do Sello',
    description,
    url: `${SITE}/guias`,
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
<script type="application/ld+json">${JSON.stringify(jsonld)}</script>
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
  ul { list-style:none; margin:0; padding:0; }
  li { padding:16px 0; border-top:1px solid #F1F1F3; }
  li a { display:block; color:var(--ink); font-weight:700; font-size:17px; text-decoration:none; }
  li a:hover { text-decoration:underline; }
  .sub { display:block; color:var(--muted); font-size:15px; line-height:1.5; margin-top:3px; }
  .meta { display:block; color:#9AA0A8; font-size:13px; margin-top:4px; }
  .foot { margin-top:40px; text-align:center; font-size:14px; }
  .foot a { color:var(--red); font-weight:700; text-decoration:none; }
</style>
</head>
<body>
  <main>
    <div class="kicker">Sello</div>
    <h1>Guias de São Paulo</h1>
    <p class="lead">${esc(description)}</p>
    <ul>${itens}</ul>
    <div class="foot"><a href="/baixar">Baixar o app</a></div>
  </main>
<script defer src="/_vercel/insights/script.js"></script>
</body>
</html>`);
}
