/**
 * Layout da ficha de restaurante (/r/:slug) — out/2026.
 *
 * A estrutura segue o que as pessoas já sabem ler numa página de restaurante
 * (a do Tripadvisor é a referência): galeria no topo, abas fixas, coluna ao
 * lado com o que se consulta de pé na calçada — está aberto? onde fica? — e as
 * seções em ordem de decisão. A cara é a do Sello: Anton SC nos títulos, Open
 * Sans no texto, vermelho só para o que importa, superfícies claras.
 *
 * O conteúdo é o mesmo de antes (share.js monta os dados); aqui é só a forma.
 * Nada é inventado para preencher layout: seção sem dado não aparece.
 */

import { esc } from './cartao.js';
import { fmtNota } from './notas.js';

const MELHOR_PARA = {
  date: 'Encontro', special: 'Ocasião especial', casual: 'Dia a dia', quick: 'Rápido', brunch: 'Brunch',
};
const PAGAMENTO = {
  pix: 'Pix', credit_card: 'Crédito', debit_card: 'Débito', cash: 'Dinheiro', nfc: 'Aproximação',
};

/** Foto do Storage redimensionada pela largura (sem corte — o corte é do CSS).
 *  URL de fora do nosso Storage passa intacta. */
export function foto(u, largura) {
  const s = String(u ?? '');
  if (!s.includes('/storage/v1/object/public/')) return s;
  return s.replace('/storage/v1/object/public/', '/storage/v1/render/image/public/') +
    (s.includes('?') ? '&' : '?') + 'width=' + largura + '&quality=72';
}

/** "$$" com os cifrões que faltam até quatro em cinza — como no app. */
function precoVisual(n) {
  const v = Number(n);
  if (!(v >= 1 && v <= 4)) return '';
  return '<span class="fx-preco" aria-label="Faixa de preço ' + v + ' de 4">' + '$'.repeat(v) +
    '<span class="fx-preco__off">' + '$'.repeat(4 - v) + '</span></span>';
}

function credito(a) {
  const t = a && a.attribution_text;
  return t ? '<span class="fx-credito">' + esc(t) + '</span>' : '';
}

/** As fotos da página: capa primeiro, depois a galeria, sem repetir. Cada uma
 *  leva o crédito que o catálogo exige mostrar. */
function fotosDe(r, c) {
  const vistas = new Set();
  const out = [];
  const add = (url, attr) => {
    if (!url || vistas.has(url)) return;
    vistas.add(url);
    out.push({ url, attr });
  };
  add(r.hero_image, c.hero_attribution);
  (c.gallery || []).forEach((u, i) => add(u, (c.gallery_attributions || [])[i]));
  return out;
}

function mosaico(fotos, nome) {
  if (!fotos.length) return '';
  const tiles = fotos.slice(0, 5).map((f, i) =>
    '<a class="fx-mosaico__item' + (i === 0 ? ' fx-mosaico__item--grande' : '') + '" href="#fotos">' +
      '<img src="' + esc(foto(f.url, i === 0 ? 1200 : 600)) + '" alt="' + esc(nome + ' — foto ' + (i + 1)) + '"' +
      (i === 0 ? ' fetchpriority="high"' : ' loading="lazy"') + ' decoding="async" />' +
      credito(f.attr) +
      (i === 4 && fotos.length > 5 ? '<span class="fx-mosaico__mais">+' + (fotos.length - 5) + ' fotos</span>' : '') +
    '</a>').join('');
  return '<div class="fx-mosaico fx-mosaico--' + Math.min(fotos.length, 5) + '">' + tiles + '</div>';
}

function galeria(fotos, nome) {
  if (fotos.length < 2) return '';
  return '<section class="fx-sec" id="fotos"><h2 class="fx-h2">Fotos</h2><div class="fx-galeria">' +
    fotos.map((f, i) =>
      '<figure><img src="' + esc(foto(f.url, 400)) + '" alt="' + esc(nome + ' — foto ' + (i + 1)) +
      '" loading="lazy" decoding="async" />' + credito(f.attr) + '</figure>').join('') +
    '</div></section>';
}

