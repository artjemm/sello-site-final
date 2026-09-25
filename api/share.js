/**
 * Páginas de compartilhamento — /r/:slug, /g/:slug, /l/:slug, /u/:username
 *
 * O que o app compartilha precisa cair em algum lugar. Estas páginas existem
 * para dois públicos ao mesmo tempo:
 *
 *  1. O ROBÔ do WhatsApp/Instagram/Twitter, que lê as meta tags og: para montar
 *     a prévia. Ele NÃO executa JavaScript, então título, descrição e imagem
 *     têm que vir prontos no HTML — é por isso que isto é uma função de
 *     servidor e não uma página estática com fetch no cliente.
 *  2. A PESSOA que clica, que deve ver o conteúdo e um caminho claro para o app.
 *
 * Uma função só atende os quatro tipos: a diferença entre eles é qual tabela
 * consultar e como escrever o texto — o resto (HTML, prévia, fallback) é igual,
 * e manter isso em quatro arquivos só multiplicaria os lugares onde corrigir.
 */

const SUPABASE_URL = 'https://lshecrzhcpqqiaytkemf.supabase.co';
// Chave publicável (anon). Só enxerga o que o RLS libera para qualquer visitante
// — as mesmas linhas que o app já mostra sem login.
const SUPABASE_KEY = 'sb_publishable_Q431fFjy1BM9vjCeQfkJZw_CQHgCQwl';

const SITE = 'https://selloapp.com.br';
// Mesma imagem que a home usa como prévia — existe e já está no padrão da
// marca. Entra quando o conteúdo não tem capa (lista recém-criada, perfil sem
// foto) ou quando nada foi encontrado.
const OG_FALLBACK = `${SITE}/assets/img/hero.jpg`;
const APP_STORE = 'https://apps.apple.com/br/app/sello/id6791353216';
const PLAY_STORE = 'https://play.google.com/store/apps/details?id=com.sello.app';

/** Impede que um nome de lista ou @ com `<` quebre a página — ou pior, injete
 *  markup. Todo dado vindo do banco passa por aqui antes de entrar no HTML. */
function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Extrai o identificador real de um endereço decorado.
 *
 *   z-deli-restaurante-delicatessen--r632  →  r632
 *   mamma-mia--u-50e887fa-…                →  u-50e887fa-…
 *   top-25-melhores                        →  top-25-melhores
 *
 * O app põe o nome antes do `--` só para o link ficar legível. Ler o que vem
 * DEPOIS do último `--` significa que renomear um restaurante não invalida
 * nenhum link já compartilhado — o pedaço bonito é descartável por construção.
 */
/** Guias como "Em alta no Sello" fariam "… no Sello no Sello". Corta a
 *  repetição em vez de mexer nos títulos, que são editoriais. */
function noSello(s) {
  return `${s} no Sello`.replace(/( no Sello){2,}$/i, " no Sello");
}

function realId(slug) {
  const i = slug.lastIndexOf('--');
  return i === -1 ? slug : slug.slice(i + 2);
}

/** Igual a sb(), mas devolve a lista inteira — os itens de um guia. */
async function sbAll(path) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
  });
  if (!res.ok) return [];
  const rows = await res.json();
  return Array.isArray(rows) ? rows : [];
}

async function sb(path) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
  });
  if (!res.ok) return null;
  const rows = await res.json();
  return Array.isArray(rows) && rows.length ? rows[0] : null;
}

/** Busca o conteúdo e devolve a cópia de cada tipo, já no formato da página.
 *  `deepLink` é o caminho equivalente dentro do app. */
