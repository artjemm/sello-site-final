/**
 * Layout das LISTAGENS — bairro (/onde-comer), cozinha e combinação
 * (/restaurantes), ocasião (/ocasioes) e guia (/g) — out/2026.
 *
 * Mesma pele da ficha de restaurante (ficha.js), que é a da home: barra de
 * vidro, capa fixa com a folha branca subindo e o selo, títulos que sobem,
 * blocos que entram ao rolar, o fecho "Seu próximo restaurante", o rodapé
 * vermelho, a barra fixa e o popup de download. A casca vem de ficha.js
 * (navHome / fechoHome / barraEModalDownload) — não é copiada aqui.
 *
 * O que é próprio da listagem: a grade de cartões de restaurante (foto grande,
 * número na ordem da curadoria, nota da comunidade, o dado que responde à
 * página — horário de domingo na página de domingo) e os blocos de links.
 *
 * Os dados chegam prontos de lugares.js / share.js; aqui é só a forma.
 */

import { esc, horarioDeHoje, ruaCurta } from './cartao.js';
import { fmtNota } from './notas.js';
import {
  foto, srcsetCapa, navHome, fechoHome, barraEModalDownload, CSS_FICHA, JS_FICHA, ASSETS_HOME,
} from './ficha.js';
import { jsonLd } from './taxonomia.js';

const IC_PIN = '<svg class="fx-ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/></svg>';
const IC_RELOGIO = '<svg class="fx-ic" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>';
const IC_SETA = '<svg class="fx-ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';

function cifroes(n) {
  const v = Number(n);
  return v >= 1 && v <= 4 ? '$'.repeat(v) : '';
}

/**
 * O cartão de um lugar. `item` = { r, destaque? } — `r` é a linha de
 * restaurants (com catalog_json) e `destaque` ({ rotulo, valor }) o dado que
 * responde à pergunta da página; sem ele, vale o horário de hoje.
 */
function cartaoLugar(item, i, notas, numerar) {
  const r = item.r;
  const c = r.catalog_json || {};
  const href = '/r/' + (r.share_slug || r.slug);
  const nc = notas && notas.get ? notas.get(r.slug) : null;
  const preco = cifroes(c.price_range != null ? c.price_range : r.price_level);
  const meta = [c.cuisine, c.neighborhood, preco].filter(Boolean).join(' · ');
  const rua = ruaCurta(r.address);
  const hoje = horarioDeHoje(c.hours);
  const linhaHora = item.destaque
    ? '<span>' + IC_RELOGIO + '<b>' + esc(item.destaque.rotulo) + '</b> ' + esc(item.destaque.valor) + '</span>'
    : hoje ? '<span>' + IC_RELOGIO + esc(hoje) + '</span>' : '';
  return '<article class="fx-lugar" data-reveal data-delay="' + (i % 3) + '">' +
    '<a class="fx-lugar__foto" href="' + esc(href) + '" aria-label="' + esc(r.name) + '">' +
      (r.hero_image
        ? '<img src="' + esc(foto(r.hero_image, 800)) + '" alt="' + esc(r.name) + '" loading="' + (i < 3 ? 'eager' : 'lazy') + '" decoding="async" />'
        : '') +
      (numerar ? '<span class="fx-lugar__n">' + (i + 1) + '</span>' : '') +
      // O selo do app (feed, ActivityCard): quadrado vermelho, número em Anton.
      // A contagem de votos fica no rótulo e na dica, não no selo.
      (nc
        ? '<span class="fx-lugar__nota" title="Nota da comunidade: ' + nc.votos + (nc.votos === 1 ? ' avaliação' : ' avaliações') +
          '" aria-label="Nota da comunidade ' + esc(fmtNota(nc.media)) + ' de 10, ' + nc.votos + (nc.votos === 1 ? ' avaliação' : ' avaliações') + '">' +
          esc(fmtNota(nc.media)) + '</span>'
        : '') +
    '</a>' +
    '<div class="fx-lugar__txt">' +
      (meta ? '<p class="fx-lugar__meta">' + esc(meta) + '</p>' : '') +
      '<h3 class="fx-lugar__nome"><a href="' + esc(href) + '">' + esc(r.name) + '</a></h3>' +
      (c.hook ? '<p class="fx-lugar__hook">' + esc(c.hook) + '</p>' : '') +
      ((rua || linhaHora)
        ? '<p class="fx-lugar__info">' + (rua ? '<span>' + IC_PIN + esc(rua) + '</span>' : '') + linhaHora + '</p>'
        : '') +
    '</div>' +
  '</article>';
}

