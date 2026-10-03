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

import { TITULOS_DE_BUSCA } from './_lib/titulos-de-busca.js';
import { cartao, CSS_CARTAO } from './_lib/cartao.js';
import { COZINHAS, aSlug, MINIMO, destinoFixo } from './_lib/taxonomia.js';
import { OCASIOES, COLS_OCASIAO, contarOcasioes, atende } from './_lib/ocasioes.js';
import { notasComunidade, fmtNota } from './_lib/notas.js';
import { layoutRestaurante, CSS_FICHA, JS_FICHA, ASSETS_HOME, srcsetCapa } from './_lib/ficha.js';
import { fontesExternas } from './_lib/avaliacoes-externas.js';

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
const APP_STORE_ID = '6791353216';
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
    // rating_score/review_count são a nota do Google Maps: entram SÓ no card
    // visível de "Avaliações externas" (avaliacoes-externas.js), nunca no
    // schema — o Google proíbe agregar nota de outro site (ver fichaRestaurante).
    const COLS = 'id,name,slug,share_slug,hero_image,address,phone,instagram,menu_url,website,price_level,lat,lng,city_id,hours_periods,amenities,rating_score,review_count,google_place_id,catalog_json';
    const r =
      (await sb(
        `restaurants?share_slug=eq.${encodeURIComponent(slug)}&is_active=eq.true&select=${COLS}&limit=1`,
      )) ||
      (await sb(
        `restaurants?slug=eq.${encodeURIComponent(slug)}&is_active=eq.true&select=${COLS}&limit=1`,
      ));
    if (!r) return null;
    const [viz, notas] = await Promise.all([vizinhanca(r), notasComunidade()]);
    return fichaRestaurante(r, viz, notas);
  }

  if (type === 'g') {
    const g = await sb(
      `lists?slug=eq.${encodeURIComponent(slug)}&is_curated=eq.true&is_public=eq.true&select=id,title,slug,cover,subtitle,intro&limit=1`,
    );
    if (!g) return null;
    const [itens, outros, notas, bairrosDoCatalogo] = await Promise.all([
      sbAll(
        `list_restaurants?list_id=eq.${encodeURIComponent(g.id)}&select=position,restaurants(name,slug,share_slug,hero_image,address,price_level,hours_periods,amenities,catalog_json)&order=position.asc&limit=200`,
      ),
      // Outros guias, para a página não ser beco sem saída: quem leu um guia
      // inteiro é exatamente quem abre o próximo.
      sbAll(
        `lists?is_curated=eq.true&is_public=eq.true&slug=neq.${encodeURIComponent(g.slug)}&select=title,slug&order=updated_at.desc&limit=6`,
      ),
      notasComunidade(),
      // Quantos lugares cada bairro tem no catálogo: diz se a página do bairro
      // existe (piso MINIMO.bairro) antes de linkar para ela.
      sbAll('restaurants?is_active=eq.true&select=catalog_json->>neighborhood&limit=2000'),
    ]);
    const nBairro = {};
    for (const x of bairrosDoCatalogo) if (x.neighborhood) nBairro[x.neighborhood] = (nBairro[x.neighborhood] || 0) + 1;
    return fichaGuia(g, itens, outros, notas, nBairro);
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
      // Lista de usuário é prévia de compartilhamento, não página de busca:
      // conteúdo raso e criado por terceiros não deve disputar o índice com
      // os guias editoriais.
      noindex: true,
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
      noindex: true, // mesmo motivo das listas de usuário
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

/**
 * O entorno de uma ficha: em que guias ela aparece, se o bairro e a cozinha
 * dela têm página própria, e outras casas do mesmo bairro.
 *
 * Existe por um motivo de busca bem concreto: até aqui a ficha só linkava
 * para a home, e as ~515 fichas viviam como folhas soltas — o Google só as
 * achava pelo sitemap. Com isto cada ficha passa a apontar para as páginas
 * que a contêm e para as vizinhas, e a árvore do site fecha.
 *
 * Só linka página que EXISTE: bairro e cozinha seguem o mesmo piso (MINIMO)
 * que decide se a página nasce ou dá 404. Link interno para 404 é pior do
 * que nenhum link.
 *
 * Falha aqui nunca derruba a ficha: cada consulta cai em lista vazia.
 */
async function vizinhanca(r) {
  const c = r.catalog_json || {};
  const bairro = c.neighborhood || '';
  const cozinha = c.cuisine || '';
  const [guias, doBairro, daCozinha, cidades, ativos] = await Promise.all([
    r.id
      ? sbAll(
          `list_restaurants?restaurant_id=eq.${encodeURIComponent(r.id)}&select=lists!inner(title,slug,is_curated,is_public)&lists.is_curated=eq.true&lists.is_public=eq.true&limit=8`,
        )
      : [],
    bairro
      ? sbAll(
          `restaurants?is_active=eq.true&catalog_json->>neighborhood=eq.${encodeURIComponent(bairro)}&select=name,slug,share_slug,catalog_json->>sello_score,catalog_json->>neighborhood,${COLS_OCASIAO}&limit=300`,
        )
      : [],
    cozinha && COZINHAS[cozinha] && !destinoFixo(COZINHAS[cozinha])
      ? sbAll(
          `restaurants?is_active=eq.true&catalog_json->>cuisine=eq.${encodeURIComponent(cozinha)}&select=slug&limit=300`,
        )
      : [],
    // A cidade sai do dado (restaurants.city_id → cities), nunca do código.
    r.city_id ? sbAll(`cities?id=eq.${encodeURIComponent(r.city_id)}&select=name,state&limit=1`) : [],
    // Para a posição na cidade: a nota vem de todos os restaurantes, inclusive
    // os desativados; o ranking só conta quem está no ar.
    sbAll('restaurants?is_active=eq.true&select=slug&limit=5000'),
  ]);

  const paginaBairro = doBairro.length >= MINIMO.bairro ? '/onde-comer/' + aSlug(bairro) : '';
  // Cozinha com guia editorial aponta para o guia (é para lá que a página de
  // cozinha redireciona, de propósito, para não canibalizar).
  const tax = COZINHAS[cozinha];
  const paginaCozinha = tax
    ? destinoFixo(tax)
      ? destinoFixo(tax)
      : daCozinha.length >= MINIMO.cozinha
        ? '/restaurantes/' + tax.slug
        : ''
    : '';

  const vizinhos = doBairro
    .filter((v) => v.slug !== r.slug && v.name)
    .sort((a, b) => Number(b.sello_score || 0) - Number(a.sello_score || 0))
    .slice(0, 4);

  /* As ocasiões que ESTE lugar atende e que têm página no bairro dele — "abertos
   * no domingo em Pinheiros". Mesma conta da rota, então nunca linka 404. */
  const oc = contarOcasioes(doBairro, MINIMO);
  const ocasioes = bairro
    ? Object.keys(OCASIOES)
        .filter((o) => atende(o, r) && oc.existeBairro(o, bairro))
        .map((o) => ({ href: '/ocasioes/' + o + '/' + aSlug(bairro), txt: OCASIOES[o].titulo(' em ' + bairro) }))
    : [];

  return {
    cidade: cidades[0] && cidades[0].name ? { nome: cidades[0].name, uf: cidades[0].state || '' } : null,
    slugsDoBairro: doBairro.map((v) => v.slug),
    slugsAtivos: ativos.map((v) => v.slug),
    ocasioes,
    guias: guias.map((g) => g.lists).filter((l) => l && l.slug && l.title),
    paginaBairro,
    paginaCozinha,
    pluralCozinha: tax ? tax.plural : '',
    vizinhos,
  };
}

/** ['a','b','c'] → "a, b e c". */
function juntar(arr) {
  return arr.length < 2 ? arr.join('') : arr.slice(0, -1).join(', ') + ' e ' + arr[arr.length - 1];
}

const DIAS_SCHEMA = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
/** "0130" → "01:30". */
const hhmm = (t) => String(t || '').padStart(4, '0').replace(/^(\d\d)(\d\d)$/, '$1:$2');

/**
 * "Em resumo" — o parágrafo de fatos no topo da ficha.
 *
 * É o trecho que um assistente de IA (ou o resumo do Google) copia quando
 * alguém pergunta "o X abre domingo?", "quanto custa?", "o que pedir lá?".
 * O resto da ficha responde também, mas espalhado em seções; aqui fica tudo
 * em frases inteiras, que é o formato que essas ferramentas extraem e citam.
 *
 * Só fato do dado, e cada frase some quando o dado não existe. Sem horário
 * publicado, nada se diz sobre domingo: ausência de dado não é prova (regra
 * do catálogo).
 */
function resumo(r, c, d) {
  const out = [];
  const onde = [d.bairro, d.cidade && d.cidade.nome].filter(Boolean).join(', ');
  if (onde) out.push(r.name + ' fica em ' + onde + '.');
  if (d.cozinha) out.push('Categoria no Sello: ' + d.cozinha + '.');
  if (d.preco) out.push('Faixa de preço: ' + d.preco + ', numa escala de $ a $$$$.');
  if (d.nc) {
    out.push('Nota da comunidade do Sello: ' + fmtNota(d.nc.media) + ' de 10, com ' + d.nc.votos +
      (d.nc.votos === 1 ? ' avaliação.' : ' avaliações.'));
  }
  const pratos = ((c.dishes && c.dishes.must_order) || []).filter((x) => x && x.name).slice(0, 3).map((x) => x.name);
  if (pratos.length) out.push('Para pedir: ' + juntar(pratos) + '.');

  const periodos = r.hours_periods || c.hours_periods || [];
  if (periodos.length) {
    const h = [];
    h.push(atende('aberto-domingo', r) ? 'abre aos domingos' : 'não abre aos domingos');
    if (atende('almoco', r)) h.push('serve almoço em dia de semana');
    if (atende('aberto-ate-tarde', r)) h.push('fica aberto depois da meia-noite em algum dia');
    out.push('Pelo horário publicado, ' + juntar(h) + '.');
  }
  const registros = [
    atende('ao-ar-livre', r) ? 'mesas ao ar livre' : '',
    atende('vegetariano', r) ? 'opções vegetarianas' : '',
    atende('com-criancas', r) ? 'estrutura para crianças' : '',
    atende('pet-friendly', r) ? 'aceitar pets' : '',
  ].filter(Boolean);
  if (registros.length) out.push('Há registro de ' + juntar(registros) + '.');
  const nGuias = (d.guias || []).length;
  if (nGuias) out.push('Aparece em ' + nGuias + (nGuias === 1 ? ' guia' : ' guias') + ' do Sello.');
  return out.length > 1 ? '<section class="resumo"><h2>Em resumo</h2><p>' + esc(out.join(' ')) + '</p></section>' : '';
}

function fichaRestaurante(r, viz = {}, notas = new Map()) {
  const c = r.catalog_json || {};
  const cozinha = c.cuisine || c.sello_primary_category || '';
  const bairro = c.neighborhood || '';
  const preco = cifroes(c.price_range != null ? c.price_range : r.price_level);
  // Nota da comunidade, a mesma do app (api/notas.js). Sem avaliação, sem nota.
  const nc = notas.get(r.slug) || null;
  const path = '/r/' + (r.share_slug || r.slug);

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
  const linkGuias = (viz.guias || [])
    .map((g) => '<li><a href="/g/' + esc(g.slug) + '">' + esc(g.title) + '</a></li>')
    .join('');
  const linkVizinhos = (viz.vizinhos || [])
    .map((v) => {
      const vn = notas.get(v.slug);
      const n = vn ? fmtNota(vn.media) : '';
      return '<li><a href="/r/' + esc(v.share_slug || v.slug) + '">' + esc(v.name) + '</a>' +
        (n ? ' <span class="meta">· nota ' + esc(n) + '</span>' : '') + '</li>';
    })
    .join('');
  const explorar = [
    viz.paginaBairro ? '<li><a href="' + esc(viz.paginaBairro) + '">Onde comer em ' + esc(bairro) + '</a></li>' : '',
    ...(viz.ocasioes || []).map((o) => '<li><a href="' + esc(o.href) + '">' + esc(o.txt) + '</a></li>'),
    viz.paginaCozinha && viz.pluralCozinha
      ? '<li><a href="' + esc(viz.paginaCozinha) + '">Mais ' + esc(viz.pluralCozinha) + '</a></li>'
      : '',
    '<li><a href="/guias">Todos os guias do Sello</a></li>',
  ].filter(Boolean).join('');

  const resumoHtml = resumo(r, c, { bairro, cozinha, preco, nc, cidade: viz.cidade, guias: viz.guias });

  /* Posição pela nota da comunidade (ver linhaPosicao em ficha.js). No bairro
   * quando ele tem ao menos 5 lugares na conta — "Nº 1 de 2" não diz nada —,
   * senão na cidade. */
  const MIN_VOTOS = 3;
  const ranking = (slugs) => slugs
    .map((s) => [s, notas.get(s)])
    .filter(([, n]) => n && n.votos >= MIN_VOTOS)
    .sort((a, b) => b[1].media - a[1].media || b[1].votos - a[1].votos);
  let posicao = null;
  const noBairro = ranking(viz.slugsDoBairro || []);
  const iB = noBairro.findIndex(([s]) => s === r.slug);
  if (iB >= 0 && noBairro.length >= 5) {
    posicao = { n: iB + 1, total: noBairro.length, onde: 'em ' + bairro, href: viz.paginaBairro || '' };
  } else {
    const naCidade = ranking(viz.slugsAtivos || []);
    const iC = naCidade.findIndex(([s]) => s === r.slug);
    if (iC >= 0 && naCidade.length >= 5) {
      posicao = { n: iC + 1, total: naCidade.length, onde: viz.cidade ? 'em ' + viz.cidade.nome : 'no Sello', href: '/guias' };
    }
  }
  const trilhaFicha = [{ name: 'Início', url: '/' }];
  if (viz.paginaBairro) trilhaFicha.push({ name: bairro, url: viz.paginaBairro });
  trilhaFicha.push({ name: r.name });
  const main = layoutRestaurante(r, c, {
    cozinha, bairro, nc, posicao, cidade: viz.cidade,
    externas: fontesExternas(r, c),
    deepLink: 'sello://restaurant/' + r.slug,
    appStore: APP_STORE, playStore: PLAY_STORE,
    guias: viz.guias || [],
    resumoHtml,
    trilhaHtml: '<nav class="trilha" aria-label="Você está em">' + trilhaFicha.map((t, i, a) =>
      i === a.length - 1 ? '<span>' + esc(t.name) + '</span>' : '<a href="' + esc(t.url) + '">' + esc(t.name) + '</a>',
    ).join(' <span aria-hidden="true">›</span> ') + '</nav>',
    vizinhos: (viz.vizinhos || []).map((v) => {
      const vn = notas.get(v.slug);
      return { href: '/r/' + (v.share_slug || v.slug), txt: v.name, nota: vn ? fmtNota(vn.media) : '' };
    }),
    explorar: [
      viz.paginaBairro ? { href: viz.paginaBairro, txt: 'Onde comer em ' + bairro } : null,
      ...(viz.ocasioes || []),
      viz.paginaCozinha && viz.pluralCozinha ? { href: viz.paginaCozinha, txt: 'Mais ' + viz.pluralCozinha } : null,
      { href: '/guias', txt: 'Todos os guias do Sello' },
    ].filter(Boolean),
  });

  const body = [
    resumoHtml,
    secao('O take do Sello', paragrafo(c.sello_take_body)),
    secao('Por que ir', lista(c.why_go)),
    secao('O que esperar', paragrafo(c.what_to_expect)),
    pratos ? '<section><h2>O que pedir</h2><ul>' + pratos + '</ul></section>' : '',
    secao('O que a comunidade diz', paragrafo(c.community_summary)),
    horarios ? '<section><h2>Horários</h2><table>' + horarios + '</table></section>' : '',
    contato ? '<section><h2>Onde fica</h2><table>' + contato + '</table></section>' : '',
    linkGuias ? '<section><h2>Aparece nos guias</h2><ul class="links">' + linkGuias + '</ul></section>' : '',
    linkVizinhos && bairro
      ? '<section><h2>Também em ' + esc(bairro) + '</h2><ul class="links">' + linkVizinhos + '</ul></section>'
      : '',
    '<section><h2>Explore</h2><ul class="links">' + explorar + '</ul></section>',
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
    url: SITE + path,
  };
  if (r.hero_image) jsonld.image = r.hero_image;
  if (c.hook) jsonld.description = c.hook;
  if (cozinha) jsonld.servesCuisine = cozinha;
  if (preco) jsonld.priceRange = preco;
  if (r.phone) jsonld.telephone = r.phone;
  if (r.address) {
    jsonld.address = { '@type': 'PostalAddress', streetAddress: r.address, addressCountry: 'BR' };
    // Cidade e UF vêm de cities (via city_id) — campos separados de verdade.
    if (viz.cidade) {
      jsonld.address.addressLocality = viz.cidade.nome;
      if (viz.cidade.uf) jsonld.address.addressRegion = viz.cidade.uf;
    }
  }
  /* Horário estruturado: o mesmo dado da tabela "Horários" visível na página,
   * no formato que a busca entende ("aberto agora?", "abre domingo?"). */
  const periodos = (r.hours_periods || c.hours_periods || []).filter((p) => p && p.open && p.close);
  if (periodos.length) {
    jsonld.openingHoursSpecification = periodos.map((p) => ({
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: 'https://schema.org/' + DIAS_SCHEMA[p.open.day],
      opens: hhmm(p.open.time),
      closes: hhmm(p.close.time),
    }));
  }
  if (r.lat && r.lng) {
    jsonld.geo = { '@type': 'GeoCoordinates', latitude: r.lat, longitude: r.lng };
  }
  /* Até 02/10/2026 ia aqui a nota do Google Maps (rating_score/review_count,
   * ex.: 4,4 com 14.858 avaliações), que não aparecia na página. O Google
   * proíbe as duas coisas — agregar nota de outro site e marcar conteúdo
   * invisível. Agora o aggregateRating é a nota da COMUNIDADE do Sello:
   * avaliações feitas aqui, por usuários, e visíveis no selo da página com o
   * número de votos. É o caso que o Google aceita para um site de avaliações. */
  if (nc) {
    jsonld.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: Number(nc.media.toFixed(1)),
      bestRating: 10,
      worstRating: 0,
      ratingCount: nc.votos,
    };
  }

  // Trilha: Início › bairro › restaurante. Só entra o degrau que tem página.
  const trilha = [{ name: 'Início', url: SITE + '/' }];
  if (viz.paginaBairro) trilha.push({ name: bairro, url: SITE + viz.paginaBairro });
  trilha.push({ name: r.name, url: SITE + path });

  return {
    title: title,
    description: description,
    image: r.hero_image,
    imageAlt: r.name,
    heading: r.name,
    kicker: [cozinha, bairro].filter(Boolean).join(' · ') || 'Restaurante',
    nota: nc ? fmtNota(nc.media) : '',
    votos: nc ? nc.votos : 0,
    deepLink: 'sello://restaurant/' + r.slug,
    path: path,
    trilha: trilha,
    body: body,
    main: main,
    jsonld: [jsonld, breadcrumbLd(trilha)],
  };
}