function pratos(c) {
  const lista = ((c.dishes && c.dishes.must_order) || []).filter((d) => d && d.name);
  if (!lista.length) return '';
  return '<section class="fx-sec" id="pedir"><h2 class="fx-h2">O que pedir</h2><div class="fx-pratos">' +
    lista.map((d, i) =>
      '<article class="fx-prato' + (d.image ? '' : ' fx-prato--sem-foto') + '">' +
        (d.image ? '<img src="' + esc(foto(d.image, 480)) + '" alt="' + esc(d.name) + '" loading="lazy" decoding="async" />' : '') +
        '<div class="fx-prato__txt"><span class="fx-prato__n">' + (i + 1) + '</span>' +
        '<h3>' + esc(d.name) + '</h3>' + (d.note ? '<p>' + esc(d.note) + '</p>' : '') + '</div>' +
      '</article>').join('') +
    '</div></section>';
}

function avaliacoes(c, nc, deepLink) {
  const caixa = nc
    ? '<div class="fx-nota-grande"><strong>' + esc(fmtNota(nc.media)) + '</strong><span>de 10</span></div>' +
      '<div><p class="fx-nota-legenda">Nota da comunidade do Sello</p><p class="fx-muted">Média de ' + nc.votos +
      (nc.votos === 1 ? ' avaliação' : ' avaliações') + ' de quem foi e avaliou no app.</p></div>'
    : '<div><p class="fx-nota-legenda">Ainda sem avaliações da comunidade</p>' +
      '<p class="fx-muted">Foi lá? Seja a primeira avaliação, no app.</p></div>';
  return '<section class="fx-sec" id="avaliacoes"><h2 class="fx-h2">Avaliações</h2>' +
    '<div class="fx-aval">' + caixa + '</div>' +
    (c.community_summary
      ? '<h3 class="fx-h3">O que dizem de lá</h3><blockquote class="fx-citacao">' + esc(c.community_summary) + '</blockquote>'
      : '') +
    '<a class="fx-btn fx-btn--contorno" href="' + esc(deepLink) + '">Avaliar no app</a>' +
    '</section>';
}

function horario(c) {
  const linhas = (c.hours || []).filter((h) => h && h.label);
  if (!linhas.length) return '';
  return '<section class="fx-sec" id="horario"><h2 class="fx-h2">Horário</h2><table class="fx-horas">' +
    linhas.map((h) => '<tr data-dia="' + esc(h.label) + '"><th>' + esc(h.label) + '</th><td>' + esc(h.value) + '</td></tr>').join('') +
    '</table><p class="fx-muted fx-nota-rodape">Horário publicado pela casa. Feriados podem mudar.</p></section>';
}

function mapa(r, c, bairro) {
  if (!r.address && !(r.lat && r.lng)) return '';
  const lat = Number(r.lat), lng = Number(r.lng);
  const temCoord = Number.isFinite(lat) && Number.isFinite(lng) && lat && lng;
  const d = 0.004;
  const embed = temCoord
    ? '<iframe class="fx-mapa" title="Mapa de ' + esc(r.name) + '" loading="lazy" src="' +
      esc('https://www.openstreetmap.org/export/embed.html?bbox=' + (lng - d) + ',' + (lat - d) + ',' + (lng + d) + ',' + (lat + d) +
        '&layer=mapnik&marker=' + lat + ',' + lng) + '"></iframe>'
    : '';
  const rotas = c.google_maps_uri || (temCoord ? 'https://www.google.com/maps/search/?api=1&query=' + lat + ',' + lng : '');
  const chegar = (c.getting_there || []).map((g) => g && (g.label || g.text)).filter(Boolean);
  return '<section class="fx-sec" id="local"><h2 class="fx-h2">Localização</h2>' + embed +
    (r.address ? '<p class="fx-endereco">' + esc(r.address) + '</p>' : '') +
    (chegar.length ? '<ul class="fx-lista">' + chegar.map((t) => '<li>' + esc(t) + '</li>').join('') + '</ul>' : '') +
    (rotas ? '<a class="fx-btn fx-btn--contorno" rel="nofollow noopener" target="_blank" href="' + esc(rotas) + '">Como chegar</a>' : '') +
    '</section>';
}