/**
 * A foto da capa ocupa a tela inteira (~1800px no desktop). Uma foto pequena
 * esticada nisso vira borrão — foi o caso da /guias, cuja capa era a do guia
 * "Os 10 melhores", um JPEG de 678×452. Aqui a PREFERIDA (a capa do guia, o
 * primeiro lugar da lista) só fica se for grande o bastante; senão vence a
 * maior entre as alternativas.
 *
 * "Grande" é medido pelo tamanho do arquivo original (HEAD no Storage): sem
 * baixar a imagem não dá para ler a resolução, e para foto JPEG o tamanho
 * acompanha a resolução bem o suficiente — 678×452 dá ~33 KB, 1333×2000 dá
 * ~175 KB. Prazo de 900ms: rede lenta não segura a página; na dúvida, fica a
 * preferida. A página fica 10 min em cache na borda, então isso roda raramente.
 */
const MIN_BYTES_CAPA = 120 * 1024;

export async function capaNitida(preferida, alternativas = []) {
  const cand = [...new Set([preferida, ...alternativas].filter((u) => typeof u === 'string' && u))].slice(0, 7);
  if (cand.length <= 1) return cand[0] || null;
  const peso = (u) => fetch(u, { method: 'HEAD' })
    // PNG pesa ~5x um JPEG da mesma resolução (e vira uma capa pesada): conta
    // pelo que ele vale em resolução, não em bytes.
    .then((r) => (r.ok
      ? (Number(r.headers.get('content-length')) || 0) / (/png/i.test(r.headers.get('content-type') || '') ? 5 : 1)
      : 0))
    .catch(() => 0);
  const prazo = new Promise((res) => setTimeout(() => res(null), 900));
  const pesos = await Promise.race([Promise.all(cand.map(peso)), prazo]);
  if (!pesos) return cand[0];
  if (preferida && pesos[0] >= MIN_BYTES_CAPA) return cand[0];
  let melhor = 0;
  pesos.forEach((p, i) => { if (p > pesos[melhor]) melhor = i; });
  return cand[melhor];
}

/** Um bloco de links: pílulas da home (.xb), cartões de guia (.xg) ou, no
 *  índice de guias, cartões com capa ('capas'). `id` vira âncora (/guias#bairros). */
function bloco(b) {
  if (!b || !(b.links || []).length) return '';
  const corpo = b.tipo === 'capas'
    ? '<div class="fx-capas">' + b.links.map((l, i) =>
        '<a class="fx-guia" href="' + esc(l.href) + '" data-reveal data-delay="' + (i % 3) + '">' +
          '<span class="fx-guia__foto">' + (l.img
            ? '<img src="' + esc(foto(l.img, 800)) + '" alt="" loading="' + (i < 3 ? 'eager' : 'lazy') + '" decoding="async" />'
            : '') + '</span>' +
          '<span class="fx-guia__txt"><b>' + esc(l.txt) + '</b>' + (l.desc ? '<small>' + esc(l.desc) + '</small>' : '') + '</span>' +
        '</a>').join('') + '</div>'
    : b.tipo === 'cartoes'
    ? '<ul class="xplore__guides fx-guias">' + b.links.map((l) =>
        '<li><a class="xg" href="' + esc(l.href) + '"><span class="xg__name">' + esc(l.txt) + '</span>' +
        (l.desc ? '<span class="xg__desc">' + esc(l.desc) + '</span>' : '') + '</a></li>').join('') + '</ul>'
    : '<ul class="xplore__bairros">' + b.links.map((l) =>
        '<li><a class="xb fx-xb" href="' + esc(l.href) + '">' + esc(l.txt) + IC_SETA + '</a></li>').join('') + '</ul>';
  return '<section class="fx-sec"' + (b.id ? ' id="' + esc(b.id) + '"' : '') + '>' +
    (b.olho ? '<span class="xplore__eye">' + esc(b.olho) + '</span>' : '') +
    '<h2 class="fx-h2" data-split>' + esc(b.titulo) + '</h2>' +
    // Os cartões com capa já entram um a um; envolver a grade inteira num
    // [data-reveal] a deixava em branco até 12% dela aparecer — com 50 guias,
    // isso é rolar meia página olhando para o vazio.
    '<div class="fx-sec__corpo"' + (b.tipo === 'capas' ? '' : ' data-reveal') + '>' + corpo + '</div></section>';
}