function breadcrumbLd(trilha) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: trilha.map((t, i) => ({ '@type': 'ListItem', position: i + 1, name: t.name, item: t.url })),
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

/**
 * "Em resumo" do guia: o que a lista tem, em números — onde ficam, quantos
 * abrem no domingo, quanto custam, que nota a comunidade dá. É o parágrafo que
 * responde "esse guia serve para mim?" e o que um assistente cita. Só conta;
 * não opina — a opinião é o intro da curadoria, logo acima.
 */
function resumoGuia(restaurantes, notas) {
  const n = restaurantes.length;
  if (n < 3) return '';
  const cont = {};
  for (const r of restaurantes) {
    const b = r.catalog_json && r.catalog_json.neighborhood;
    if (b) cont[b] = (cont[b] || 0) + 1;
  }
  const top = Object.entries(cont).sort((x, y) => y[1] - x[1] || x[0].localeCompare(y[0], 'pt-BR')).filter((e) => e[1] >= 2).slice(0, 3);
  const out = [];
  out.push(n + ' lugares' + (top.length ? ', com mais presença em ' + juntar(top.map((e) => e[0] + ' (' + e[1] + ')')) : '') + '.');

  const comHorario = restaurantes.filter((r) => (r.hours_periods || (r.catalog_json && r.catalog_json.hours_periods) || []).length);
  if (comHorario.length) {
    const dom = comHorario.filter((r) => atende('aberto-domingo', r)).length;
    const tarde = comHorario.filter((r) => atende('aberto-ate-tarde', r)).length;
    const h = [dom + (dom === 1 ? ' abre' : ' abrem') + ' no domingo'];
    if (tarde) h.push(tarde + (tarde === 1 ? ' fica aberto' : ' ficam abertos') + ' depois da meia-noite em algum dia');
    out.push('Pelo horário publicado, ' + juntar(h) + '.');
  }
  const faixas = {};
  for (const r of restaurantes) {
    const c = r.catalog_json || {};
    const f = cifroes(c.price_range != null ? c.price_range : r.price_level);
    if (f) faixas[f] = (faixas[f] || 0) + 1;
  }
  const faixa = Object.entries(faixas).sort((x, y) => y[1] - x[1])[0];
  if (faixa && faixa[1] * 3 >= n) out.push('Faixa de preço mais comum: ' + faixa[0] + '.');
  const avaliados = restaurantes.map((r) => notas.get(r.slug)).filter(Boolean);
  if (avaliados.length >= 3) {
    const media = avaliados.reduce((a, x) => a + x.media, 0) / avaliados.length;
    out.push('Nota média da comunidade: ' + fmtNota(media) + ', entre os ' + avaliados.length + ' lugares já avaliados.');
  }
  return '<section class="resumo"><h2>Em resumo</h2><p>' + esc(out.join(' ')) + '</p></section>';
}

