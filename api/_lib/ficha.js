/**
 * Layout da ficha de restaurante (/r/:slug) — out/2026, v2.
 *
 * INFORMAÇÃO: segue a página de restaurante que as pessoas já sabem ler
 * (Tripadvisor) — posição e tipo embaixo do nome, abas fixas, coluna ao lado
 * com o que se consulta de pé na calçada (está aberto? onde fica?) e as
 * seções em ordem de decisão.
 *
 * PELE: é a HOME, de verdade — não uma imitação. A página carrega o mesmo
 * css/sello.css e js/sello.js (com o Lenis) e usa as mesmas peças:
 *   .nav            a pílula de vidro que acende quando a folha passa por baixo
 *   .hero           capa fixa (sticky) com o texto que esmaece ao rolar
 *   .sheet          a folha branca de cantos de 44px que sobe sobre a capa, com o selo
 *   .btn + .btn__t  pílulas com a "letra que vira" no hover
 *   [data-split]    títulos em Anton SC com palavras subindo
 *   [data-reveal]   blocos entrando ao rolar (data-delay escalona)
 *   .xg / .xb       cartões de guia e pílulas da seção Explore
 *   .finalcta       o rodapé
 * Mudou a home, muda aqui. O CSS abaixo (CSS_FICHA) é só o que a home não
 * tem: abas, coluna lateral, pratos, nota, fotos, horário, mapa.
 *
 * O conteúdo vem pronto de share.js; aqui é só a forma. Seção sem dado some.
 */

import { esc } from './cartao.js';
import { fmtNota } from './notas.js';
import { fmtNotaFonte } from './avaliacoes-externas.js';

/* Versões dos arquivos da home — as mesmas que o index.html pede, para o
 * navegador reaproveitar o cache de quem veio de lá. */
export const ASSETS_HOME = {
  css: '/css/sello.css?v=136',
  lenis: '/js/lenis.min.js?v=1',
  js: '/js/sello.js?v=57',
};

const MELHOR_PARA = {
  date: 'Encontro', special: 'Ocasião especial', casual: 'Dia a dia', quick: 'Rápido', brunch: 'Brunch',
};
const PAGAMENTO = {
  pix: 'Pix', credit_card: 'Crédito', debit_card: 'Débito', cash: 'Dinheiro', nfc: 'Aproximação',
};

/* Ícones de traço 24×24, no desenho dos ícones do app (Ionicons outline). */
const IC = {
  pin: '<path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
  tel: '<path d="M5 4h3l2 5-2.5 1.5a11 11 0 0 0 6 6L15 14l5 2v3a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/>',
  insta: '<rect x="3.5" y="3.5" width="17" height="17" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.2" cy="6.8" r=".8"/>',
  web: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
  menu: '<path d="M6 3h9l3 3v15H6z"/><path d="M9 10h6M9 14h6M9 18h4"/>',
  card: '<rect x="3" y="6" width="18" height="13" rx="2.5"/><path d="M3 10h18M7 15h3"/>',
  seta: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  esq: '<path d="M15 5l-7 7 7 7"/>',
  dir: '<path d="M9 5l7 7-7 7"/>',
  baixo: '<path d="m6 9 6 6 6-6"/>',
};
const icone = (n, cls) => '<svg class="' + (cls || 'fx-ic') + '" viewBox="0 0 24 24" aria-hidden="true">' + IC[n] + '</svg>';

/** Foto do Storage redimensionada pela largura (o corte é do CSS). URL de fora
 *  do nosso Storage passa intacta. */
export function foto(u, largura) {
  const s = String(u ?? '');
  if (!s.includes('/storage/v1/object/public/')) return s;
  return s.replace('/storage/v1/object/public/', '/storage/v1/render/image/public/') +
    (s.includes('?') ? '&' : '?') + 'width=' + largura + '&quality=72';
}

/** Os tamanhos da capa, para o srcset e para o preload em share.js. */
export function srcsetCapa(u) {
  return [800, 1280, 1920].map((w) => foto(u, w) + ' ' + w + 'w').join(', ');
}

/** Botão da home: pílula, Anton SC, letras que viram (o js/sello.js quebra o
 *  texto de .btn__t em letras). */
function botao(href, texto, mod, extra) {
  return '<a class="btn ' + (mod || 'btn--accent') + '" href="' + esc(href) + '"' + (extra || '') + '><span class="btn__t">' + esc(texto) + '</span></a>';
}

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

/** Capa primeiro, depois a galeria, sem repetir; cada foto com seu crédito. */
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

/**
 * A linha embaixo do nome: "Nº 3 de 26 avaliados em Pinheiros | Pizza, $$".
 * Posição pela nota média da COMUNIDADE, só entre lugares com 3+ avaliações
 * (com uma ou duas, um 10,0 diz mais de quem avaliou que do lugar) — daí
 * "avaliados", não "restaurantes". Fora da conta, a linha fica só com o tipo.
 */
function linhaPosicao(d, preco) {
  const p = d.posicao;
  const pos = p
    ? '<a class="fx-linha__pos" href="' + esc(p.href || '#avaliacoes') + '" title="Posição pela nota média da comunidade, entre os lugares com 3 ou mais avaliações">' +
      'Nº ' + p.n + ' de ' + p.total + ' avaliados ' + esc(p.onde) + '</a>'
    : '';
  const tipo = [d.cozinha ? esc(d.cozinha) : '', preco].filter(Boolean).join(', ');
  return pos || tipo
    ? '<p class="fx-linha hero-in hero-in--1">' + pos + (pos && tipo ? '<span class="fx-linha__sep"></span>' : '') + (tipo ? '<span>' + tipo + '</span>' : '') + '</p>'
    : '';
}

/* A capa é o .hero da home: fixa, a folha passa por cima, o texto esmaece ao
 * rolar (js/sello.js). Sem as classes de reveal no texto — ele é o LCP e tem
 * que pintar no primeiro quadro, como na home. */
function capa(r, c, d, fotos) {
  const f = fotos[0];
  const chips = (c.best_for || []).map((b) => MELHOR_PARA[b]).filter(Boolean);
  const nGuias = (d.guias || []).length;
  return '<section class="hero fx-hero' + (f ? '' : ' fx-hero--sem-foto') + '">' +
    (f
      ? '<div class="hero__media"><img src="' + esc(foto(f.url, 1280)) + '" srcset="' + esc(srcsetCapa(f.url)) +
        '" sizes="100vw" alt="' + esc(r.name) + '" fetchpriority="high" decoding="async" /></div>'
      : '') +
    '<div class="hero__scrim fx-hero__scrim"></div>' +
    '<div class="hero__content wrap">' +
      d.trilhaHtml.replace('class="trilha"', 'class="trilha fx-trilha hero-in"') +
      '<p class="hero__eyebrow hero-in">' + esc([d.bairro, d.cidade && d.cidade.nome].filter(Boolean).join(' · ') || 'Restaurante') + '</p>' +
      '<h1 class="hero__title fx-titulo hero-in">' + esc(r.name) + '</h1>' +
      linhaPosicao(d, precoVisual(c.price_range != null ? c.price_range : r.price_level)) +
      (c.hook ? '<p class="hero__sub fx-sub hero-in hero-in--1">' + esc(c.hook) + '</p>' : '') +
      '<div class="fx-meta hero-in hero-in--2">' +
        (d.nc
          ? '<a class="fx-selo" href="#avaliacoes" aria-label="Nota da comunidade: ' + esc(fmtNota(d.nc.media)) + ' de 10">' +
            '<strong>' + esc(fmtNota(d.nc.media)) + '</strong><span>' + d.nc.votos + (d.nc.votos === 1 ? ' avaliação' : ' avaliações') + '</span></a>'
          : '') +
        (nGuias ? '<a class="fx-vidro" href="#guias">Em ' + nGuias + (nGuias === 1 ? ' guia' : ' guias') + ' do Sello</a>' : '') +
        chips.map((t) => '<span class="fx-vidro">' + esc(t) + '</span>').join('') +
      '</div>' +
      '<div class="fx-acoes hero-in hero-in--2">' +
        botao(d.deepLink, 'Abrir no Sello', 'btn--accent btn--app') +
        (fotos.length > 1 ? botao('#fotos', 'Ver ' + fotos.length + ' fotos', 'btn--white btn--app') : '') +
      '</div>' +
    '</div>' +
    (f && f.attr && f.attr.attribution_text ? '<span class="fx-hero__credito">' + esc(f.attr.attribution_text) + '</span>' : '') +
    '<div class="hero__scroll" aria-hidden="true"><span class="hero__scroll-label">Role para ver mais</span>' +
      '<svg class="hero__scroll-ico" viewBox="0 0 24 24">' + IC.baixo + '</svg></div>' +
  '</section>';
}