/**
 * O <body> da listagem. `d`:
 *   kicker, h1, sub        — topo
 *   trilha                 — [{ nome, href }] (o último é a página)
 *   capa                   — { url, credito? } | null
 *   fatos                  — ['59 lugares', 'Nota média 8,3', ...] (pílulas de vidro)
 *   resumo                 — o parágrafo de fatos/critério (bloco rosa)
 *   intro                  — texto editorial (guias), opcional
 *   lugares                — [{ r, destaque? }], já na ordem
 *   notas                  — Map de notasComunidade()
 *   numerar                — mostra 1, 2, 3… (guias e "na ordem da curadoria")
 *   olhoLugares, tituloLugares, avisoLugares
 *   blocos                 — [{ titulo, olho?, tipo?: 'pilulas' | 'cartoes', links }]
 */
export function layoutListagem(d) {
  const trilha = '<nav class="trilha fx-trilha hero-in" aria-label="Você está em">' +
    (d.trilha || []).map((t, i, a) => i === a.length - 1
      ? '<span>' + esc(t.nome) + '</span>'
      : '<a href="' + esc(t.href) + '">' + esc(t.nome) + '</a>').join(' <span aria-hidden="true">›</span> ') +
    '</nav>';
  const n = (d.lugares || []).length;

  const capa = '<section class="hero fx-hero fx-hero--lista' + (d.capa && d.capa.url ? '' : ' fx-hero--sem-foto') + '">' +
    (d.capa && d.capa.url
      ? '<div class="hero__media"><img src="' + esc(foto(d.capa.url, 1280)) + '" srcset="' + esc(srcsetCapa(d.capa.url)) +
        '" sizes="100vw" alt="" fetchpriority="high" decoding="async" /></div>'
      : '') +
    '<div class="hero__scrim fx-hero__scrim"></div>' +
    '<div class="hero__content wrap">' +
      trilha +
      (d.kicker ? '<p class="hero__eyebrow hero-in">' + esc(d.kicker) + '</p>' : '') +
      '<h1 class="hero__title fx-titulo hero-in">' + esc(d.h1) + '</h1>' +
      (d.sub ? '<p class="hero__sub fx-sub fx-sub--lista hero-in hero-in--1">' + esc(d.sub) + '</p>' : '') +
      ((d.fatos || []).length
        ? '<div class="fx-meta hero-in hero-in--2">' + d.fatos.map((f) => '<span class="fx-vidro">' + esc(f) + '</span>').join('') + '</div>'
        : '') +
      '<div class="fx-acoes hero-in hero-in--2">' +
        (d.acao
          ? '<a class="btn btn--accent fx-btn-alto" href="' + esc(d.acao.href) + '"><span class="btn__t">' + esc(d.acao.txt) + '</span></a>'
          : n ? '<a class="btn btn--accent fx-btn-alto" href="#lugares"><span class="btn__t">Ver os ' + n + ' lugares</span></a>' : '') +
        '<a class="btn btn--white btn--app" href="/baixar"><span class="btn__t">Baixar o app</span></a>' +
      '</div>' +
    '</div>' +
    (d.capa && d.capa.credito ? '<span class="fx-hero__credito">' + esc(d.capa.credito) + '</span>' : '') +
    '<div class="hero__scroll" aria-hidden="true"><span class="hero__scroll-label">Role para ver os lugares</span>' +
      '<svg class="hero__scroll-ico" viewBox="0 0 24 24"><path d="m6 9 6 6 6-6"/></svg></div>' +
  '</section>';

  const resumo = (d.intro || d.resumo)
    ? '<section class="fx-sec fx-sec--primeira">' +
        (d.intro ? '<p class="fx-intro" data-reveal>' + esc(d.intro) + '</p>' : '') +
        (d.resumo ? '<div class="fx-resumo" data-reveal data-delay="1"><h2>Em resumo</h2><p>' + esc(d.resumo) + '</p></div>' : '') +
      '</section>'
    : '';

  const lugares = n
    ? '<section class="fx-sec" id="lugares">' +
        '<span class="xplore__eye">' + esc(d.olhoLugares || n + ' lugares') + '</span>' +
        '<h2 class="fx-h2" data-split>' + esc(d.tituloLugares || 'Os lugares') + '</h2>' +
        (d.avisoLugares ? '<p class="fx-aviso" data-reveal>' + esc(d.avisoLugares) + '</p>' : '') +
        '<div class="fx-lugares">' + d.lugares.map((it, i) => cartaoLugar(it, i, d.notas, d.numerar)).join('') + '</div>' +
      '</section>'
    : '';

  return navHome() +
    '<main id="top">' +
      capa +
      '<div class="sheet fx-folha fx-folha--lista">' +
        '<img src="/assets/img/seal.svg" alt="" class="sheet__seal" aria-hidden="true" width="80" height="80" decoding="async" />' +
        '<div class="wrap fx-lista">' +
          resumo + lugares + (d.blocos || []).map(bloco).join('') +
        '</div>' +
      '</div>' +
      fechoHome() +
    '</main>' +
    barraEModalDownload();
}