function lateral(r, c, d) {
  const pg = (r.payment_methods || c.payment_methods || []).map((p) => PAGAMENTO[p]).filter(Boolean);
  const periodos = (r.hours_periods || c.hours_periods || []).filter((p) => p && p.open && p.close);
  const linhas = [
    periodos.length
      ? '<div class="fx-agora" data-periodos="' + esc(JSON.stringify(periodos.map((p) => [p.open.day, p.open.time, p.close.day, p.close.time]))) + '">' +
        '<span class="fx-agora__ponto"></span><span class="fx-agora__txt">Ver horário</span></div>'
      : '',
    r.address ? '<div class="fx-info"><span class="fx-info__r">Endereço</span><a href="#local">' + esc(String(r.address).split(' - ')[0]) +
      (d.bairro ? ' · ' + esc(d.bairro) : '') + '</a></div>' : '',
    r.phone ? '<div class="fx-info"><span class="fx-info__r">Telefone</span><a href="tel:' + esc(String(r.phone).replace(/[^\d+]/g, '')) + '">' + esc(r.phone) + '</a></div>' : '',
    r.instagram ? '<div class="fx-info"><span class="fx-info__r">Instagram</span><a rel="nofollow noopener" target="_blank" href="https://instagram.com/' + esc(r.instagram) + '">@' + esc(r.instagram) + '</a></div>' : '',
    r.website ? '<div class="fx-info"><span class="fx-info__r">Site</span><a rel="nofollow noopener" target="_blank" href="' + esc(r.website) + '">' + esc(String(r.website).replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')) + '</a></div>' : '',
    r.menu_url ? '<div class="fx-info"><span class="fx-info__r">Cardápio</span><a rel="nofollow noopener" target="_blank" href="' + esc(r.menu_url) + '">Ver cardápio</a></div>' : '',
    pg.length ? '<div class="fx-info"><span class="fx-info__r">Pagamento</span><span>' + esc(pg.join(' · ')) + '</span></div>' : '',
  ].filter(Boolean).join('');
  return '<aside class="fx-lado"><div class="fx-cartao">' + linhas +
    '<a class="fx-btn fx-btn--primario" href="' + esc(d.deepLink) + '">Abrir no Sello</a>' +
    '<div class="fx-lojas"><a class="fx-btn fx-btn--contorno" href="' + esc(d.appStore) + '">App Store</a>' +
    '<a class="fx-btn fx-btn--contorno" href="' + esc(d.playStore) + '">Google Play</a></div>' +
    '</div></aside>';
}

/**
 * A linha embaixo do nome: "Nº 3 de 26 avaliados em Pinheiros · Japonesa, $$$".
 *
 * A posição é pela nota média da COMUNIDADE (a mesma do selo), só entre os
 * lugares com ao menos 3 avaliações — com uma ou duas, um 10,0 diz mais sobre
 * quem avaliou do que sobre o lugar, e o ranking viraria sorteio. Por isso o
 * texto diz "avaliados" e não "restaurantes": o total é de quem entrou na
 * conta, não do bairro inteiro. Lugar fora da conta não ganha posição; a linha
 * fica só com cozinha e preço.
 */
function linhaPosicao(d, preco) {
  const p = d.posicao;
  const pos = p
    ? '<a class="fx-linha__pos" href="' + esc(p.href || '#avaliacoes') + '" title="Posição pela nota média da comunidade, entre os lugares com 3 ou mais avaliações">' +
      'Nº ' + p.n + ' de ' + p.total + ' avaliados ' + esc(p.onde) + '</a>'
    : '';
  const tipo = [d.cozinha ? esc(d.cozinha) : '', preco].filter(Boolean).join(', ');
  return pos || tipo ? '<p class="fx-linha">' + pos + (pos && tipo ? '<span class="fx-linha__sep"></span>' : '') + (tipo ? '<span>' + tipo + '</span>' : '') + '</p>' : '';
}

function listaLinks(titulo, itens) {
  const li = itens.filter(Boolean).join('');
  return li ? '<section class="fx-sec"><h2 class="fx-h2">' + esc(titulo) + '</h2><ul class="fx-pilulas">' + li + '</ul></section>' : '';
}

/**
 * O <main> inteiro da ficha. `d` vem pronto de share.js: nome, cozinha,
 * bairro, nota (nc), links de guias/vizinhos/explorar e o "Em resumo".
 */
export function layoutRestaurante(r, c, d) {
  const fotos = fotosDe(r, c);
  const chips = (c.best_for || []).map((b) => MELHOR_PARA[b]).filter(Boolean);
  const nGuias = (d.guias || []).length;

  const topo =
    '<header class="fx-topo">' +
      d.trilhaHtml +
      '<div class="fx-kicker">' + esc([d.bairro, d.cidade && d.cidade.nome].filter(Boolean).join(' · ') || 'Restaurante') + '</div>' +
      '<h1 class="fx-h1">' + esc(r.name) + '</h1>' +
      linhaPosicao(d, precoVisual(c.price_range != null ? c.price_range : r.price_level)) +
      (c.hook ? '<p class="fx-gancho">' + esc(c.hook) + '</p>' : '') +
      '<div class="fx-meta">' +
        (d.nc
          ? '<a class="fx-selo" href="#avaliacoes" aria-label="Nota da comunidade: ' + esc(fmtNota(d.nc.media)) + ' de 10">' +
            '<strong>' + esc(fmtNota(d.nc.media)) + '</strong><span>' + d.nc.votos + (d.nc.votos === 1 ? ' avaliação' : ' avaliações') + '</span></a>'
          : '') +
        (nGuias ? '<a class="fx-meta__guias" href="#guias">Em ' + nGuias + (nGuias === 1 ? ' guia' : ' guias') + ' do Sello</a>' : '') +
      '</div>' +
      (chips.length ? '<ul class="fx-chips">' + chips.map((t) => '<li>' + esc(t) + '</li>').join('') + '</ul>' : '') +
    '</header>';

  const abas = [
    ['resumo', 'Visão geral'],
    (c.dishes && (c.dishes.must_order || []).length) ? ['pedir', 'O que pedir'] : null,
    ['avaliacoes', 'Avaliações'],
    fotos.length > 1 ? ['fotos', 'Fotos'] : null,
    (c.hours || []).length ? ['horario', 'Horário'] : null,
    (r.address || r.lat) ? ['local', 'Localização'] : null,
  ].filter(Boolean);
  const nav = '<nav class="fx-abas" aria-label="Seções"><div class="fx-abas__in">' +
    abas.map(([id, t]) => '<a href="#' + id + '">' + esc(t) + '</a>').join('') + '</div></nav>';

  const visao = '<section class="fx-sec" id="resumo">' +
    (d.resumoHtml || '') +
    (c.sello_take_body
      ? '<div class="fx-take"><span class="fx-take__eye">O take do Sello</span>' +
        (c.sello_take_title ? '<h3 class="fx-h3">' + esc(c.sello_take_title) + '</h3>' : '') +
        '<p>' + esc(c.sello_take_body) + '</p></div>'
      : '') +
    ((c.why_go || []).length
      ? '<h3 class="fx-h3">Por que ir</h3><ul class="fx-lista fx-lista--check">' +
        c.why_go.filter(Boolean).map((t) => '<li>' + esc(t) + '</li>').join('') + '</ul>'
      : '') +
    (c.what_to_expect ? '<h3 class="fx-h3">O que esperar</h3><p class="fx-p">' + esc(c.what_to_expect) + '</p>' : '') +
    ((c.curiosities || []).length
      ? '<h3 class="fx-h3">Bom saber</h3><ul class="fx-lista">' +
        c.curiosities.map((x) => x && (x.text || x)).filter((t) => typeof t === 'string' && t).map((t) => '<li>' + esc(t) + '</li>').join('') + '</ul>'
      : '') +
    '</section>';

  const guias = (d.guias || []).length
    ? '<section class="fx-sec" id="guias"><h2 class="fx-h2">Aparece nos guias</h2><ul class="fx-pilulas">' +
      d.guias.map((g) => '<li><a href="/g/' + esc(g.slug) + '">' + esc(g.title) + '</a></li>').join('') + '</ul></section>'
    : '';

  const principal = '<div class="fx-col">' +
    visao + pratos(c) + avaliacoes(c, d.nc, d.deepLink) + galeria(fotos, r.name) + horario(c) + mapa(r, c, d.bairro) +
    guias +
    (d.vizinhosHtml ? '<section class="fx-sec"><h2 class="fx-h2">Também em ' + esc(d.bairro) + '</h2>' + d.vizinhosHtml + '</section>' : '') +
    listaLinks('Explore', d.explorar || []) +
    '</div>';

  return '<main class="fx">' +
    '<div class="fx-wrap">' + topo + mosaico(fotos, r.name) + '</div>' +
    nav +
    '<div class="fx-wrap fx-grade">' + principal + lateral(r, c, d) + '</div>' +
    '</main>';
}

/* "Aberto agora" e o dia de hoje na tabela: calculados no NAVEGADOR, no fuso
 * de São Paulo. A página fica em cache na borda por minutos; se o servidor
 * escrevesse "aberto", a frase envelheceria dentro do cache. */
export const JS_FICHA = `
(function () {
  var el = document.querySelector('.fx-agora');
  var DIAS = ['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'];
  try {
    var p = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Sao_Paulo', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date());
    var get = function (t) { return (p.find(function (x) { return x.type === t; }) || {}).value; };
    var dia = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].indexOf(get('weekday'));
    var agora = dia * 1440 + Number(get('hour')) * 60 + Number(get('minute'));
    var hoje = document.querySelector('.fx-horas tr[data-dia="' + DIAS[dia] + '"]');
    if (hoje) hoje.classList.add('hoje');
    if (!el) return;
    var per = JSON.parse(el.getAttribute('data-periodos') || '[]');
    var min = function (d, t) { t = String(t).padStart(4, '0'); return d * 1440 + Number(t.slice(0, 2)) * 60 + Number(t.slice(2)); };
    var hh = function (t) { t = String(t).padStart(4, '0'); return t.slice(0, 2) + ':' + t.slice(2); };
    var semana = 7 * 1440, aberto = null, proximo = null;
    per.forEach(function (x) {
      var a = min(x[0], x[1]), f = min(x[2], x[3]);
      if (f <= a) f += semana;
      [agora, agora + semana].forEach(function (n) { if (n >= a && n < f) aberto = x; });
      var falta = (a - agora + semana) % semana;
      if (!proximo || falta < proximo.falta) proximo = { falta: falta, x: x };
    });
    var txt = el.querySelector('.fx-agora__txt');
    if (aberto) { el.classList.add('aberto'); txt.textContent = 'Aberto agora · fecha às ' + hh(aberto[3]); }
    else if (proximo) {
      el.classList.add('fechado');
      txt.textContent = 'Fechado agora · abre ' + (proximo.x[0] === dia ? 'hoje' : DIAS[proximo.x[0]].toLowerCase()) + ' às ' + hh(proximo.x[1]);
    }
  } catch (e) {}
  // Aba ativa conforme a rolagem.
  var links = [].slice.call(document.querySelectorAll('.fx-abas a'));
  if (links[0]) links[0].classList.add('ativo');
  if (!('IntersectionObserver' in window) || !links.length) return;
  var io = new IntersectionObserver(function (es) {
    es.forEach(function (e) {
      if (!e.isIntersecting) return;
      links.forEach(function (a) { a.classList.toggle('ativo', a.getAttribute('href') === '#' + e.target.id); });
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  links.forEach(function (a) { var s = document.querySelector(a.getAttribute('href')); if (s) io.observe(s); });
})();
`;

export const CSS_FICHA = `
  body.rest { display:block; padding:0; background:#fff; }
  .fx-barra { border-bottom:1px solid #EEEEF1; background:#fff; }
  .fx-barra__in { max-width:1180px; margin:0 auto; padding:14px 24px; display:flex; align-items:center; gap:22px; }
  .fx-logo { font-family:'Anton SC',sans-serif; font-size:24px; color:var(--red); text-decoration:none; letter-spacing:.02em; line-height:1; padding-top:3px; }
  .fx-barra nav { display:flex; gap:18px; font-size:14px; font-weight:600; }
  .fx-barra nav a { color:var(--ink); text-decoration:none; }
  .fx-barra nav a:hover { color:var(--red); }
  .fx-barra .fx-btn { margin-left:auto; padding:9px 16px; font-size:14px; }
  .fx-wrap { max-width:1180px; margin:0 auto; padding:0 24px; }
  .fx-topo { padding:18px 0 18px; }
  .fx-topo .trilha { margin:0 0 14px; }
  .fx-kicker { font-size:13px; color:var(--red); font-weight:700; text-transform:uppercase; letter-spacing:.06em; margin-bottom:6px; }
  .fx-h1 { font-family:'Anton SC',sans-serif; font-weight:400; text-transform:uppercase; font-size:clamp(32px,4.6vw,52px);
           line-height:1.12; padding-top:.06em; margin:0 0 8px; }
  .fx-linha { display:flex; flex-wrap:wrap; align-items:center; gap:4px 14px; margin:2px 0 12px; font-size:15px; color:var(--ink); }
  .fx-linha__pos { color:var(--ink); font-weight:600; text-decoration:underline; text-underline-offset:4px; text-decoration-thickness:1px; }
  .fx-linha__pos:hover { color:var(--red); }
  .fx-linha__sep { width:1px; height:16px; background:#D5D7DD; }
  .fx-linha .fx-preco { font-size:15px; }
  .fx-gancho { font-size:17px; color:var(--muted); line-height:1.5; margin:0 0 14px; max-width:760px; }
  .fx-meta { display:flex; flex-wrap:wrap; align-items:center; gap:10px 18px; }
  .fx-selo { display:inline-flex; align-items:center; gap:8px; background:var(--red); color:#fff; border-radius:999px;
             padding:5px 14px 5px 6px; text-decoration:none; }
  .fx-selo strong { background:#fff; color:var(--red); border-radius:999px; padding:3px 10px 1px; font-family:'Anton SC',sans-serif;
                    font-weight:400; font-size:19px; line-height:1.15; }
  .fx-selo span { font-size:13px; font-weight:700; }
  .fx-preco { font-weight:700; font-size:16px; letter-spacing:.04em; }
  .fx-preco__off { color:#C9CCD3; }
  .fx-meta__guias { font-size:14px; font-weight:600; color:var(--ink); text-decoration:underline; text-underline-offset:3px; }
  .fx-chips { list-style:none; display:flex; flex-wrap:wrap; gap:8px; margin:14px 0 0; padding:0; }
  .fx-chips li { background:#FBE9EC; color:var(--red); font-size:13px; font-weight:700; border-radius:999px; padding:6px 12px; }

  .fx-mosaico { display:grid; gap:8px; border-radius:20px; overflow:hidden; height:min(460px,52vw);
                grid-template-columns:2fr 1fr 1fr; grid-template-rows:1fr 1fr; }
  .fx-mosaico__item { position:relative; display:block; background:#EEE; overflow:hidden; }
  .fx-mosaico__item img { width:100%; height:100%; object-fit:cover; transition:transform .5s cubic-bezier(.16,1,.3,1); }
  .fx-mosaico__item:hover img { transform:scale(1.04); }
  .fx-mosaico__item--grande { grid-row:1 / span 2; }
  .fx-mosaico--1 { grid-template-columns:1fr; }
  .fx-mosaico--2 { grid-template-columns:2fr 1fr; }
  .fx-mosaico--2 .fx-mosaico__item:not(.fx-mosaico__item--grande) { grid-row:1 / span 2; }
  .fx-mosaico--3 { grid-template-columns:2fr 1fr; }
  .fx-mosaico--4 { grid-template-columns:2fr 1fr 1fr; }
  .fx-mosaico--4 .fx-mosaico__item:nth-child(4) { grid-column:2 / span 2; }
  .fx-mosaico__mais { position:absolute; inset:0; display:flex; align-items:center; justify-content:center; background:rgba(13,17,27,.55);
                      color:#fff; font-weight:700; font-size:16px; }
  .fx-credito { position:absolute; left:8px; bottom:8px; background:rgba(13,17,27,.6); color:#fff; font-size:10.5px;
                padding:2px 7px; border-radius:6px; pointer-events:none; }

  .fx-abas { position:sticky; top:0; z-index:5; background:rgba(255,255,255,.96); backdrop-filter:blur(8px);
             border-bottom:1px solid #EEEEF1; margin-top:22px; }
  .fx-abas__in { max-width:1180px; margin:0 auto; padding:0 24px; display:flex; gap:26px; overflow-x:auto; scrollbar-width:none; }
  .fx-abas__in::-webkit-scrollbar { display:none; }
  .fx-abas a { flex:none; padding:15px 0 13px; font-size:15px; font-weight:600; color:var(--muted); text-decoration:none;
               border-bottom:3px solid transparent; }
  .fx-abas a:hover, .fx-abas a.ativo { color:var(--red); border-bottom-color:var(--red); }

  .fx-grade { display:grid; grid-template-columns:minmax(0,1fr) 340px; gap:48px; align-items:start; padding-top:8px; }
  .fx-col { min-width:0; }
  .fx-sec { padding:30px 0 6px; scroll-margin-top:64px; }
  .fx-sec + .fx-sec { border-top:1px solid #F1F1F3; }
  .fx-h2 { font-family:'Anton SC',sans-serif; font-weight:400; text-transform:uppercase; font-size:24px; line-height:1.2;
           padding-top:.05em; margin:0 0 16px; }
  .fx-h3 { font-size:16px; font-weight:700; margin:22px 0 8px; }
  .fx-p, .fx-col p { color:var(--muted); font-size:15.5px; line-height:1.65; margin:0; }
  .fx-muted { color:var(--muted); font-size:14px; }
  .fx-col .resumo { background:#F6F6F8; border-radius:16px; padding:18px 20px; margin:0 0 6px; }
  .fx-col .resumo h2 { font-family:'Anton SC',sans-serif; font-weight:400; text-transform:uppercase; font-size:15px;
                       letter-spacing:.03em; color:var(--red); margin:0 0 6px; }
  .fx-col .resumo p { color:var(--ink); font-size:15px; }
  .fx-take { border-left:3px solid var(--red); padding:2px 0 2px 16px; margin-top:22px; }
  .fx-take__eye { font-size:12px; font-weight:700; color:var(--red); text-transform:uppercase; letter-spacing:.06em; }
  .fx-take .fx-h3 { margin-top:4px; }
  .fx-lista { margin:0; padding-left:20px; color:var(--muted); font-size:15.5px; line-height:1.6; }
  .fx-lista li { margin-bottom:6px; }
  .fx-lista--check { list-style:none; padding:0; }
  .fx-lista--check li { position:relative; padding-left:28px; }
  .fx-lista--check li::before { content:""; position:absolute; left:0; top:4px; width:18px; height:18px; border-radius:50%;
    background:var(--red) url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath fill='none' stroke='%23fff' stroke-width='3' stroke-linecap='round' stroke-linejoin='round' d='M6 12.5l4 4 8-9'/%3E%3C/svg%3E") center/12px no-repeat; }

  .fx-pratos { display:grid; grid-template-columns:repeat(auto-fill,minmax(200px,1fr)); gap:14px; }
  .fx-prato { border:1px solid #EEEEF1; border-radius:16px; overflow:hidden; background:#fff; }
  .fx-prato img { width:100%; aspect-ratio:4/3; object-fit:cover; background:#EEE; }
  .fx-prato__txt { padding:12px 14px 14px; }
  .fx-prato__n { display:inline-block; font-family:'Anton SC',sans-serif; color:var(--red); font-size:15px; margin-bottom:2px; }
  .fx-prato h3 { font-size:15.5px; margin:0 0 4px; }
  .fx-prato p { font-size:13.5px !important; line-height:1.5 !important; }
  .fx-prato--sem-foto { background:#F6F6F8; border-color:transparent; }

  .fx-aval { display:flex; align-items:center; gap:18px; background:#FBE9EC; border-radius:18px; padding:18px 20px; }
  .fx-nota-grande { flex:none; width:92px; height:92px; border-radius:20px; background:var(--red); color:#fff; display:flex;
                    flex-direction:column; align-items:center; justify-content:center; }
  .fx-nota-grande strong { font-family:'Anton SC',sans-serif; font-weight:400; font-size:38px; line-height:1; padding-top:4px; }
  .fx-nota-grande span { font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:.08em; margin-top:2px; }
  .fx-nota-legenda { font-weight:700; color:var(--ink) !important; margin:0 0 2px !important; }
  .fx-citacao { margin:0 0 18px; padding:14px 18px; border-radius:14px; background:#F6F6F8; color:var(--muted);
                font-size:15px; line-height:1.6; }

  .fx-galeria { display:grid; grid-template-columns:repeat(auto-fill,minmax(160px,1fr)); gap:8px; }
  .fx-galeria figure { position:relative; margin:0; border-radius:12px; overflow:hidden; aspect-ratio:1; background:#EEE; }
  .fx-galeria img { width:100%; height:100%; object-fit:cover; }

  .fx-horas { width:100%; max-width:520px; border-collapse:collapse; font-size:15px; }
  .fx-horas th { text-align:left; font-weight:600; padding:9px 12px 9px 0; width:40%; }
  .fx-horas td { color:var(--muted); padding:9px 0; }
  .fx-horas tr + tr th, .fx-horas tr + tr td { border-top:1px solid #F1F1F3; }
  .fx-horas tr.hoje th, .fx-horas tr.hoje td { color:var(--red); font-weight:700; }
  .fx-nota-rodape { margin-top:10px !important; font-size:13px !important; }

  .fx-mapa { width:100%; height:280px; border:0; border-radius:16px; background:#EEE; display:block; }
  .fx-endereco { color:var(--ink) !important; font-weight:600; margin:14px 0 8px !important; }

  .fx-pilulas { display:flex; flex-wrap:wrap; gap:8px; margin:0; padding:0; list-style:none; }
  .fx-pilulas a { display:inline-block; background:#F3F3F5; border-radius:999px; padding:9px 15px; font-size:14px;
                  font-weight:600; color:var(--ink); text-decoration:none; }
  .fx-pilulas a:hover { background:#FBE9EC; color:var(--red); }

  .fx-lado { position:sticky; top:72px; padding-top:30px; }
  .fx-cartao { border:1px solid #EEEEF1; border-radius:20px; padding:20px; box-shadow:0 10px 30px rgba(13,17,27,.06);
               display:flex; flex-direction:column; gap:12px; }
  .fx-agora { display:flex; align-items:center; gap:8px; font-weight:700; font-size:15px; }
  .fx-agora__ponto { width:9px; height:9px; border-radius:50%; background:#C9CCD3; }
  .fx-agora.aberto .fx-agora__ponto { background:#1F9D55; box-shadow:0 0 0 4px rgba(31,157,85,.15); }
  .fx-agora.fechado .fx-agora__ponto { background:var(--red); }
  .fx-info { display:flex; flex-direction:column; gap:1px; font-size:14.5px; border-top:1px solid #F1F1F3; padding-top:10px; }
  .fx-info__r { font-size:12px; color:#9AA0A8; font-weight:600; text-transform:uppercase; letter-spacing:.05em; }
  .fx-info a { color:var(--ink); font-weight:600; text-decoration:none; word-break:break-word; }
  .fx-info a:hover { color:var(--red); }
  .fx-btn { display:block; text-align:center; text-decoration:none; border-radius:14px; padding:13px 16px; font-weight:700;
            font-size:15px; }
  .fx-btn--primario { background:var(--red); color:#fff; margin-top:4px; }
  .fx-btn--primario:hover { background:#C20B27; }
  .fx-btn--contorno { border:1.5px solid #E4E4E7; color:var(--ink); background:#fff; }
  .fx-btn--contorno:hover { border-color:var(--red); color:var(--red); }
  .fx-sec > .fx-btn--contorno { display:inline-block; margin-top:14px; }
  .fx-lojas { display:flex; gap:8px; }
  .fx-lojas .fx-btn { flex:1; padding:11px 8px; font-size:14px; }
  .fx-rodape { border-top:1px solid #EEEEF1; margin-top:56px; padding:26px 24px 40px; text-align:center; font-size:14px; }
  .fx-rodape a { color:var(--muted); margin:0 10px; text-decoration:none; }

  @media (max-width:900px) {
    .fx-grade { grid-template-columns:1fr; gap:0; }
    .fx-lado { position:static; padding-top:22px; order:-1; }
    .fx-barra nav { display:none; }
  }
  @media (max-width:640px) {
    .fx-wrap, .fx-abas__in, .fx-barra__in { padding-left:16px; padding-right:16px; }
    .fx-mosaico { display:flex; height:auto; gap:8px; overflow-x:auto; scroll-snap-type:x mandatory; border-radius:0;
                  margin:0 -16px; padding:0 16px; scrollbar-width:none; }
    .fx-mosaico::-webkit-scrollbar { display:none; }
    .fx-mosaico__item { flex:0 0 86%; aspect-ratio:4/3; border-radius:16px; scroll-snap-align:center; }
    .fx-mosaico__item--grande { grid-row:auto; }
    .fx-mosaico__mais { display:none; }
    .fx-abas { margin-top:16px; }
    .fx-aval { flex-direction:column; align-items:flex-start; }
  }
`;