async function resolve(type, rawSlug) {
  // O trecho bonito do endereço é enfeite; o identificador vem depois do `--`.
  const slug = realId(rawSlug);
  if (type === 'r') {
    // O endereço novo é o nome (z-deli-restaurante-delicatessen); o antigo é o
    // identificador interno (r632). Aceitar os dois mantém válido tudo que já
    // foi compartilhado e tudo que ainda venha de um app desatualizado.
    const COLS = 'name,slug,share_slug,hero_image,address,phone,instagram,menu_url,website,price_level,rating_score,review_count,lat,lng,catalog_json';
    const r =
      (await sb(
        `restaurants?share_slug=eq.${encodeURIComponent(slug)}&is_active=eq.true&select=${COLS}&limit=1`,
      )) ||
      (await sb(
        `restaurants?slug=eq.${encodeURIComponent(slug)}&is_active=eq.true&select=${COLS}&limit=1`,
      ));
    if (!r) return null;
    return fichaRestaurante(r);
  }

  if (type === 'g') {
    const g = await sb(
      `lists?slug=eq.${encodeURIComponent(slug)}&is_curated=eq.true&is_public=eq.true&select=id,title,slug,cover,subtitle,intro&limit=1`,
    );
    if (!g) return null;
    const itens = await sbAll(
      `list_restaurants?list_id=eq.${encodeURIComponent(g.id)}&select=position,restaurants(name,slug,share_slug,catalog_json)&order=position.asc&limit=200`,
    );
    return fichaGuia(g, itens);
  }

  if (type === 'l') {
    const l =
      (await sb(
        `lists?share_slug=eq.${encodeURIComponent(slug)}&is_public=eq.true&select=id,title,slug,cover,user_id&limit=1`,
      )) ||
      (await sb(
        `lists?slug=eq.${encodeURIComponent(slug)}&is_public=eq.true&select=id,title,slug,cover,user_id&limit=1`,
      ));
    if (!l) return null;
    // O @ do dono entra no texto, então vale uma segunda consulta — sem ele a
    // frase perderia justamente o que faz alguém clicar: quem montou a lista.
    const owner = l.user_id
      ? await sb(
          `profiles_public?id=eq.${encodeURIComponent(l.user_id)}&select=username&limit=1`,
        )
      : null;
    const at = owner?.username ? `@${owner.username}` : 'alguém';
    return {
      title: noSello(`Confira a lista ${l.title} de ${at}`),
      description: `Explore a seleção de restaurantes criada por ${at} e descubra novos lugares para conhecer.`,
      image: l.cover,
      heading: l.title,
      kicker: `Lista de ${at}`,
      deepLink: `sello://userlist/${l.id}`,
    };
  }

  if (type === 'u') {
    const u = await sb(
      `profiles_public?username=eq.${encodeURIComponent(slug)}&select=name,username,avatar_url&limit=1`,
    );
    if (!u) return null;
    return {
      title: noSello(`Confira o perfil de @${u.username}`),
      description: 'Explore suas listas, avaliações e restaurantes favoritos.',
      image: u.avatar_url,
      heading: u.name || `@${u.username}`,
      kicker: `@${u.username}`,
      deepLink: `sello://user/${u.username}`,
    };
  }

  return null;
}

/* ──────────────────────────────────────────────────────────────────────────
 * Ficha de restaurante
 *
 * Estas páginas nasceram só para a prévia do WhatsApp, e por isso diziam a
 * MESMA frase para os ~500 restaurantes ("Descubra fotos, informações..."):
 * centenas de URLs idênticas, que para busca é conteúdo raso e conta contra o
 * site inteiro em vez de a favor.
 *
 * O editorial já existia no catalog_json — hook, o take do Sello, por que ir,
 * o que esperar, pratos, horários. Só não estava sendo lido. Aqui ele vira o
 * corpo da página, o que serve de uma vez a três públicos: o robô da prévia, o
 * buscador, e quem chega da busca e quer decidir onde jantar.
 *
 * NADA aqui fixa cidade. Bairro e endereço vêm do dado, então o dia em que o
 * catálogo tiver Rio ou Curitiba as páginas se descrevem sozinhas.
 * ────────────────────────────────────────────────────────────────────────── */

/** "$$" a "$$$$" — o número sozinho não diz nada para quem lê. */
function cifroes(n) {
  const v = Number(n);
  return v >= 1 && v <= 4 ? '$'.repeat(v) : '';
}

function secao(titulo, corpo) {
  return corpo ? '<section><h2>' + esc(titulo) + '</h2>' + corpo + '</section>' : '';
}

function lista(itens) {
  const li = (itens || []).filter(Boolean).map((t) => '<li>' + esc(t) + '</li>').join('');
  return li ? '<ul>' + li + '</ul>' : '';
}