/** Seção com o cabeçalho da home: olho vermelho + título Anton com palavras
 *  subindo (data-split). O corpo entra com data-reveal. */
function secao(id, olho, titulo, corpo, extra) {
  return '<section class="fx-sec"' + (id ? ' id="' + id + '"' : '') + '>' +
    (olho ? '<span class="xplore__eye">' + esc(olho) + '</span>' : '') +
    '<h2 class="fx-h2" data-split>' + esc(titulo) + '</h2>' +
    '<div class="fx-sec__corpo" data-reveal>' + corpo + '</div>' + (extra || '') + '</section>';
}

function visaoGeral(c, d) {
  const corpo =
    (d.resumoHtml ? d.resumoHtml.replace('<section class="resumo">', '<div class="fx-resumo">').replace(/<\/section>$/, '</div>') : '') +
    (c.sello_take_body
      ? '<div class="fx-take"><span class="fx-take__aspas" aria-hidden="true">“</span>' +
        '<span class="xplore__eye fx-take__olho">O take do Sello</span>' +
        (c.sello_take_title ? '<h3 class="fx-take__t">' + esc(c.sello_take_title) + '</h3>' : '') +
        '<p>' + esc(c.sello_take_body) + '</p></div>'
      : '') +
    ((c.why_go || []).filter(Boolean).length
      ? '<h3 class="fx-h3">Por que ir</h3><ul class="fx-check">' +
        c.why_go.filter(Boolean).map((t, i) => '<li class="chip" style="--i:' + i + '"><span class="chip__ic" aria-hidden="true">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9.5" fill="currentColor" stroke="none"/><path d="M7.5 12.5l3 3 6-6.5" stroke="#fff"/></svg>' +
          '</span><span>' + esc(t) + '</span></li>').join('') + '</ul>'
      : '') +
    (c.what_to_expect ? '<h3 class="fx-h3">O que esperar</h3><p class="fx-p">' + esc(c.what_to_expect) + '</p>' : '') +
    ((c.curiosities || []).length
      ? '<h3 class="fx-h3">Bom saber</h3><ul class="fx-bom">' +
        c.curiosities.map((x) => x && (x.text || x)).filter((t) => typeof t === 'string' && t)
          .map((t) => '<li>' + esc(t) + '</li>').join('') + '</ul>'
      : '');
  return secao('resumo', 'Visão geral', 'Sobre o lugar', corpo);
}

function pratos(c) {
  const lista = ((c.dishes && c.dishes.must_order) || []).filter((d) => d && d.name);
  if (!lista.length) return '';
  return secao('pedir', 'Do cardápio', 'O que pedir', '<div class="fx-pratos">' +
    lista.map((d, i) =>
      '<article class="fx-prato' + (d.image ? '' : ' fx-prato--sem-foto') + '" style="--i:' + i + '">' +
        '<div class="fx-prato__media">' +
          (d.image ? '<img src="' + esc(foto(d.image, 480)) + '" alt="' + esc(d.name) + '" loading="lazy" decoding="async" />' : '') +
          '<span class="fx-prato__n">' + (i + 1) + '</span>' +
        '</div>' +
        '<div class="fx-prato__txt"><h3>' + esc(d.name) + '</h3>' + (d.note ? '<p>' + esc(d.note) + '</p>' : '') + '</div>' +
      '</article>').join('') + '</div>');
}

/**
 * "Avaliações externas" — os mesmos cards do app (components/ExternalRatingCard
 * no repositório do app, Figma 410-1003): logo da fonte, nome, quantas
 * avaliações e, à direita, a marca da fonte com a nota na escala DELA (0–5).
 * Uma marca só — bolinha do Tripadvisor, estrela do Google —, porque com o
 * número escrito ao lado cinco marcas viram decoração. Não é link, como no app:
 * o card é um dado a mais na ficha, não uma porta de saída.
 *
 * Marca de terceiro: os logotipos são os do Figma do projeto, como no app.
 * Tripadvisor e Google pedem os arquivos oficiais das páginas de marca deles.
 */
function externas(fontes) {
  if (!(fontes || []).length) return '';
  const marca = (id) => id === 'google'
    ? '<svg class="fx-fonte__estrela" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.8l2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17.2l-5.7 3.1 1.2-6.4L2.8 9.5l6.4-.8z"/></svg>'
    : '<span class="fx-fonte__bola" aria-hidden="true"></span>';
  return '<h3 class="fx-h3">Avaliações externas</h3><div class="fx-fontes">' +
    fontes.map((f, i) => {
      const legenda = f.total != null
        ? f.total.toLocaleString('pt-BR') + (f.total === 1 ? ' avaliação' : ' avaliações')
        : 'Sem avaliações';
      return '<div class="fx-fonte" style="--i:' + i + '" aria-label="' + esc(f.nome + ': ' + legenda + (f.nota != null ? ', nota ' + fmtNotaFonte(f.nota) + ' de 5' : '')) + '">' +
        '<img class="fx-fonte__logo" src="/assets/brands/' + (f.id === 'google' ? 'google-maps' : 'tripadvisor') + '.png" alt="" width="40" height="40" loading="lazy" decoding="async" />' +
        '<div class="fx-fonte__txt"><strong>' + esc(f.nome) + '</strong><span>' + esc(legenda) + '</span></div>' +
        (f.nota != null ? '<div class="fx-fonte__nota">' + marca(f.id) + '<b>' + esc(fmtNotaFonte(f.nota)) + '</b></div>' : '') +
      '</div>';
    }).join('') + '</div>';
}

function avaliacoes(c, nc, deepLink, fontes) {
  const nota = nc
    ? '<div class="fx-nota">' +
        '<div class="fx-nota__n"><strong data-fx-conta="' + esc(nc.media.toFixed(1)) + '">' + esc(fmtNota(nc.media)) + '</strong><span>de 10</span></div>' +
        '<p class="fx-nota__l">Nota da comunidade</p>' +
        '<p class="fx-nota__s">Média de ' + nc.votos + (nc.votos === 1 ? ' avaliação' : ' avaliações') + ' de quem foi e avaliou no app.</p>' +
        '<div class="fx-nota__barra"><i style="--v:' + Math.max(0, Math.min(1, nc.media / 10)).toFixed(3) + '"></i></div>' +
      '</div>'
    : '<div class="fx-nota fx-nota--vazia"><div class="fx-nota__n"><strong>—</strong></div>' +
      '<p class="fx-nota__l">Ainda sem avaliações</p><p class="fx-nota__s">Foi lá? Seja a primeira nota, no app.</p></div>';
  const dizem = c.community_summary
    ? '<figure class="fx-dizem"><span class="fx-dizem__aspas" aria-hidden="true">“</span>' +
      '<blockquote>' + esc(c.community_summary) + '</blockquote><figcaption>O que dizem de lá</figcaption></figure>'
    : '';
  return secao('avaliacoes', 'Comunidade', 'Avaliações',
    '<div class="fx-aval">' + nota + dizem + '</div>' + externas(fontes),
    '<div class="fx-sec__acao" data-reveal data-delay="1">' + botao(deepLink, 'Avaliar no app', 'btn--dark') + '</div>');
}