/**
 * O documento inteiro de uma listagem gerada por função (lugares.js, guias.js):
 * head com meta/canonical/JSON-LD, o css/sello.css da home + CSS da ficha e da
 * listagem, e os scripts da home (Lenis, sello.js), da ficha e de medição.
 * As fichas e os guias /g/ passam pelo page() de share.js, que faz o mesmo.
 */
export function documentoListagem({ title, description, canonical, imagem, jsonlds = [], capaUrl, corpo }) {
  const og = imagem || 'https://selloapp.com.br/assets/img/hero.jpg';
  return '<!doctype html>\n<html lang="pt-BR">\n<head>\n' +
    '<meta charset="utf-8" />\n' +
    '<meta name="viewport" content="width=device-width, initial-scale=1" />\n' +
    '<title>' + esc(title) + '</title>\n' +
    '<meta name="description" content="' + esc(description) + '" />\n' +
    '<link rel="canonical" href="' + esc(canonical) + '" />\n' +
    '<meta property="og:type" content="website" />\n' +
    '<meta property="og:site_name" content="Sello" />\n' +
    '<meta property="og:locale" content="pt_BR" />\n' +
    '<meta property="og:url" content="' + esc(canonical) + '" />\n' +
    '<meta property="og:title" content="' + esc(title) + '" />\n' +
    '<meta property="og:description" content="' + esc(description) + '" />\n' +
    '<meta property="og:image" content="' + esc(og) + '" />\n' +
    jsonlds.filter(Boolean).map(jsonLd).join('\n') + '\n' +
    '<link rel="icon" href="/favicon.svg" />\n' +
    '<link rel="preconnect" href="https://fonts.googleapis.com" />\n' +
    '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />\n' +
    '<link href="https://fonts.googleapis.com/css2?family=Anton+SC&family=Open+Sans:ital,wght@0,400;0,600;0,700;0,800;1,400&display=swap" rel="stylesheet" />\n' +
    '<link rel="stylesheet" href="' + ASSETS_HOME.css + '" />\n' +
    '<style>' + CSS_FICHA + CSS_LISTA + '</style>\n' +
    (capaUrl ? '<link rel="preload" as="image" imagesrcset="' + esc(srcsetCapa(capaUrl)) + '" imagesizes="100vw" fetchpriority="high" />\n' : '') +
    '</head>\n<body>\n' +
    corpo + '\n' +
    '<script src="' + ASSETS_HOME.lenis + '" defer></script>\n' +
    '<script src="' + ASSETS_HOME.js + '" defer></script>\n' +
    '<script>' + JS_FICHA + '</script>\n' +
    '<script defer src="/_vercel/insights/script.js"></script>\n' +
    '<script>' + JS_MEDICAO + '</script>\n' +
    '</body>\n</html>';
}