function paragrafo(t) {
  return t ? '<p>' + esc(t) + '</p>' : '';
}

function fichaRestaurante(r) {
  const c = r.catalog_json || {};
  const cozinha = c.cuisine || c.sello_primary_category || '';
  const bairro = c.neighborhood || '';
  const preco = cifroes(c.price_range != null ? c.price_range : r.price_level);

  /* O título é a linha azul do Google. "Confira o X" não é buscado por
   * ninguém; "X — Japonesa em Bela Vista" carrega o nome, a cozinha e o
   * bairro, que é exatamente como a pessoa procura. */
  const partes = [cozinha, bairro ? 'em ' + bairro : ''].filter(Boolean).join(' ');
  const title = partes ? r.name + ' — ' + partes + ' | Sello' : noSello(r.name);

  /* A descrição precisa ser única por restaurante: é ela que aparece embaixo
   * do título na busca, e era ela a frase repetida em todas as páginas. */
  const description =
    c.hook ||
    c.description ||
    c.sello_take_body ||
    r.name + (bairro ? ' — ' + bairro : '') + '. Veja avaliação, pratos e horários no Sello.';

  const horarios = (c.hours || [])
    .filter((h) => h && h.label)
    .map((h) => '<tr><th>' + esc(h.label) + '</th><td>' + esc(h.value) + '</td></tr>')
    .join('');

  const pratos = ((c.dishes && c.dishes.must_order) || [])
    .filter((d) => d && d.name)
    .map((d) => '<li><strong>' + esc(d.name) + '</strong>' + (d.note ? ' — ' + esc(d.note) : '') + '</li>')
    .join('');

  const contato = [
    r.address ? '<tr><th>Endereço</th><td>' + esc(r.address) + '</td></tr>' : '',
    preco ? '<tr><th>Faixa de preço</th><td>' + esc(preco) + '</td></tr>' : '',
    r.phone ? '<tr><th>Telefone</th><td>' + esc(r.phone) + '</td></tr>' : '',
    r.instagram
      ? '<tr><th>Instagram</th><td><a rel="nofollow" href="https://instagram.com/' +
        esc(r.instagram) + '">@' + esc(r.instagram) + '</a></td></tr>'
      : '',
  ].filter(Boolean).join('');

  /* Cada seção só entra se o dado existir. Restaurante sem editorial cai numa
   * página curta — menos do que gostaríamos, mas honesta. Preencher buraco com
   * texto genérico era exatamente o problema que esta mudança resolve. */
  const body = [
    secao('O take do Sello', paragrafo(c.sello_take_body)),
    secao('Por que ir', lista(c.why_go)),
    secao('O que esperar', paragrafo(c.what_to_expect)),
    pratos ? '<section><h2>O que pedir</h2><ul>' + pratos + '</ul></section>' : '',
    secao('O que a comunidade diz', paragrafo(c.community_summary)),
    horarios ? '<section><h2>Horários</h2><table>' + horarios + '</table></section>' : '',
    contato ? '<section><h2>Onde fica</h2><table>' + contato + '</table></section>' : '',
  ].filter(Boolean).join('');

  /* Schema de restaurante. Não é truque de AEO — é o caso em que o dado
   * estruturado existe de verdade e o Google tem resultado rico para ele.
   * O endereço entra como texto puro: quebrar a string em rua/cidade/UF sem
   * ter os campos separados no banco só produziria dado errado com cara de
   * certo, e erra mais ainda quando chegar cidade nova. */
  const jsonld = {
    '@context': 'https://schema.org',
    '@type': 'Restaurant',
    name: r.name,
    url: SITE + '/r/' + (r.share_slug || r.slug),
  };
  if (r.hero_image) jsonld.image = r.hero_image;
  if (c.hook) jsonld.description = c.hook;
  if (cozinha) jsonld.servesCuisine = cozinha;
  if (preco) jsonld.priceRange = preco;
  if (r.phone) jsonld.telephone = r.phone;
  if (r.address) {
    jsonld.address = { '@type': 'PostalAddress', streetAddress: r.address, addressCountry: 'BR' };
  }
  if (r.lat && r.lng) {
    jsonld.geo = { '@type': 'GeoCoordinates', latitude: r.lat, longitude: r.lng };
  }
  if (r.rating_score && r.review_count) {
    jsonld.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: r.rating_score,
      reviewCount: r.review_count,
      bestRating: 5,
    };
  }

  return {
    title: title,
    description: description,
    image: r.hero_image,
    heading: r.name,
    kicker: [cozinha, bairro].filter(Boolean).join(' · ') || 'Restaurante',
    deepLink: 'sello://restaurant/' + r.slug,
    body: body,
    jsonld: jsonld,
  };
}