function galeria(fotos, nome) {
  if (fotos.length < 2) return '';
  const MAX = 9;
  return secao('fotos', fotos.length + ' fotos', 'Fotos', '<div class="fx-bento">' +
    fotos.slice(0, MAX).map((f, i) =>
      '<button type="button" class="fx-bento__item" data-fx-foto="' + i + '" style="--i:' + i + '" aria-label="Ampliar foto ' + (i + 1) + '">' +
        '<img src="' + esc(foto(f.url, i === 0 ? 900 : 480)) + '" data-grande="' + esc(foto(f.url, 1600)) + '" alt="' + esc(nome + ' — foto ' + (i + 1)) +
        '" loading="lazy" decoding="async" />' + credito(f.attr) +
        (i === MAX - 1 && fotos.length > MAX ? '<span class="fx-bento__mais">+' + (fotos.length - MAX) + '</span>' : '') +
      '</button>').join('') +
    '</div>' +
    // As que passam das 9 visíveis entram só no visualizador.
    fotos.slice(MAX).map((f) => '<template data-fx-extra data-grande="' + esc(foto(f.url, 1600)) + '" data-credito="' +
      esc((f.attr && f.attr.attribution_text) || '') + '"></template>').join(''));
}

function horario(c) {
  const linhas = (c.hours || []).filter((h) => h && h.label);
  if (!linhas.length) return '';
  return secao('horario', 'Quando ir', 'Horário', '<ul class="fx-horas">' +
    linhas.map((h) => '<li data-dia="' + esc(h.label) + '"><span class="fx-horas__d">' + esc(h.label) + '</span>' +
      '<span class="fx-horas__v">' + esc(h.value) + '</span></li>').join('') +
    '</ul><p class="fx-rodape-sec">Horário publicado pela casa. Feriados podem mudar.</p>');
}

function mapa(r, c) {
  if (!r.address && !(r.lat && r.lng)) return '';
  const lat = Number(r.lat), lng = Number(r.lng);
  const temCoord = Number.isFinite(lat) && Number.isFinite(lng) && lat && lng;
  const d = 0.004;
  const embed = temCoord
    ? '<div class="fx-mapa"><iframe title="Mapa de ' + esc(r.name) + '" loading="lazy" src="' +
      esc('https://www.openstreetmap.org/export/embed.html?bbox=' + (lng - d) + ',' + (lat - d) + ',' + (lng + d) + ',' + (lat + d) +
        '&layer=mapnik&marker=' + lat + ',' + lng) + '"></iframe>' +
      (r.address ? '<div class="fx-mapa__card">' + icone('pin') + '<span>' + esc(r.address) + '</span></div>' : '') + '</div>'
    : (r.address ? '<p class="fx-endereco">' + esc(r.address) + '</p>' : '');
  const rotas = c.google_maps_uri || (temCoord ? 'https://www.google.com/maps/search/?api=1&query=' + lat + ',' + lng : '');
  const chegar = (c.getting_there || []).map((g) => g && (g.label || g.text)).filter(Boolean);
  return secao('local', 'Onde fica', 'Localização',
    embed + (chegar.length ? '<ul class="fx-chegar">' + chegar.map((t) => '<li>' + icone('seta') + '<span>' + esc(t) + '</span></li>').join('') + '</ul>' : ''),
    rotas ? '<div class="fx-sec__acao" data-reveal data-delay="1">' + botao(rotas, 'Como chegar', 'btn--dark', ' rel="nofollow noopener" target="_blank"') + '</div>' : '');
}