/* Só o que a listagem tem a mais que a ficha (CSS_FICHA vem junto). */
export const CSS_LISTA = `
  .fx-sub--lista { font-style:normal; max-width:620px; }
  .fx-folha--lista { padding-bottom:64px; }
  .fx-lista { padding-top:8px; }
  .fx-sec--primeira { border-top:0 !important; padding-top:clamp(56px,7vw,84px); }
  .fx-intro { font-size:clamp(1.1rem,1.6vw,1.35rem); line-height:1.6; color:var(--ink) !important; max-width:820px; margin:0 0 26px !important; }
  .fx-lista .fx-resumo { max-width:880px; }
  .fx-aviso { color:var(--muted); font-size:.92rem; margin:-8px 0 22px !important; }

  /* grade de lugares */
  .fx-lugares { display:grid; grid-template-columns:repeat(auto-fill,minmax(290px,1fr)); gap:22px 20px; }
  .fx-lugar { display:flex; flex-direction:column; border-radius:24px; background:#fff; box-shadow:0 0 0 1px var(--line);
    overflow:hidden; transition:transform .5s var(--ease), box-shadow .5s var(--ease); }
  .fx-lugar[data-reveal].is-in:hover, .fx-lugar:hover { transform:translateY(-6px); box-shadow:0 28px 54px -28px rgba(13,17,27,.45), 0 0 0 1px var(--line); transition-delay:0s; }
  .fx-lugar__foto { position:relative; display:block; aspect-ratio:4/3; overflow:hidden; background:var(--light); }
  .fx-lugar__foto img { width:100%; height:100%; object-fit:cover; transition:transform 1s var(--ease); }
  .fx-lugar:hover .fx-lugar__foto img { transform:scale(1.07); }
  .fx-lugar__n { position:absolute; left:12px; top:12px; min-width:34px; height:34px; padding:2px 8px 0; border-radius:999px; background:var(--red);
    color:#fff; display:grid; place-items:center; font-family:var(--font-disp); font-size:1.05rem; box-shadow:0 8px 18px -8px rgba(227,15,47,.8); }
  /* Igual ao selo do app (components/community/ActivityCard: 40×40, raio 9,
   * Anton 16 branco no vermelho da marca), um pouco maior na tela grande. */
  .fx-lugar__nota { position:absolute; right:12px; top:12px; width:44px; height:44px; border-radius:10px; background:var(--red);
    color:#fff; display:grid; place-items:center; font-family:var(--font-disp); font-weight:400; font-size:1.15rem; line-height:1;
    padding-top:2px; box-shadow:0 10px 22px -10px rgba(227,15,47,.85), 0 2px 6px rgba(13,17,27,.18); }
  .fx-lugar__txt { padding:16px 18px 18px; display:flex; flex-direction:column; gap:6px; flex:1; }
  .fx-lugar__meta { margin:0 !important; font-size:.72rem !important; font-weight:700; letter-spacing:.08em; text-transform:uppercase; color:var(--red) !important; }
  .fx-lugar__nome { margin:0; font-family:var(--font-disp); font-weight:400; text-transform:uppercase; font-size:1.45rem; line-height:1.2; padding-top:.04em; }
  .fx-lugar__nome a { color:var(--ink); background:linear-gradient(var(--red),var(--red)) 0 100%/0 2px no-repeat;
    transition:background-size .45s var(--ease), color .3s var(--ease); }
  .fx-lugar:hover .fx-lugar__nome a { background-size:100% 2px; }
  .fx-lugar__hook { margin:0 !important; font-size:.92rem !important; line-height:1.55 !important; color:var(--muted) !important;
    display:-webkit-box; -webkit-line-clamp:3; -webkit-box-orient:vertical; overflow:hidden; }
  .fx-lugar__info { margin:auto 0 0 !important; padding-top:10px; display:flex; flex-wrap:wrap; gap:6px 16px; font-size:.82rem !important; color:var(--muted) !important; }
  .fx-lugar__info span { display:inline-flex; align-items:center; gap:6px; }
  .fx-lugar__info b { color:var(--ink); }
  .fx-lugar__info .fx-ic { width:16px; height:16px; color:var(--red); }

  /* índice de guias: cartões com capa */
  .fx-capas { display:grid; grid-template-columns:repeat(auto-fill,minmax(260px,1fr)); gap:18px; }
  .fx-guia { display:flex; flex-direction:column; border-radius:24px; overflow:hidden; background:#fff; box-shadow:0 0 0 1px var(--line);
    transition:transform .5s var(--ease), box-shadow .5s var(--ease); }
  .fx-guia:hover { transform:translateY(-6px); box-shadow:0 28px 54px -28px rgba(13,17,27,.45), 0 0 0 1px var(--line); transition-delay:0s; }
  .fx-guia__foto { display:block; aspect-ratio:16/10; overflow:hidden; background:var(--light); }
  .fx-guia__foto img { width:100%; height:100%; object-fit:cover; transition:transform 1s var(--ease); }
  .fx-guia:hover .fx-guia__foto img { transform:scale(1.07); }
  .fx-guia__txt { display:flex; flex-direction:column; gap:4px; padding:14px 18px 18px; }
  .fx-guia__txt b { font-family:var(--font-disp); font-weight:400; text-transform:uppercase; font-size:1.35rem; line-height:1.2; padding-top:.04em; color:var(--ink); }
  .fx-guia:hover .fx-guia__txt b { color:var(--red); }
  .fx-guia__txt small { font-size:.88rem; line-height:1.45; color:var(--muted); }

  /* pílulas da home com seta */
  .fx-xb .fx-ic { width:15px; height:15px; margin-left:6px; opacity:0; transform:translateX(-6px);
    transition:opacity .3s var(--ease), transform .3s var(--ease); }
  .fx-xb:hover .fx-ic { opacity:1; transform:none; }

  @media (max-width:640px) {
    .fx-lugares { grid-template-columns:1fr; gap:16px; }
    .fx-lugar__nome { font-size:1.3rem; }
    .fx-lugar__nota { width:40px; height:40px; border-radius:9px; font-size:1rem; }
  }
`;

/* Medição (Vercel Web Analytics) igual à das fichas: o clique de download sai
 * do site para a loja, então precisa ser marcado à mão. Fica num arquivo .js
 * comum (não numa template string): sem o risco de a barra invertida da regex
 * sumir, que quebrou o script das fichas até 03/10/2026. */
export const JS_MEDICAO = String.raw`
(function () {
  window.va = window.va || function () { (window.vaq = window.vaq || []).push(arguments); };
  function marcar(nome, dados) { try { window.va('event', { name: nome, data: dados || {} }); } catch (e) {} }
  document.addEventListener('click', function (ev) {
    var a = ev.target && ev.target.closest ? ev.target.closest('a[href]') : null;
    if (!a) return;
    var href = a.getAttribute('href') || '', pagina = location.pathname;
    if (href.indexOf('apps.apple.com') > -1) { marcar('baixar_loja', { loja: 'ios', pagina: pagina }); return; }
    if (href.indexOf('play.google.com') > -1) { marcar('baixar_loja', { loja: 'android', pagina: pagina }); return; }
    if (href === '#baixar' || /\/(download|baixar|app)$/.test(href)) marcar('baixar_intencao', { pagina: pagina });
  }, true);
})();
`;