/* ──────────────────────────────────────────────────────────────────────────
 * Ficha de guia
 *
 * Mesmo problema que as fichas de restaurante tinham: os 50 guias repetiam
 * "Uma curadoria editorial do Sello..." palavra por palavra.
 *
 * Aqui a lista de restaurantes é o conteúdo. Cada item aponta para a ficha
 * dele, o que resolve de quebra um buraco que nenhum texto resolveria: até
 * agora NADA no site linkava para as ~515 fichas. Elas existiam soltas, sem
 * porta de entrada a não ser alguém compartilhar o link por fora.
 * ────────────────────────────────────────────────────────────────────────── */

function fichaGuia(g, itens) {
  const linhas = (itens || [])
    .map((it) => it && it.restaurants)
    .filter((r) => r && r.name)
    .map((r) => {
      const c = r.catalog_json || {};
      const href = '/r/' + (r.share_slug || r.slug);
      const onde = [c.cuisine, c.neighborhood].filter(Boolean).join(' · ');
      return (
        '<li><a href="' + esc(href) + '">' + esc(r.name) + '</a>' +
        (onde ? ' <span class="meta">' + esc(onde) + '</span>' : '') +
        (c.hook ? '<br />' + esc(c.hook) : '') +
        '</li>'
      );
    });

  const title = g.title + ' | Guia do Sello';

  /* `intro` é escrito pela curadoria e é diferente em cada guia — era isso que
   * devia estar na descrição desde o começo, em vez da frase única. */
  const description =
    g.intro ||
    g.subtitle ||
    'Uma seleção do Sello com ' + linhas.length + ' restaurantes escolhidos pela curadoria.';

  /* O intro NÃO entra no corpo: ele já é o parágrafo de abertura da página,
   * e repetir o mesmo texto duas vezes na mesma tela é o tipo de duplicação
   * que esta mudança existe para acabar. A lista é o conteúdo do guia. */
  const body = [
    linhas.length
      ? '<section><h2>Os restaurantes deste guia</h2><ol class="guia">' +
        linhas.join('') +
        '</ol></section>'
      : '',
  ].filter(Boolean).join('');

  /* ItemList é o schema que descreve exatamente o que um guia é: uma lista
   * ordenada de lugares. Sem inventar tipo que não se aplica. */
  const jsonld = linhas.length
    ? {
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        name: g.title,
        description: description,
        numberOfItems: linhas.length,
        itemListElement: (itens || [])
          .map((it) => it && it.restaurants)
          .filter((r) => r && r.name)
          .map((r, i) => ({
            '@type': 'ListItem',
            position: i + 1,
            name: r.name,
            url: SITE + '/r/' + (r.share_slug || r.slug),
          })),
      }
    : null;

  return {
    title: title,
    description: description,
    image: g.cover,
    heading: g.title,
    kicker: g.subtitle || 'Guia do Sello',
    deepLink: 'sello://list/' + g.slug,
    body: body,
    jsonld: jsonld,
  };
}

function page(data, canonical) {
  const img = data.image || OG_FALLBACK;
  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(data.title)}</title>