function lateral(r, c, d) {
  const pg = (r.payment_methods || c.payment_methods || []).map((p) => PAGAMENTO[p]).filter(Boolean);
  const periodos = (r.hours_periods || c.hours_periods || []).filter((p) => p && p.open && p.close);
  const info = (ic, rot, val) => '<div class="fx-info">' + icone(ic) + '<div><span class="fx-info__r">' + rot + '</span>' + val + '</div></div>';
  const linhas = [
    r.address ? info('pin', 'Endereço', '<a href="#local">' + esc(String(r.address).split(' - ')[0]) + (d.bairro ? ' · ' + esc(d.bairro) : '') + '</a>') : '',
    r.phone ? info('tel', 'Telefone', '<a href="tel:' + esc(String(r.phone).replace(/[^\d+]/g, '')) + '">' + esc(r.phone) + '</a>') : '',
    r.instagram ? info('insta', 'Instagram', '<a rel="nofollow noopener" target="_blank" href="https://instagram.com/' + esc(r.instagram) + '">@' + esc(r.instagram) + '</a>') : '',
    r.website ? info('web', 'Site', '<a rel="nofollow noopener" target="_blank" href="' + esc(r.website) + '">' + esc(String(r.website).replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')) + '</a>') : '',
    r.menu_url ? info('menu', 'Cardápio', '<a rel="nofollow noopener" target="_blank" href="' + esc(r.menu_url) + '">Ver cardápio</a>') : '',
    pg.length ? info('card', 'Pagamento', '<span>' + esc(pg.join(' · ')) + '</span>') : '',
  ].filter(Boolean).join('');
  return '<aside class="fx-lado"><div class="fx-cartao" data-reveal>' +
    (periodos.length
      ? '<div class="fx-agora" data-periodos="' + esc(JSON.stringify(periodos.map((p) => [p.open.day, p.open.time, p.close.day, p.close.time]))) + '">' +
        '<span class="fx-agora__ponto"></span><span class="fx-agora__txt">Horário</span></div>'
      : '') +
    linhas +
    '<div class="fx-cartao__cta">' + botao(d.deepLink, 'Abrir no Sello', 'btn--accent btn--app fx-btn-bloco') +
    '<div class="fx-lojas"><a href="' + esc(d.appStore) + '">App Store</a><a href="' + esc(d.playStore) + '">Google Play</a></div></div>' +
    '</div></aside>';
}

/** Pílulas no padrão da home (.xb). `itens` = [{ href, txt, nota? }]. */
function pilulas(itens) {
  return itens.length
    ? '<ul class="xplore__bairros">' + itens.map((x) =>
        '<li><a class="xb fx-xb" href="' + esc(x.href) + '">' + esc(x.txt) + (x.nota ? '<b>' + esc(x.nota) + '</b>' : '') + '</a></li>').join('') + '</ul>'
    : '';
}

/**
 * O conteúdo do <body>: barra, capa, folha com abas, conteúdo e rodapé da
 * home, mais a barra de app (celular) e o visualizador de fotos.
 * `d` vem de share.js; `explorar` chega como [{ href, txt }].
 */
export function layoutRestaurante(r, c, d) {
  const fotos = fotosDe(r, c);

  const abas = [
    ['resumo', 'Visão geral'],
    (c.dishes && (c.dishes.must_order || []).length) ? ['pedir', 'O que pedir'] : null,
    ['avaliacoes', 'Avaliações'],
    fotos.length > 1 ? ['fotos', 'Fotos'] : null,
    (c.hours || []).length ? ['horario', 'Horário'] : null,
    (r.address || r.lat) ? ['local', 'Localização'] : null,
  ].filter(Boolean);

  const guias = (d.guias || []).length
    ? secao('guias', 'Curadoria', 'Aparece nos guias', '<ul class="xplore__guides fx-guias">' +
        d.guias.map((g) => '<li><a class="xg" href="/g/' + esc(g.slug) + '"><span class="xg__name">' + esc(g.title) + '</span>' +
          '<span class="xg__desc">Guia do Sello</span></a></li>').join('') + '</ul>')
    : '';
  const vizinhos = (d.vizinhos || []).length && d.bairro
    ? secao('', 'Por perto', 'Também em ' + d.bairro, pilulas(d.vizinhos))
    : '';

  return '' +
  '<header class="nav" id="nav"><div class="nav__inner">' +
    '<a class="nav__brand" href="/" aria-label="Sello — início"><span class="nav__wordmark" aria-hidden="true"></span></a>' +
    '<nav class="nav__menu" aria-label="Principal"><a href="/guias">Guias</a><a href="/guias#bairros">Bairros</a><a href="/guias#ocasioes">Ocasiões</a></nav>' +
    botao('/baixar', 'Baixar o app', 'btn--accent btn--app') +
  '</div></header>' +
  '<main id="top">' +
    capa(r, c, d, fotos) +
    '<div class="sheet fx-folha">' +
      '<img src="/assets/img/seal.svg" alt="" class="sheet__seal" aria-hidden="true" width="80" height="80" decoding="async" />' +
      '<nav class="fx-abas" aria-label="Seções"><div class="fx-abas__in">' +
        abas.map(([id, t]) => '<a href="#' + id + '">' + esc(t) + '</a>').join('') +
        '<i class="fx-abas__barra" aria-hidden="true"></i>' +
      '</div></nav>' +
      '<div class="wrap fx-grade">' +
        '<div class="fx-col">' +
          visaoGeral(c, d) + pratos(c) + avaliacoes(c, d.nc, d.deepLink, d.externas) + galeria(fotos, r.name) +
          horario(c) + mapa(r, c) + guias + vizinhos +
          ((d.explorar || []).length ? secao('', 'Continue', 'Explore', pilulas(d.explorar)) : '') +
        '</div>' +
        lateral(r, c, d) +
      '</div>' +
    '</div>' +
    // O fecho da home: manifesto + botão, e o rodapé vermelho subindo por cima.
    '<section class="cta-final">' +
      '<div class="wrap cta-final__inner">' +
        '<div class="cta-final__head">' +
          '<h2 class="anton cta-final__title" data-split>SEU PRÓXIMO<br />RESTAURANTE<br />JÁ ESTÁ TE ESPERANDO</h2>' +
          '<img class="cta-final__star" src="/assets/img/cta-star.svg" alt="" aria-hidden="true" width="188" height="177" loading="lazy" decoding="async" />' +
        '</div>' +
        '<p class="cta-final__sub" data-reveal data-delay="1">Curadoria editorial, inteligência e uma comunidade apaixonada por gastronomia. Tudo para ajudar você a escolher restaurantes que realmente valem a pena.</p>' +
        '<div class="cta-final__btn" data-reveal data-delay="2">' + botao('/baixar', 'Baixar o app', 'btn--accent btn--app') + '</div>' +
      '</div>' +
    '</section>' +
      '<footer class="finalcta">' +
        '<div class="wrap fc">' +
          '<div class="fc__top">' +
            '<nav class="fc__cols" aria-label="Rodapé">' +
              '<div class="fc__col"><h4 class="anton">Produto</h4><a href="/baixar">Baixe o aplicativo</a><a href="/guias">Guias</a><a href="/guias#bairros">Bairros</a><a href="/guias#ocasioes">Ocasiões</a></div>' +
              '<div class="fc__col"><h4 class="anton">Empresa</h4><a href="/sobre">Sobre o Sello</a><a href="mailto:contato@selloapp.com.br">Nos contate</a></div>' +
              '<div class="fc__col"><h4 class="anton">Socials</h4><a href="https://instagram.com/sello_oficial" target="_blank" rel="noopener">Instagram</a></div>' +
            '</nav>' +
            '<div class="fc__qr" data-reveal data-delay="1"><div class="fc__qrcard"><img src="/assets/img/qr.png?v=2" alt="QR para baixar o aplicativo Sello" width="640" height="640" loading="lazy" decoding="async" /></div><span>Baixar Aplicativo</span></div>' +
          '</div>' +
          '<div class="fc__legal"><span>2026 SELLO — ALL RIGHTS RESERVED</span><a href="/privacidade">POLÍTICA DE PRIVACIDADE</a><a href="/termos">TERMOS DE USO</a></div>' +
        '</div>' +
        '<span class="fc__wm" aria-hidden="true"></span>' +
      '</footer>' +
  '</main>' +
  /* Barra fixa de download. O botão sai para /baixar (funciona sem JS); no
   * celular o JS troca pelo link direto da loja do aparelho — um toque e a
   * pessoa está na App Store ou no Google Play. */
  '<div class="fx-barra-app" id="fx-barra-app" role="complementary" aria-label="Baixar o app do Sello">' +
    '<span class="fx-barra-app__selo" aria-hidden="true"></span>' +
    '<p><strong>Salve e avalie no app</strong><span>Mapa, listas e a nota de quem foi.</span></p>' +
    '<a class="btn btn--accent fx-barra-app__baixar" id="fx-baixar" href="/baixar" data-ios="' + esc(d.appStore) + '" data-android="' + esc(d.playStore) + '"><span class="btn__t">Baixar o app</span></a>' +
  '</div>' +
  '<div class="fx-lb" id="fx-lb" hidden aria-modal="true" role="dialog" aria-label="Fotos">' +
    '<button type="button" class="fx-lb__x" aria-label="Fechar">' + icone('x') + '</button>' +
    '<button type="button" class="fx-lb__nav fx-lb__nav--esq" aria-label="Anterior">' + icone('esq') + '</button>' +
    '<figure class="fx-lb__fig"><img alt="" /><figcaption></figcaption></figure>' +
    '<button type="button" class="fx-lb__nav fx-lb__nav--dir" aria-label="Próxima">' + icone('dir') + '</button>' +
    '<span class="fx-lb__cont"></span>' +
  '</div>';
}

/* ═══════════════════════════════ Movimento da ficha ═══════════════════════════
 * O da home (nav, letras, títulos, reveal, Lenis) vem do js/sello.js. Aqui só
 * o que é da ficha: abas com a barra deslizando, a nota contando, a barra do
 * app no celular, o visualizador de fotos e o "aberto agora" — calculado no
 * navegador, no fuso de São Paulo, porque a página fica em cache na borda e
 * uma frase escrita no servidor envelheceria lá dentro. */
export const JS_FICHA = `
(function () {
  var reduz = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (s, el) { return (el || document).querySelector(s); };
  var $$ = function (s, el) { return [].slice.call((el || document).querySelectorAll(s)); };
  var hero = $('.fx-hero');

  /* Âncoras internas: com o Lenis ligado o salto nativo é seco; deixa ele rolar. */
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href^="#"]');
    if (!a || a.getAttribute('href').length < 2) return;
    var alvo = $(a.getAttribute('href'));
    if (!alvo) return;
    e.preventDefault();
    if (window.lenis) window.lenis.scrollTo(alvo, { offset: -150, duration: 1.2 });
    else alvo.scrollIntoView({ behavior: reduz ? 'auto' : 'smooth' });
  });

  /* Barra fixa de download. Sobe quando a folha começa a cobrir a capa (antes
   * disso a capa já tem o botão) e desce quando o rodapé chega — ele tem o
   * próprio QR e o próprio botão, e duas chamadas iguais empilhadas é ruído.
   * Roda ANTES do js/sello.js (que é defer): o texto do botão é trocado antes
   * de ele ser quebrado nas letras que viram. */
  var barraApp = $('#fx-barra-app'), baixar = $('#fx-baixar'), tick = false, noFim = false;
  var ua = navigator.userAgent || '';
  if (baixar) {
    var loja = /iPhone|iPad|iPod/i.test(ua) ? baixar.getAttribute('data-ios')
      : /Android/i.test(ua) ? baixar.getAttribute('data-android') : '';
    if (loja) { baixar.setAttribute('href', loja); $('.btn__t', baixar).textContent = 'Baixar'; }
  }
  function rolou() {
    tick = false;
    if (barraApp) barraApp.classList.toggle('visivel', !noFim && (window.scrollY || 0) > (hero ? hero.offsetHeight * 0.35 : 300));
  }
  window.addEventListener('scroll', function () { if (!tick) { tick = true; requestAnimationFrame(rolou); } }, { passive: true });
  var fim = $('.cta-final');
  if (fim && 'IntersectionObserver' in window) {
    new IntersectionObserver(function (es) { noFim = es[0].isIntersecting || es[0].boundingClientRect.top < 0; rolou(); }).observe(fim);
  }
  rolou();

  /* A nota conta até o valor quando entra na tela. */
  function contar(el) {
    var alvo = parseFloat(el.getAttribute('data-fx-conta')); if (!isFinite(alvo) || reduz) return;
    var t0 = null;
    function f(t) { if (!t0) t0 = t; var k = Math.min((t - t0) / 1200, 1); k = 1 - Math.pow(1 - k, 3);
      el.textContent = (alvo * k).toFixed(1).replace('.', ','); if (k < 1) requestAnimationFrame(f); }
    requestAnimationFrame(f);
  }
  if ('IntersectionObserver' in window) {
    var ioN = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { contar(e.target); ioN.unobserve(e.target); } });
    }, { threshold: 0.6 });
    $$('[data-fx-conta]').forEach(function (el) { ioN.observe(el); });
  }

  /* Abas: a barra vermelha desliza até a seção da vez. */
  var abas = $$('.fx-abas a'), barra = $('.fx-abas__barra');
  function marcar(a) {
    abas.forEach(function (x) { x.classList.toggle('ativo', x === a); });
    if (barra && a) { barra.style.width = a.offsetWidth + 'px'; barra.style.transform = 'translateX(' + a.offsetLeft + 'px)'; }
    var trilho = a && a.parentNode;
    if (trilho && trilho.scrollWidth > trilho.clientWidth) trilho.scrollTo({ left: a.offsetLeft - 20, behavior: reduz ? 'auto' : 'smooth' });
  }
  if (abas.length) {
    requestAnimationFrame(function () { marcar(abas[0]); });
    if ('IntersectionObserver' in window) {
      var ioA = new IntersectionObserver(function (es) {
        es.forEach(function (e) {
          if (!e.isIntersecting) return;
          var a = abas.filter(function (x) { return x.getAttribute('href') === '#' + e.target.id; })[0];
          if (a) marcar(a);
        });
      }, { rootMargin: '-35% 0px -60% 0px' });
      abas.forEach(function (a) { var s = $(a.getAttribute('href')); if (s) ioA.observe(s); });
    }
    window.addEventListener('resize', function () { marcar($('.fx-abas a.ativo') || abas[0]); });
  }

  /* Aberto agora / dia de hoje — fuso de São Paulo. */
  try {
    var DIAS = ['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'];
    var p = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Sao_Paulo', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date());
    var get = function (t) { return (p.filter(function (x) { return x.type === t; })[0] || {}).value; };
    var dia = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].indexOf(get('weekday'));
    var agora = dia * 1440 + Number(get('hour')) * 60 + Number(get('minute'));
    var hoje = $('.fx-horas li[data-dia="' + DIAS[dia] + '"]');
    if (hoje) hoje.classList.add('hoje');
    var el = $('.fx-agora');
    if (el) {
      var per = JSON.parse(el.getAttribute('data-periodos') || '[]');
      var pad = function (t) { t = String(t); while (t.length < 4) t = '0' + t; return t; };
      var min = function (d, t) { t = pad(t); return d * 1440 + Number(t.slice(0, 2)) * 60 + Number(t.slice(2)); };
      var hh = function (t) { t = pad(t); return t.slice(0, 2) + ':' + t.slice(2); };
      var aberto = null, prox = null;
      per.forEach(function (x) {
        var a = min(x[0], x[1]), f = min(x[2], x[3]); if (f <= a) f += 10080;
        [agora, agora + 10080].forEach(function (n) { if (n >= a && n < f) aberto = x; });
        var falta = (a - agora + 10080) % 10080;
        if (!prox || falta < prox.falta) prox = { falta: falta, x: x };
      });
      var txt = $('.fx-agora__txt', el);
      if (aberto) { el.classList.add('aberto'); txt.innerHTML = '<b>Aberto agora</b> · fecha às ' + hh(aberto[3]); }
      else if (prox) { el.classList.add('fechado'); txt.innerHTML = '<b>Fechado agora</b> · abre ' + (prox.x[0] === dia ? 'hoje' : DIAS[prox.x[0]].toLowerCase()) + ' às ' + hh(prox.x[1]); }
    }
  } catch (e) {}

  /* Visualizador de fotos. */
  var lb = $('#fx-lb');
  if (lb) {
    var itens = $$('[data-fx-foto] img').map(function (im) {
      var cr = im.parentNode.querySelector('.fx-credito');
      return { src: im.getAttribute('data-grande'), credito: cr ? cr.textContent : '' };
    }).concat($$('template[data-fx-extra]').map(function (t) {
      return { src: t.getAttribute('data-grande'), credito: t.getAttribute('data-credito') };
    }));
    var atual = 0, img = $('img', lb), cap = $('figcaption', lb), cont = $('.fx-lb__cont', lb), voltar = null;
    var mostrar = function (i) {
      atual = (i + itens.length) % itens.length;
      lb.classList.remove('troca'); void lb.offsetWidth; lb.classList.add('troca');
      img.src = itens[atual].src; cap.textContent = itens[atual].credito; cont.textContent = (atual + 1) + ' / ' + itens.length;
    };
    var abrir = function (i) {
      voltar = document.activeElement; lb.hidden = false; mostrar(i);
      requestAnimationFrame(function () { lb.classList.add('aberto'); });
      if (window.lenis) window.lenis.stop(); document.documentElement.style.overflow = 'hidden'; $('.fx-lb__x', lb).focus();
    };
    var fechar = function () {
      lb.classList.remove('aberto'); document.documentElement.style.overflow = '';
      if (window.lenis) window.lenis.start();
      setTimeout(function () { lb.hidden = true; }, 350); if (voltar) voltar.focus();
    };
    $$('[data-fx-foto]').forEach(function (b) { b.addEventListener('click', function () { abrir(Number(b.getAttribute('data-fx-foto'))); }); });
    $('.fx-lb__x', lb).addEventListener('click', fechar);
    $('.fx-lb__nav--esq', lb).addEventListener('click', function () { mostrar(atual - 1); });
    $('.fx-lb__nav--dir', lb).addEventListener('click', function () { mostrar(atual + 1); });
    lb.addEventListener('click', function (e) { if (e.target === lb) fechar(); });
    document.addEventListener('keydown', function (e) {
      if (lb.hidden) return;
      if (e.key === 'Escape') fechar(); else if (e.key === 'ArrowLeft') mostrar(atual - 1); else if (e.key === 'ArrowRight') mostrar(atual + 1);
    });
    var x0 = null;
    lb.addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; }, { passive: true });
    lb.addEventListener('touchend', function (e) { if (x0 == null) return; var dx = e.changedTouches[0].clientX - x0; if (Math.abs(dx) > 40) mostrar(atual + (dx < 0 ? 1 : -1)); x0 = null; });
  }
})();
`;

/* Só o que a home não tem. Tokens (--red, --ink, --pink, --line, --ease,
 * --font-disp…) vêm do :root do css/sello.css. */
export const CSS_FICHA = `
  .fx-ic { width:20px; height:20px; flex:none; fill:none; stroke:currentColor; stroke-width:1.8; stroke-linecap:round; stroke-linejoin:round; }

  /* ── capa (ajustes sobre o .hero da home) ── */
  .fx-hero { align-items:flex-end; }
  .fx-hero--sem-foto { background:radial-gradient(120% 90% at 20% 0%, #4a0b17 0%, var(--ink) 62%); }
  .fx-hero__scrim { background:linear-gradient(180deg, rgba(13,17,27,.55) 0%, rgba(13,17,27,.12) 30%, rgba(13,17,27,.55) 62%, rgba(13,17,27,.9) 100%); }
  .fx-hero .hero__content { --hero-shift:0px; padding-bottom:clamp(110px,15vh,150px); }
  .fx-trilha { font-size:13px; color:rgba(255,255,255,.72); margin:0 0 18px; }
  .fx-trilha a { color:rgba(255,255,255,.9); text-decoration:underline; text-underline-offset:3px; text-decoration-color:rgba(255,255,255,.35); }
  .fx-trilha a:hover { text-decoration-color:#fff; }
  .fx-titulo { font-size:clamp(2.8rem,7.4vw,6.4rem); line-height:1.04; max-width:15ch; text-wrap:balance; padding-top:.06em; margin-bottom:16px; }
  .fx-linha { display:flex; flex-wrap:wrap; align-items:center; gap:6px 16px; margin:0 0 4px; font-size:clamp(.98rem,1.2vw,1.08rem); }
  .fx-linha__pos { font-weight:600; text-decoration:underline; text-underline-offset:5px; text-decoration-thickness:1px;
    text-decoration-color:rgba(255,255,255,.5); transition:text-decoration-color .3s var(--ease); }
  .fx-linha__pos:hover { text-decoration-color:#fff; }
  .fx-linha__sep { width:1px; height:16px; background:rgba(255,255,255,.4); }
  .fx-preco { font-weight:700; letter-spacing:.06em; }
  .fx-preco__off { opacity:.38; }
  .fx-sub { font-style:italic; margin-top:14px; }
  .fx-meta { display:flex; flex-wrap:wrap; align-items:center; gap:10px; margin-top:22px; }
  .fx-selo { display:inline-flex; align-items:center; gap:9px; background:#fff; color:var(--ink); border-radius:999px; padding:5px 16px 5px 5px;
    font-size:.88rem; font-weight:700; transition:transform .35s var(--ease), box-shadow .35s var(--ease); }
  .fx-selo:hover { transform:translateY(-2px); box-shadow:0 14px 30px -12px rgba(0,0,0,.55); }
  .fx-selo strong { background:var(--red); color:#fff; border-radius:999px; padding:5px 12px 3px; font-family:var(--font-disp); font-weight:400; font-size:1.25rem; line-height:1.1; }
  .fx-vidro { display:inline-flex; align-items:center; border-radius:999px; padding:9px 15px; font-size:.84rem; font-weight:600; color:#fff;
    background:rgba(255,255,255,.14); border:1px solid rgba(255,255,255,.24); backdrop-filter:blur(12px); -webkit-backdrop-filter:blur(12px);
    transition:background .3s var(--ease); }
  a.fx-vidro:hover { background:rgba(255,255,255,.3); }
  .fx-acoes { display:flex; flex-wrap:wrap; gap:12px; margin-top:28px; }
  .fx-hero__credito { position:absolute; right:var(--pad); bottom:clamp(64px,9vh,90px); z-index:2; background:rgba(13,17,27,.5); color:#fff;
    font-size:10.5px; padding:3px 9px; border-radius:999px; backdrop-filter:blur(6px); -webkit-backdrop-filter:blur(6px); }


  /* ── abas: pílula de vidro presa logo abaixo da barra da home ── */
  .fx-abas { position:sticky; top:84px; z-index:40; display:flex; justify-content:center; padding:44px var(--pad) 0; pointer-events:none; }
  .fx-abas__in { pointer-events:auto; position:relative; display:flex; gap:4px; max-width:100%; overflow-x:auto; scrollbar-width:none;
    padding:6px; border-radius:999px; background:rgba(255,255,255,.78); backdrop-filter:blur(20px) saturate(170%); -webkit-backdrop-filter:blur(20px) saturate(170%);
    box-shadow:0 10px 34px -20px rgba(13,17,27,.35), inset 0 0 0 1px rgba(13,17,27,.06); }
  .fx-abas__in::-webkit-scrollbar { display:none; }
  .fx-abas a { position:relative; z-index:1; flex:none; padding:10px 18px; border-radius:999px; font-size:.92rem; font-weight:600; color:var(--muted);
    transition:color .4s var(--ease); }
  .fx-abas a:hover { color:var(--ink); }
  .fx-abas a.ativo { color:#fff; }
  .fx-abas__barra { position:absolute; left:0; top:6px; bottom:6px; width:0; border-radius:999px; background:var(--red);
    box-shadow:0 8px 20px -10px rgba(227,15,47,.8); transition:transform .6s var(--ease), width .6s var(--ease); }

  /* ── grade ── */
  .fx-grade { display:grid; grid-template-columns:minmax(0,1fr) 360px; gap:clamp(40px,5vw,72px); align-items:start; }
  .fx-col { min-width:0; }
  .fx-sec { padding:clamp(48px,6vw,72px) 0 8px; scroll-margin-top:160px; }
  .fx-sec + .fx-sec { border-top:1px solid var(--line); }
  .fx-h2 { font-family:var(--font-disp); font-weight:400; text-transform:uppercase; font-size:clamp(2rem,3.6vw,3rem); line-height:1.08;
    letter-spacing:.012em; color:var(--ink); margin:0 0 clamp(18px,2vw,26px); }
  .fx-h3 { font-size:1.05rem; font-weight:700; margin:32px 0 12px; }
  .fx-p, .fx-col p { color:var(--muted); font-size:1rem; line-height:1.7; margin:0; }
  .fx-sec__acao { margin-top:26px; }

  .fx-resumo { background:var(--pink); border-radius:24px; padding:22px 24px; }
  .fx-resumo h2 { font-family:var(--font-disp); font-weight:400; text-transform:uppercase; font-size:1rem; letter-spacing:.04em; color:var(--red); margin:0 0 8px; }
  .fx-resumo p { color:var(--ink) !important; }
  .fx-take { position:relative; margin-top:28px; padding:28px 28px 28px 30px; border-radius:24px; background:var(--ink); color:#fff; overflow:hidden; }
  .fx-take__aspas { position:absolute; right:22px; top:-34px; font-family:var(--font-disp); font-size:190px; line-height:1; color:var(--red); }
  .fx-take__olho { color:#FF6B7F; }
  .fx-take__t { position:relative; font-family:var(--font-disp); font-weight:400; text-transform:uppercase; font-size:clamp(1.4rem,2.2vw,1.8rem); line-height:1.12;
    margin:0 0 12px; max-width:85%; }
  .fx-take p { position:relative; color:rgba(255,255,255,.82) !important; }
  .fx-check { list-style:none; margin:0; padding:0; display:grid; gap:10px; }
  .fx-check .chip { white-space:normal; align-items:flex-start; line-height:1.55; transition:transform .4s var(--ease), background .4s var(--ease); }
  .fx-check .chip:hover { transform:translateX(6px); background:var(--pink); }
  .fx-check .chip__ic svg { width:22px; height:22px; }
  .fx-bom { margin:0; padding:0; list-style:none; display:grid; gap:8px; }
  .fx-bom li { position:relative; padding-left:22px; color:var(--muted); line-height:1.6; }
  .fx-bom li::before { content:""; position:absolute; left:4px; top:10px; width:7px; height:7px; border-radius:50%; background:var(--red); }

  /* escalonamento dos filhos quando o bloco entra (o .is-in é do js/sello.js) */
  [data-reveal] .fx-prato, [data-reveal] .fx-bento__item, [data-reveal] .fx-check .chip {
    opacity:0; transform:translateY(22px) scale(.97);
    transition:opacity .7s var(--ease), transform .7s var(--ease), background .4s var(--ease), box-shadow .5s var(--ease);
    transition-delay:calc(var(--i,0) * 80ms + 120ms); }
  [data-reveal].is-in .fx-prato, [data-reveal].is-in .fx-bento__item, [data-reveal].is-in .fx-check .chip { opacity:1; transform:none; }
  [data-reveal].is-in .fx-prato:hover { transform:translateY(-6px); transition-delay:0s; }
  [data-reveal].is-in .fx-check .chip:hover { transform:translateX(6px); transition-delay:0s; }

  /* pratos */
  .fx-pratos { display:grid; grid-template-columns:repeat(auto-fill,minmax(210px,1fr)); gap:16px; }
  .fx-prato { border-radius:22px; overflow:hidden; background:#fff; box-shadow:0 0 0 1px var(--line); }
  .fx-prato:hover { box-shadow:0 26px 50px -26px rgba(13,17,27,.45), 0 0 0 1px var(--line); }
  .fx-prato__media { position:relative; aspect-ratio:4/3; overflow:hidden; background:var(--light); }
  .fx-prato__media img { width:100%; height:100%; object-fit:cover; transition:transform 1s var(--ease); }
  .fx-prato:hover .fx-prato__media img { transform:scale(1.08); }
  .fx-prato__n { position:absolute; left:12px; top:12px; min-width:34px; height:34px; border-radius:999px; background:var(--red); color:#fff;
    display:grid; place-items:center; font-family:var(--font-disp); font-size:1.05rem; padding-top:2px; box-shadow:0 8px 18px -8px rgba(227,15,47,.8); }
  .fx-prato--sem-foto .fx-prato__media { aspect-ratio:auto; height:58px; background:var(--pink); }
  .fx-prato__txt { padding:16px 18px 18px; }
  .fx-prato h3 { font-size:1rem; margin:0 0 6px; }
  .fx-prato p { font-size:.88rem !important; line-height:1.55 !important; }

  /* avaliações */
  .fx-aval { display:grid; grid-template-columns:250px 1fr; gap:16px; }
  .fx-nota { border-radius:24px; background:var(--red); color:#fff; padding:24px; display:flex; flex-direction:column; }
  .fx-nota--vazia { background:var(--light); color:var(--ink); }
  .fx-nota__n { display:flex; align-items:baseline; gap:6px; }
  .fx-nota__n strong { font-family:var(--font-disp); font-weight:400; font-size:4.6rem; line-height:1; }
  .fx-nota__n span { font-size:.88rem; font-weight:700; opacity:.85; }
  .fx-nota__l { color:inherit !important; font-weight:700; margin-top:10px !important; }
  .fx-nota__s { color:inherit !important; opacity:.85; font-size:.86rem !important; line-height:1.5 !important; }
  .fx-nota__barra { margin-top:auto; padding-top:18px; }
  .fx-nota__barra i { display:block; height:6px; border-radius:6px; background:rgba(255,255,255,.28); position:relative; overflow:hidden; }
  .fx-nota__barra i::after { content:""; position:absolute; inset:0; background:#fff; border-radius:6px; transform-origin:left; transform:scaleX(0);
    transition:transform 1.4s var(--ease) .3s; }
  [data-reveal].is-in .fx-nota__barra i::after { transform:scaleX(var(--v)); }
  .fx-dizem { position:relative; margin:0; border-radius:24px; background:var(--light); padding:28px 28px 24px; overflow:hidden; }
  .fx-dizem__aspas { position:absolute; left:16px; top:-26px; font-family:var(--font-disp); font-size:140px; color:var(--red); opacity:.14; line-height:1; }
  .fx-dizem blockquote { position:relative; margin:0; line-height:1.7; color:var(--ink); }
  .fx-dizem figcaption { margin-top:14px; font-size:.82rem; font-weight:700; color:var(--red); }

  /* avaliações externas (mesmo desenho do app) */
  .fx-fontes { display:grid; grid-template-columns:repeat(auto-fit,minmax(260px,1fr)); gap:12px; }
  .fx-fonte { display:flex; align-items:center; gap:12px; padding:16px; border-radius:16px; border:1px solid #E0E0E0; background:#fff;
    transition:border-color .35s var(--ease), box-shadow .35s var(--ease), transform .35s var(--ease); }
  .fx-fonte:hover { border-color:transparent; box-shadow:0 18px 36px -22px rgba(13,17,27,.4); transform:translateY(-3px); }
  .fx-fonte__logo { width:40px; height:40px; object-fit:contain; flex:none; }
  .fx-fonte__txt { flex:1; min-width:0; display:grid; gap:2px; line-height:1.35; }
  .fx-fonte__txt strong { font-size:.88rem; color:#000; }
  .fx-fonte__txt span { font-size:.88rem; color:#515151; }
  .fx-fonte__nota { display:flex; align-items:center; gap:8px; flex:none; }
  .fx-fonte__nota b { font-family:var(--font-disp); font-weight:400; font-size:1.65rem; line-height:1; color:#141212; padding-top:2px; }
  .fx-fonte__bola { width:14px; height:14px; border-radius:50%; background:#39DFA2; }
  .fx-fonte__estrela { width:17px; height:17px; fill:#FFCE00; }
  [data-reveal] .fx-fonte { opacity:0; transform:translateY(16px); transition:opacity .7s var(--ease), transform .7s var(--ease), border-color .35s var(--ease), box-shadow .35s var(--ease);
    transition-delay:calc(var(--i,0) * 90ms + 350ms); }
  [data-reveal].is-in .fx-fonte { opacity:1; transform:none; }
  [data-reveal].is-in .fx-fonte:hover { transform:translateY(-3px); transition-delay:0s; }

  /* fotos */
  .fx-bento { display:grid; grid-template-columns:repeat(4,1fr); grid-auto-rows:150px; gap:10px; }
  .fx-bento__item { position:relative; padding:0; border:0; cursor:zoom-in; border-radius:18px; overflow:hidden; background:var(--light); }
  .fx-bento__item:first-child { grid-column:span 2; grid-row:span 2; }
  .fx-bento__item img { width:100%; height:100%; object-fit:cover; transition:transform 1s var(--ease); }
  .fx-bento__item:hover img { transform:scale(1.08); }
  .fx-bento__mais { position:absolute; inset:0; z-index:1; display:grid; place-items:center; background:rgba(13,17,27,.55); color:#fff;
    font-family:var(--font-disp); font-size:2rem; }
  .fx-credito { position:absolute; z-index:1; left:10px; bottom:10px; background:rgba(13,17,27,.55); color:#fff; font-size:10.5px; padding:3px 9px;
    border-radius:999px; pointer-events:none; backdrop-filter:blur(6px); -webkit-backdrop-filter:blur(6px); }

  /* horário */
  .fx-horas { list-style:none; margin:0; padding:0; max-width:560px; display:grid; gap:4px; }
  .fx-horas li { display:flex; justify-content:space-between; gap:16px; padding:12px 16px; border-radius:14px; transition:background .3s var(--ease); }
  .fx-horas li:hover { background:var(--light); }
  .fx-horas__d { font-weight:600; }
  .fx-horas__v { color:var(--muted); text-align:right; }
  .fx-horas li.hoje { background:var(--pink); }
  .fx-horas li.hoje .fx-horas__d, .fx-horas li.hoje .fx-horas__v { color:var(--red); font-weight:700; }
  .fx-horas li.hoje .fx-horas__d::after { content:"Hoje"; margin-left:10px; font-size:11px; color:#fff; background:var(--red); border-radius:999px;
    padding:2px 8px; vertical-align:2px; }
  .fx-rodape-sec { margin-top:14px !important; font-size:.82rem !important; }

  /* mapa */
  .fx-mapa { position:relative; border-radius:24px; overflow:hidden; background:var(--light); box-shadow:0 0 0 1px var(--line); }
  .fx-mapa iframe { display:block; width:100%; height:340px; border:0; }
  .fx-mapa__card { position:absolute; left:14px; bottom:14px; right:14px; max-width:460px; display:flex; gap:10px; align-items:flex-start;
    background:rgba(255,255,255,.95); backdrop-filter:blur(10px); -webkit-backdrop-filter:blur(10px); border-radius:16px; padding:12px 14px;
    font-size:.88rem; font-weight:600; box-shadow:0 12px 30px -16px rgba(13,17,27,.45); }
  .fx-mapa__card .fx-ic { color:var(--red); }
  .fx-endereco { color:var(--ink) !important; font-weight:600; }
  .fx-chegar { list-style:none; padding:0; margin:16px 0 0; display:grid; gap:8px; }
  .fx-chegar li { display:flex; gap:10px; align-items:center; color:var(--muted); }
  .fx-chegar .fx-ic { width:18px; height:18px; color:var(--red); }

  /* guias e pílulas (peças da home, só ajustes) */
  .fx-guias { grid-template-columns:repeat(auto-fill,minmax(200px,1fr)); }
  .fx-xb { gap:8px; }
  .fx-xb b { font-family:var(--font-disp); font-weight:400; color:var(--red); }

  /* coluna lateral */
  .fx-lado { position:sticky; top:170px; padding-top:clamp(48px,6vw,72px); }
  .fx-cartao { border-radius:28px; padding:22px; background:#fff; box-shadow:0 30px 60px -34px rgba(13,17,27,.35), 0 0 0 1px var(--line); }
  .fx-agora { display:flex; align-items:center; gap:10px; font-size:.95rem; padding:12px 14px; border-radius:16px; background:var(--light); margin-bottom:6px; }
  .fx-agora b { font-weight:700; }
  .fx-agora__ponto { position:relative; width:10px; height:10px; border-radius:50%; background:#C9CCD3; flex:none; }
  .fx-agora.aberto { background:#E9F7EF; }
  .fx-agora.aberto b { color:#1F9D55; }
  .fx-agora.aberto .fx-agora__ponto { background:#1F9D55; }
  .fx-agora.aberto .fx-agora__ponto::after { content:""; position:absolute; inset:-5px; border-radius:50%; border:2px solid #1F9D55; animation:fxPulso 1.8s var(--ease) infinite; }
  .fx-agora.fechado { background:var(--pink); }
  .fx-agora.fechado b { color:var(--red); }
  .fx-agora.fechado .fx-agora__ponto { background:var(--red); }
  @keyframes fxPulso { from { transform:scale(.6); opacity:1; } to { transform:scale(1.8); opacity:0; } }
  .fx-info { display:flex; gap:12px; align-items:flex-start; padding:13px 6px; border-bottom:1px solid var(--line); font-size:.94rem; }
  .fx-info .fx-ic { margin-top:2px; color:var(--red); }
  .fx-info__r { display:block; font-size:.72rem; color:#9AA0A8; font-weight:700; text-transform:uppercase; letter-spacing:.06em; }
  .fx-info a { color:var(--ink); font-weight:600; word-break:break-word; background:linear-gradient(var(--red),var(--red)) 0 100%/0 1.5px no-repeat;
    transition:background-size .45s var(--ease), color .3s var(--ease); }
  .fx-info a:hover { color:var(--red); background-size:100% 1.5px; }
  .fx-cartao__cta { padding-top:18px; display:grid; gap:12px; }
  .fx-btn-bloco { width:100%; }
  .fx-lojas { display:flex; justify-content:center; gap:18px; font-size:.84rem; font-weight:600; }
  .fx-lojas a { color:var(--muted); transition:color .3s var(--ease); }
  .fx-lojas a:hover { color:var(--red); }

  /* barra fixa de download */
  .fx-barra-app { position:fixed; z-index:90; left:50%; bottom:calc(16px + env(safe-area-inset-bottom)); width:min(620px, calc(100% - 20px));
    display:flex; align-items:center; gap:14px; padding:10px 10px 10px 12px; border-radius:26px; background:rgba(13,17,27,.9); color:#fff;
    backdrop-filter:blur(18px) saturate(160%); -webkit-backdrop-filter:blur(18px) saturate(160%);
    box-shadow:0 24px 48px -20px rgba(0,0,0,.6), inset 0 0 0 1px rgba(255,255,255,.06);
    transform:translate(-50%, calc(100% + 40px)); transition:transform .8s var(--ease); }
  .fx-barra-app.visivel { transform:translate(-50%, 0); }
  .fx-barra-app__selo { flex:none; width:44px; height:44px; border-radius:14px; background:#fff url(/assets/img/seal.svg) center/30px no-repeat;
    animation:fxSelo 7s var(--ease) infinite; }
  @keyframes fxSelo { 0%, 86%, 100% { transform:rotate(0); } 90% { transform:rotate(-14deg) scale(1.06); } 95% { transform:rotate(10deg); } }
  .fx-barra-app p { margin:0; flex:1; min-width:0; line-height:1.3; }
  .fx-barra-app strong { display:block; font-size:.95rem; }
  .fx-barra-app p span { display:block; font-size:.8rem; color:rgba(255,255,255,.62); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .fx-barra-app__baixar { flex:none; height:46px; min-width:0; padding:0 22px; font-size:18px; overflow:hidden; }
  .fx-barra-app__baixar::after { content:""; position:absolute; top:0; bottom:0; left:-60%; width:40%; transform:skewX(-20deg);
    background:linear-gradient(90deg, transparent, rgba(255,255,255,.45), transparent); animation:fxBrilho 4.5s var(--ease) infinite 1.5s; }
  @keyframes fxBrilho { 0% { left:-60%; } 30%, 100% { left:130%; } }
  @media (max-width:900px) {
    .fx-barra-app { bottom:calc(10px + env(safe-area-inset-bottom)); gap:12px; border-radius:22px; }
    .fx-barra-app__selo { width:40px; height:40px; border-radius:12px; background-size:26px; }
    .fx-barra-app strong { font-size:.88rem; }
    .fx-barra-app p span { font-size:.75rem; }
    .fx-barra-app__baixar { height:42px; padding:0 18px; font-size:16px; }
  }

  /* visualizador */
  .fx-lb { position:fixed; inset:0; z-index:200; display:flex; align-items:center; justify-content:center; background:rgba(8,10,16,.94);
    opacity:0; transition:opacity .35s var(--ease); }
  .fx-lb[hidden] { display:none; }
  .fx-lb.aberto { opacity:1; }
  .fx-lb__fig { margin:0; max-width:min(92vw,1200px); text-align:center; }
  .fx-lb__fig img { max-width:100%; max-height:82vh; border-radius:18px; display:block; margin:0 auto; }
  .fx-lb.troca .fx-lb__fig img { animation:fxEntra .55s var(--ease); }
  @keyframes fxEntra { from { opacity:0; transform:scale(.95); } to { opacity:1; transform:none; } }
  .fx-lb__fig figcaption { color:rgba(255,255,255,.6); font-size:12.5px; margin-top:10px; }
  .fx-lb button { border:0; background:rgba(255,255,255,.1); color:#fff; border-radius:50%; width:48px; height:48px; display:grid; place-items:center;
    cursor:pointer; transition:background .3s var(--ease), transform .3s var(--ease); }
  .fx-lb button:hover { background:rgba(255,255,255,.22); transform:scale(1.06); }
  .fx-lb__x { position:absolute; top:18px; right:18px; }
  .fx-lb__nav { position:absolute; top:50%; margin-top:-24px; }
  .fx-lb__nav--esq { left:18px; } .fx-lb__nav--dir { right:18px; }
  .fx-lb__cont { position:absolute; top:30px; left:0; right:0; text-align:center; color:rgba(255,255,255,.7); font-size:13px; font-weight:600; pointer-events:none; }

  @media (max-width:1060px) { .fx-grade { grid-template-columns:minmax(0,1fr) 320px; } }
  @media (max-width:900px) {
    .fx-grade { grid-template-columns:1fr; gap:0; }
    .fx-lado { position:static; order:-1; }
    .fx-aval { grid-template-columns:1fr; }
    .fx-abas { top:76px; padding-top:40px; justify-content:flex-start; }
  }
  @media (max-width:640px) {
    .fx-titulo { font-size:clamp(2.5rem,12vw,3.4rem); }
    .fx-acoes .btn { flex:1 1 100%; }
    .fx-hero__credito { bottom:auto; top:96px; }
    .fx-bento { grid-template-columns:repeat(2,1fr); grid-auto-rows:130px; }
    .fx-take__aspas { font-size:130px; top:-20px; }
    .fx-lb__nav { display:none !important; }
    .fx-abas { padding-inline:12px; }
    .fx-linha { flex-direction:column; align-items:flex-start; gap:4px; }
    .fx-linha__sep { display:none; }
  }
  @media (prefers-reduced-motion:reduce) {
    [data-reveal] .fx-prato, [data-reveal] .fx-bento__item, [data-reveal] .fx-check .chip, [data-reveal] .fx-fonte { opacity:1 !important; transform:none !important; transition:none !important; }
    .fx-nota__barra i::after { transform:scaleX(var(--v)) !important; transition:none !important; }
    .fx-agora.aberto .fx-agora__ponto::after, .fx-barra-app__selo, .fx-barra-app__baixar::after { animation:none; }
  }
`;