function fichaGuia(g, itens, outros = [], notas = new Map(), nBairro = {}) {
  /* Mesmo cartao das paginas de descoberta: foto, nota, faixa de preco,
   * endereco e horario de hoje. Uma lista de nomes nao ajuda ninguem a decidir
   * onde jantar, e o dado para decidir ja estava no catalogo. */
  const restaurantes = (itens || [])
    .map((it) => it && it.restaurants)
    .filter((r) => r && r.name);
  const linhas = restaurantes.map((r) => cartao(r, notas));

  /* O <title> usa o titulo de BUSCA quando existe; o nome editorial segue
   * como heading (o H1 que a pessoa le). Sao campos diferentes de proposito:
   * "Nao e miojo" e bom nome e pessima busca, e nao ha motivo para escolher
   * entre os dois. Guia sem entrada no mapa cai no nome editorial. */
  const title = (TITULOS_DE_BUSCA[g.slug] || g.title) + ' | Guia do Sello';

  /* `intro` é escrito pela curadoria e é diferente em cada guia — era isso que
   * devia estar na descrição desde o começo, em vez da frase única. */
  const description =
    g.intro ||
    g.subtitle ||
    'Uma seleção do Sello com ' + linhas.length + ' restaurantes escolhidos pela curadoria.';

  /* O intro NÃO entra no corpo: ele já é o parágrafo de abertura da página,
   * e repetir o mesmo texto duas vezes na mesma tela é o tipo de duplicação
   * que esta mudança existe para acabar. A lista é o conteúdo do guia. */
  const maisGuias = (outros || [])
    .filter((o) => o && o.slug && o.title)
    .map((o) => '<li><a href="/g/' + esc(o.slug) + '">' + esc(o.title) + '</a></li>')
    .join('');
  /* Os bairros do guia que têm página própria: quem gostou da lista e mora
   * (ou vai estar) num deles continua por ali. Só linka página que existe. */
  const bairrosDoGuia = [...new Set(restaurantes.map((r) => r.catalog_json && r.catalog_json.neighborhood).filter(Boolean))]
    .filter((b) => (nBairro[b] || 0) >= MINIMO.bairro)
    .sort((x, y) => x.localeCompare(y, 'pt-BR'))
    .map((b) => '<li><a href="/onde-comer/' + esc(aSlug(b)) + '">Onde comer em ' + esc(b) + '</a></li>')
    .join('');
  const body = [
    resumoGuia(restaurantes, notas),
    linhas.length
      ? '<section><h2>Os restaurantes deste guia</h2>' + linhas.join('') + '</section>'
      : '',
    bairrosDoGuia ? '<section><h2>Por bairro</h2><ul class="links">' + bairrosDoGuia + '</ul></section>' : '',
    '<section><h2>Outros guias</h2><ul class="links">' + maisGuias +
      '<li><a href="/guias">Ver todos os guias</a></li></ul></section>',
  ].filter(Boolean).join('');
  const path = '/g/' + g.slug;
  const trilha = [
    { name: 'Início', url: SITE + '/' },
    { name: 'Guias', url: SITE + '/guias' },
    { name: g.title, url: SITE + path },
  ];

  /* ItemList é o schema que descreve exatamente o que um guia é: uma lista
   * ordenada de lugares. Sem inventar tipo que não se aplica. */
  const jsonld = linhas.length
    ? {
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        name: g.title,
        description: description,
        numberOfItems: linhas.length,
        itemListElement: restaurantes.map((r, i) => ({
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
    imageAlt: g.title,
    heading: g.title,
    kicker: g.subtitle || 'Guia do Sello',
    deepLink: 'sello://list/' + g.slug,
    path: path,
    trilha: trilha,
    body: body,
    jsonld: [jsonld, breadcrumbLd(trilha)].filter(Boolean),
  };
}

/* Estilo das páginas que NÃO são a ficha nova (cartão de compartilhamento,
 * guias, listas, perfis). A ficha usa o css/sello.css da home + CSS_FICHA. */
const CSS_PAGINA = `  :root { --red:#E30F2F; --ink:#0D111B; --muted:#4D5461; }
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
  .foot { margin-top:40px; text-align:center; font-size:13px; display:flex; gap:18px; justify-content:center; flex-wrap:wrap; }
  .foot a { color:var(--muted); }
  .trilha { font-size:13px; color:var(--muted); margin:18px 0 0; }
  .trilha a { color:var(--muted); }
  .titulo { display:flex; align-items:flex-start; justify-content:space-between; gap:16px; }
  .nota { flex:none; background:var(--red); color:#fff; border-radius:10px; padding:6px 10px 5px;
          text-align:center; font-family:'Anton SC',sans-serif; font-size:24px; line-height:1; }
  .nota small { display:block; font-family:'Open Sans',sans-serif; font-weight:700; font-size:9px;
                letter-spacing:.08em; margin-top:4px; }
  ul.links { list-style:none; padding:0; }
  ul.links li { padding:6px 0; }
  ul.links a { color:var(--ink); font-weight:600; }
`;

function page(data, canonical) {
  const img = data.image || OG_FALLBACK;
  const lds = (Array.isArray(data.jsonld) ? data.jsonld : [data.jsonld]).filter(Boolean);
  // Trilha visível. O último degrau é a própria página: texto, não link.
  const trilha = (data.trilha || []).length > 1
    ? '<nav class="trilha" aria-label="Você está em">' +
      data.trilha.map((t, i, a) =>
        i === a.length - 1 ? '<span>' + esc(t.name) + '</span>' : '<a href="' + esc(t.url.replace(SITE, '') || '/') + '">' + esc(t.name) + '</a>',
      ).join(' <span aria-hidden="true">›</span> ') +
      '</nav>'
    : '';
  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(data.title)}</title>
<meta name="description" content="${esc(data.description)}" />
<link rel="canonical" href="${esc(canonical)}" />
${data.noindex ? '<meta name="robots" content="noindex, follow" />' : ''}
<meta name="apple-itunes-app" content="app-id=${APP_STORE_ID}, app-argument=${esc(canonical)}" />
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
${lds.map((ld) => '<script type="application/ld+json">' + JSON.stringify(ld).replace(/</g, '\\u003c') + '</script>').join('\n')}
<link rel="icon" href="/favicon.svg" />
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Anton+SC&family=Open+Sans:ital,wght@0,400;0,600;0,700;0,800;1,400&display=swap" rel="stylesheet" />
${data.main
  ? '<link rel="stylesheet" href="' + ASSETS_HOME.css + '" />\n<style>' + CSS_FICHA + '</style>\n' +
    (data.image ? '<link rel="preload" as="image" imagesrcset="' + esc(srcsetCapa(data.image)) + '" imagesizes="100vw" fetchpriority="high" />' : '')
  : '<style>' + CSS_PAGINA + CSS_CARTAO + '</style>'}
</head>
${data.main ? `<body>
${data.main}
<script src="${ASSETS_HOME.lenis}" defer></script>
<script src="${ASSETS_HOME.js}" defer></script>
<script>${JS_FICHA}</script>` : `<body class="${data.body ? 'ficha' : ''}">
  <main class="card">
    <img class="cover" src="${esc(img)}" alt="${esc(data.imageAlt || '')}" onerror="this.src='${esc(OG_FALLBACK)}'" />
    ${trilha}
    <div class="kicker">${esc(data.kicker)}</div>
    <div class="titulo">
      <h1>${esc(data.heading)}</h1>
      ${data.nota ? '<div class="nota" aria-label="Nota da comunidade: ' + esc(data.nota) + ' de 10, ' + esc(data.votos) + (data.votos === 1 ? ' avaliação' : ' avaliações') + '">' + esc(data.nota) + '<small>' + esc(data.votos) + (data.votos === 1 ? ' AVALIAÇÃO' : ' AVALIAÇÕES') + '</small></div>' : ''}
    </div>
    <p>${esc(data.description)}</p>
    <a class="cta primary" href="${esc(data.deepLink)}">Abrir no Sello</a>
    <div class="stores">
      <a class="cta" href="${APP_STORE}">App Store</a>
      <a class="cta" href="${PLAY_STORE}">Google Play</a>
    </div>
    ${data.body || ''}
    <div class="foot"><a href="/">Início</a><a href="/guias">Guias</a><a href="/sobre">Sobre o Sello</a></div>
  </main>`}
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
  // O mesmo vale para quem chega de um assistente de IA (ChatGPT, Perplexity,
  // Gemini, Copilot, Claude): veio ler. E só tenta no celular — no computador
  // não existe app para abrir, e o navegador mostra erro de esquema.
  // ATENÇÃO: isto mora dentro de uma template string do servidor. Barra
  // invertida de regex vai DOBRADA aqui, senão a template come a barra, o "//"
  // vira comentário e o script inteiro quebra — foi assim, em silêncio, até
  // 03/10/2026: nem este redirecionamento nem a medição abaixo rodavam.
  var origem = (document.referrer || '').replace(/^https?:\\/\\//, '').split('/')[0];
  var veioLer = /(^|\\.)(google|bing|duckduckgo|yahoo|ecosia|brave|chatgpt|openai|perplexity|gemini|copilot|claude|you)\\./i.test(origem);
  var celular = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent || '');
  if (celular && !veioLer && !/[?&]nr=1/.test(location.search)) {
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
    if (href === '#baixar' || /\\/(download|baixar|app)$/.test(href)) marcar('baixar_intencao', { pagina: pagina });
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

  /* Um restaurante, um endereço. O mesmo lugar responde por /r/r632 (id
   * antigo), /r/nome--r632 (link decorado do app) e /r/nome (o oficial), e
   * cada um se declarava canônico — o Google via três páginas iguais
   * dividindo os mesmos sinais. Agora o oficial vem do registro encontrado e
   * os outros redirecionam para ele com 301. Robôs de prévia (WhatsApp,
   * Instagram) seguem redirect, então link já compartilhado continua com
   * prévia. */
  if (data.path && data.path !== `/${type}/${slug}`) {
    const q = String(req.url || '').split('?')[1] || '';
    const extra = q.split('&').filter((p) => p && !/^(type|slug)=/.test(p)).join('&');
    res.setHeader('Location', SITE + data.path + (extra ? '?' + extra : ''));
    res.status(301).end();
    return;
  }
  res.status(200).send(page(data, data.path ? SITE + data.path : canonical));
}