<meta name="description" content="${esc(data.description)}" />
<link rel="canonical" href="${esc(canonical)}" />
<meta property="og:type" content="website" />
<meta property="og:site_name" content="Sello" />
<meta property="og:locale" content="pt_BR" />
<meta property="og:url" content="${esc(canonical)}" />
<meta property="og:title" content="${esc(data.title)}" />
<meta property="og:description" content="${esc(data.description)}" />
<meta property="og:image" content="${esc(img)}" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${esc(data.title)}" />
<meta name="twitter:description" content="${esc(data.description)}" />
<meta name="twitter:image" content="${esc(img)}" />
${data.jsonld ? '<script type="application/ld+json">' + JSON.stringify(data.jsonld) + '</script>' : ''}
<link rel="icon" href="/favicon.svg" />
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Anton+SC&family=Open+Sans:wght@400;600;700&display=swap" rel="stylesheet" />
<style>
  :root { --red:#E30F2F; --ink:#0D111B; --muted:#4D5461; }
  * { box-sizing:border-box; }
  body { margin:0; font-family:'Open Sans',system-ui,sans-serif; color:var(--ink);
         background:#fff; display:flex; min-height:100vh; align-items:center; justify-content:center; padding:24px; }
  /* Sem ficha continua o cartão de antes. Com ficha a página vira leitura,
     então sobe para o topo e abre a medida — texto corrido em 420px de
     largura com a tela inteira vazia embaixo parece erro. */
  body.ficha { align-items:flex-start; padding-top:40px; padding-bottom:64px; }
  .card { width:100%; max-width:420px; }
  body.ficha .card { max-width:680px; }
  section { margin-top:32px; }
  section h2 { font-family:'Anton SC',sans-serif; font-weight:400; text-transform:uppercase;
               font-size:17px; letter-spacing:.02em; margin:0 0 10px; }
  section p, section li { color:var(--muted); font-size:15px; line-height:1.6; }
  section p { margin:0; }
  section ul { margin:0; padding-left:20px; }
  section li { margin-bottom:6px; }
  ol.guia { margin:0; padding-left:22px; }
  ol.guia li { margin-bottom:14px; color:var(--muted); font-size:15px; line-height:1.55; }
  ol.guia a { color:var(--ink); font-weight:700; text-decoration:none; }
  ol.guia a:hover { text-decoration:underline; }
  .meta { color:var(--muted); font-weight:400; font-size:13px; }
  section table { width:100%; border-collapse:collapse; font-size:15px; }
  section th { text-align:left; font-weight:600; padding:8px 12px 8px 0; vertical-align:top;
               white-space:nowrap; width:1%; }
  section td { color:var(--muted); padding:8px 0; }
  section tr + tr th, section tr + tr td { border-top:1px solid #F1F1F3; }
  .cover { width:100%; aspect-ratio:16/10; object-fit:cover; border-radius:16px; background:#EEE; display:block; }
  .kicker { font-size:13px; color:var(--red); font-weight:700; text-transform:uppercase;
            letter-spacing:.06em; margin:20px 0 6px; }
  h1 { font-family:'Anton SC',sans-serif; font-weight:400; text-transform:uppercase;
       font-size:30px; line-height:1.15; margin:0 0 10px; }
  p { color:var(--muted); font-size:15px; line-height:1.55; margin:0 0 24px; }
  .cta { display:block; text-align:center; text-decoration:none; border-radius:14px;
         padding:15px 20px; font-weight:700; font-size:15px; }
  .primary { background:var(--red); color:#fff; }
  .stores { display:flex; gap:10px; margin-top:10px; }
  .stores a { flex:1; border:1.5px solid #E4E4E7; color:var(--ink); }
  .foot { margin-top:28px; text-align:center; font-size:13px; }
  .foot a { color:var(--muted); }
</style>
</head>
<body class="${data.body ? 'ficha' : ''}">
  <main class="card">
    <img class="cover" src="${esc(img)}" alt="" onerror="this.src='${esc(OG_FALLBACK)}'" />
    <div class="kicker">${esc(data.kicker)}</div>
    <h1>${esc(data.heading)}</h1>
    <p>${esc(data.description)}</p>
    <a class="cta primary" href="${esc(data.deepLink)}">Abrir no Sello</a>
    <div class="stores">
      <a class="cta" href="${APP_STORE}">App Store</a>
      <a class="cta" href="${PLAY_STORE}">Google Play</a>
    </div>
    ${data.body || ''}
    <div class="foot"><a href="${SITE}">selloapp.com.br</a></div>
  </main>
<script>
  // Quem já tem o app vai direto para a tela certa. Só depois de um gesto? Não:
  // navegadores bloqueiam a abertura automática de esquema em alguns casos, e o
  // botão acima cobre esses. Aqui é só a tentativa silenciosa, sem redirecionar
  // para a loja depois — mandar quem não tem o app para a loja no susto some
  // com a página que ele veio ver.
  // Quem chega de um link compartilhado quer o app: continua indo direto.
  // Quem chega de uma BUSCA veio ler a página — mandar essa pessoa para o app
  // apaga o conteúdo que ela pediu e a devolve para o Google. O botão acima
  // segue ali para os dois casos, então ninguém perde o caminho.
  var deBusca = /(^|\.)(google|bing|duckduckgo|yahoo|ecosia|brave)\./i.test(
    (document.referrer || '').replace(/^https?:\/\//, '').split('/')[0]
  );
  if (!deBusca) {
    setTimeout(function () { location.href = ${JSON.stringify(data.deepLink)}; }, 400);
  }
</script>
<!-- ── Medição ──────────────────────────────────────────────────────────────
     Vercel Web Analytics. Pageview vem de graça; o clique de download precisa
     ser marcado à mão, porque ele SAI do site direto para a loja da Apple ou
     do Google — não existe página nossa depois dele para carregar script e ser
     contada. Sem isto, a única conversão que o site tem não aparece em lugar
     nenhum, e não dá para saber se o tráfego de busca vira instalação. -->
<script defer src="/_vercel/insights/script.js"></script>
<script>
(function () {
  // 'va' é fila: o script acima carrega com 'defer', então tudo que for
  // marcado antes dele chegar espera em window.vaq e é drenado depois. Marcar
  // cedo não perde evento.
  window.va = window.va || function () { (window.vaq = window.vaq || []).push(arguments); };
  function marcar(nome, dados) {
    try { window.va('event', { name: nome, data: dados || {} }); } catch (e) {}
  }
  // Delegação na captura: pega o clique mesmo que o botão só exista depois
  // (modal de download) e mesmo que algum handler pare a propagação.
  document.addEventListener('click', function (ev) {
    var el = ev.target;
    var a = el && el.closest ? el.closest('a[href]') : null;
    if (!a) return;
    var href = a.getAttribute('href') || '';
    var pagina = location.pathname;
    if (href.indexOf('apps.apple.com') > -1) { marcar('baixar_loja', { loja: 'ios', pagina: pagina }); return; }
    if (href.indexOf('play.google.com') > -1) { marcar('baixar_loja', { loja: 'android', pagina: pagina }); return; }
    // Intenção: quem pediu para baixar mas ainda não escolheu a loja. A
    // diferença entre os dois números é onde as pessoas desistem.
    if (href === '#baixar' || /\/(download|baixar|app)$/.test(href)) marcar('baixar_intencao', { pagina: pagina });
    // Nas fichas, abrir no app é o equivalente da conversão.
    if (href.indexOf('sello://') === 0) marcar('abrir_no_app', { pagina: pagina });
  }, true);
})();
</script>
</body>
</html>`;
}

function notFound(canonical) {
  return page(
    {
      title: 'Sello — Os melhores restaurantes vêm de pessoas.',
      description:
        'Este conteúdo não está mais disponível, mas há muito o que descobrir no Sello.',
      image: OG_FALLBACK,
      heading: 'Conteúdo não encontrado',
      kicker: 'Sello',
      deepLink: 'sello://',
    },
    canonical,
  );
}

export default async function handler(req, res) {
  const { type = '', slug = '' } = req.query || {};
  const canonical = `${SITE}/${type}/${slug}`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');

  if (!slug) {
    res.status(404).send(notFound(canonical));
    return;
  }

  let data = null;
  try {
    data = await resolve(String(type), String(slug));
  } catch {
    // Uma falha do banco não pode virar página de erro: o robô já leu o link e
    // a pessoa já clicou. Cai no conteúdo genérico, que ainda leva ao app.
  }

  if (!data) {
    res.status(404).send(notFound(canonical));
    return;
  }

  // Cache curto na borda: a prévia do WhatsApp fica estável e uma edição de
  // título aparece em minutos, não em dias.
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=3600');
  res.status(200).send(page(data, canonical));
}
