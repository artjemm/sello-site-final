/**
 * Páginas de descoberta — /onde-comer/:bairro, /restaurantes/:cozinha e
 * /restaurantes/:cozinha/:bairro.
 *
 * POR QUE EXISTEM
 * O site tinha ficha de restaurante e guia editorial, e nada no meio. Quem
 * busca "onde comer em Pinheiros" ou "japonês em Pinheiros" — que é como a
 * maioria das pessoas procura onde jantar — não encontrava porta nenhuma.
 * Um concorrente ranqueia nessas buscas com um post de blog de 2 mil palavras
 * e dez restaurantes; o catálogo daqui tem o mesmo assunto com muito mais
 * substância, só não tinha página.
 *
 * O QUE NÃO SE FAZ AQUI
 * Página fina. Abaixo do piso em `MINIMO` a rota devolve 404 de propósito:
 * uma lista com três lugares não ajuda quem lê e, multiplicada por dezenas,
 * ensina o Google que este site produz página vazia — que é o oposto do
 * motivo de tudo isto existir.
 *
 * E não se gera página de cozinha que um GUIA já disputa. Duas páginas nossas
 * competindo pela mesma busca dividem a força e as duas perdem; o guia fica
 * com a busca porque é curadoria humana. Ver `taxonomia.js`.
 *
 * Nem se inventa texto. A introdução de cada página é montada só com o que as
 * linhas daquela página dizem — quantos lugares, quais cozinhas, que faixa de
 * preço, que nota. Isso a torna única por bairro sem afirmar nada que o
 * catálogo não sustente.
 */

import {
  COZINHAS, aSlug, MINIMO, mapaDeCidades, cidadeDasLinhas, migalhas, rodape, jsonLd, CSS_NAV,
} from './taxonomia.js';
import { cartao, esc, cifroes, CSS_CARTAO } from './cartao.js';
import { notasComunidade } from './notas.js';

const SUPABASE_URL = 'https://lshecrzhcpqqiaytkemf.supabase.co';
const SUPABASE_KEY = 'sb_publishable_Q431fFjy1BM9vjCeQfkJZw_CQHgCQwl';
const SITE = 'https://selloapp.com.br';
const OG_FALLBACK = SITE + '/assets/img/hero.jpg';
const COLS = 'name,slug,share_slug,hero_image,address,price_level,city_id,catalog_json';

async function sb(path) {
  const r = await fetch(SUPABASE_URL + '/rest/v1/' + path, {
    headers: { apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY },
  });
  return r.ok ? r.json() : [];
}

/** Índice leve do catálogo inteiro: slug→nome real (os slugs não existem no
 *  banco, então o nome exato precisa ser descoberto antes de dar para filtrar
 *  por ele), quantos lugares cada bairro/cozinha/combinação tem — que é o que
 *  diz se a página do outro lado de um link passa do piso — e o centro de cada
 *  bairro, calculado das coordenadas dos próprios restaurantes. */
async function indice() {
  const rows = await sb(
    'restaurants?is_active=eq.true&select=lat,lng,catalog_json->>neighborhood,catalog_json->>cuisine&limit=2000',
  );
  const bairros = new Map();
  const cozinhas = new Map();
  const nBairro = {}, nCozinha = {}, nCombo = {}, soma = {};
  for (const r of rows) {
    const b = r.neighborhood, c = r.cuisine;
    if (b) {
      bairros.set(aSlug(b), b);
      nBairro[b] = (nBairro[b] || 0) + 1;
      if (r.lat != null && r.lng != null) {
        const s = soma[b] || (soma[b] = { lat: 0, lng: 0, n: 0 });
        s.lat += Number(r.lat); s.lng += Number(r.lng); s.n += 1;
      }
    }
    if (c && COZINHAS[c]) {
      cozinhas.set(COZINHAS[c].slug, c);
      nCozinha[c] = (nCozinha[c] || 0) + 1;
      if (b) nCombo[c + '|' + b] = (nCombo[c + '|' + b] || 0) + 1;
    }
  }
  const centro = {};
  for (const [b, s] of Object.entries(soma)) centro[b] = { lat: s.lat / s.n, lng: s.lng / s.n };
  return { bairros, cozinhas, nBairro, nCozinha, nCombo, centro };
}

/* ── O que passa do piso. Link para página que responde 404 é pior que link
 *    nenhum: o leitor bate na porta fechada e o Google também. ───────────── */

const bairroOk = (idx, b) => (idx.nBairro[b] || 0) >= MINIMO.bairro;
const comboOk = (idx, c, b) => (idx.nCombo[c + '|' + b] || 0) >= MINIMO.combinacao;

/** Para onde vai quem quer "tudo desta cozinha": o guia, quando existe (a
 *  página de cozinha redireciona para ele), ou a página de cozinha. */
function destinoCozinha(idx, c) {
  const t = COZINHAS[c];
  if (!t) return null;
  if (t.guia) return '/g/' + t.guia;
  return (idx.nCozinha[c] || 0) >= MINIMO.cozinha ? '/restaurantes/' + t.slug : null;
}

/** Distância aproximada em km — plana, que para bairros da mesma cidade erra
 *  menos que a diferença entre dois restaurantes do mesmo quarteirão. */
function km(a, b) {
  const x = (b.lng - a.lng) * Math.cos(((a.lat + b.lat) / 2) * Math.PI / 180);
  const y = b.lat - a.lat;
  return Math.sqrt(x * x + y * y) * 111.32;
}

/** Bairros vizinhos que têm página. "Vizinho" sai das coordenadas dos
 *  restaurantes, não de um mapa escrito à mão — que nasceria só com a cidade
 *  de hoje. Sem coordenada, cai na ordem dos que têm mais lugares. */
function bairrosPerto(idx, bairro, n) {
  const aqui = idx.centro[bairro];
  return Object.keys(idx.nBairro)
    .filter((b) => b !== bairro && bairroOk(idx, b))
    .sort((x, y) => {
      const cx = idx.centro[x], cy = idx.centro[y];
      if (aqui && cx && cy) return km(aqui, cx) - km(aqui, cy);
      return idx.nBairro[y] - idx.nBairro[x];
    })
    .slice(0, n);
}

/* ── Introdução a partir do dado. Cada função é pura e devolve '' quando o
 *    dado não sustenta a frase — aí a frase some, em vez de sair inventada. ── */

/** Os `n` valores mais frequentes de um campo do catalog_json, com contagem. */
function maisFrequentes(rows, campo, n) {
  const cont = {};
  for (const r of rows) {
    const v = r.catalog_json && r.catalog_json[campo];
    if (v) cont[v] = (cont[v] || 0) + 1;
  }
  return Object.entries(cont).sort((x, y) => y[1] - x[1] || x[0].localeCompare(y[0], 'pt-BR')).slice(0, n);
}

/** ['a','b','c'] → "a, b e c". */
function listaHumana(arr) {
  return arr.length < 2 ? arr.join('') : arr.slice(0, -1).join(', ') + ' e ' + arr[arr.length - 1];
}

/** A faixa de preço que mais aparece. Só vale se ela for a de pelo menos um
 *  terço das linhas — "a mais comum" entre quatro empatadas não diz nada. */
function faixaMaisComum(rows) {
  const cont = {};
  for (const r of rows) {
    const c = r.catalog_json || {};
    const p = cifroes(c.price_range != null ? c.price_range : r.price_level);
    if (p) cont[p] = (cont[p] || 0) + 1;
  }
  const top = Object.entries(cont).sort((x, y) => y[1] - x[1])[0];
  return top && top[1] * 3 >= rows.length ? top[0] : '';
}

/** A mesma nota que o cartão mostra: a da comunidade (api/notas.js), igual
 *  ao app. Sem avaliação, null — nunca zero. */
function notaDe(r, notas) {
  const n = notas && notas.get ? notas.get(r.slug) : null;
  return n ? n.media : null;
}
const decimal = (n) => n.toFixed(1).replace('.', ',');

function notaMedia(rows, mapa) {
  const notas = rows.map((r) => notaDe(r, mapa)).filter((n) => n != null);
  return notas.length ? decimal(notas.reduce((a, b) => a + b, 0) / notas.length) : '';
}

/** Junta as frases que existirem. */
function frases(...partes) {
  return partes.filter(Boolean).join(' ');
}

function erro404(res) {
  res.status(404).send(
    '<!doctype html><meta charset="utf-8"><title>Não encontrado</title>' +
      '<p>Página não encontrada. <a href="/guias">Ver os guias</a></p>',
  );
}

function pilulas(titulo, links) {
  const li = links.map((l) => '<li><a href="' + esc(l.href) + '">' + esc(l.txt) + '</a></li>').join('');
  return li ? '<h2>' + esc(titulo) + '</h2><ul class="rel">' + li + '</ul>' : '';
}

const maiuscula = (s) => s.charAt(0).toUpperCase() + s.slice(1);

function pagina(d) {
  return '<!doctype html>\n<html lang="pt-BR">\n<head>\n' +
    '<meta charset="utf-8" />\n' +
    '<meta name="viewport" content="width=device-width, initial-scale=1" />\n' +
    '<title>' + esc(d.title) + '</title>\n' +
    '<meta name="description" content="' + esc(d.description) + '" />\n' +
    '<link rel="canonical" href="' + esc(d.canonical) + '" />\n' +
    '<meta property="og:type" content="website" />\n' +
    '<meta property="og:site_name" content="Sello" />\n' +
    '<meta property="og:locale" content="pt_BR" />\n' +
    '<meta property="og:url" content="' + esc(d.canonical) + '" />\n' +
    '<meta property="og:title" content="' + esc(d.title) + '" />\n' +
    '<meta property="og:description" content="' + esc(d.description) + '" />\n' +
    '<meta property="og:image" content="' + OG_FALLBACK + '" />\n' +
    jsonLd(d.jsonld) + '\n' +
    jsonLd(d.trilha.ld) + '\n' +
    '<link rel="icon" href="/favicon.svg" />\n' +
    '<link rel="preconnect" href="https://fonts.googleapis.com" />\n' +
    '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />\n' +
    '<link href="https://fonts.googleapis.com/css2?family=Anton+SC&family=Open+Sans:wght@400;600;700&display=swap" rel="stylesheet" />\n' +
    '<style>\n' +
    '  :root { --red:#E30F2F; --ink:#0D111B; --muted:#4D5461; }\n' +
    '  * { box-sizing:border-box; }\n' +
    '  body { margin:0; font-family:"Open Sans",system-ui,sans-serif; color:var(--ink);\n' +
    '         background:#fff; padding:40px 24px 64px; }\n' +
    '  main { max-width:680px; margin:0 auto; }\n' +
    '  .kicker { font-size:13px; color:var(--red); font-weight:700; text-transform:uppercase;\n' +
    '            letter-spacing:.06em; margin-bottom:6px; }\n' +
    '  h1 { font-family:"Anton SC",sans-serif; font-weight:400; text-transform:uppercase;\n' +
    '       font-size:30px; line-height:1.14; margin:0 0 12px; }\n' +
    '  .lead { color:var(--muted); font-size:16px; line-height:1.55; margin:0 0 26px; }\n' +
    '  h2 { font-family:"Anton SC",sans-serif; font-weight:400; text-transform:uppercase;\n' +
    '       font-size:16px; letter-spacing:.02em; margin:36px 0 10px; }\n' +
    '  .rel { display:flex; flex-wrap:wrap; gap:8px; margin:0; padding:0; list-style:none; }\n' +
    '  .rel a { display:inline-block; border:1.5px solid #E4E4E7; border-radius:999px;\n' +
    '           padding:7px 13px; font-size:13px; color:var(--ink); text-decoration:none; }\n' +
    '  .rel a:hover { border-color:var(--red); color:var(--red); }\n' +
    '  .foot { margin-top:40px; text-align:center; font-size:14px; }\n' +
    '  .foot a { color:var(--red); font-weight:700; text-decoration:none; }\n' +
    CSS_CARTAO +
    CSS_NAV +
    '</style>\n</head>\n<body>\n  <main>\n' +
    '    ' + d.trilha.html + '\n' +
    '    <div class="kicker">' + esc(d.kicker) + '</div>\n' +
    '    <h1>' + esc(d.h1) + '</h1>\n' +
    '    <p class="lead">' + esc(d.lead) + '</p>\n' +
    '    ' + d.cartoes + '\n' +
    '    ' + d.relacionados + '\n' +
    '    <div class="foot"><a href="/baixar">Baixar o app</a> · <a href="/guias">Ver os guias</a></div>\n' +
    '  </main>\n' +
    '  ' + rodape() + '\n' +
    '<script defer src="/_vercel/insights/script.js"></script>\n' +
    '</body>\n</html>';
}

export default async function handler(req, res) {
  const q = req.query || {};
  const tipo = q.tipo || '';
  const a = q.a || '';
  const b = q.b || '';
  res.setHeader('Content-Type', 'text/html; charset=utf-8');

  const [idx, linhasCidades] = await Promise.all([indice(), sb('cities?select=id,name,state&limit=100')]);
  const bairro = tipo === 'bairro' ? idx.bairros.get(aSlug(a)) : (b ? idx.bairros.get(aSlug(b)) : null);
  const cozinha = tipo === 'bairro' ? null : idx.cozinhas.get(aSlug(a));
  const tax = cozinha ? COZINHAS[cozinha] : null;

  if (tipo === 'bairro' ? !bairro : !cozinha) return erro404(res);
  if (tipo === 'combo' && !bairro) return erro404(res);

  // Cozinha que um guia já disputa não ganha página própria (ver taxonomia.js).
  if (tipo === 'cozinha' && tax.guia) {
    res.setHeader('Location', '/g/' + tax.guia);
    res.status(308).end();
    return;
  }

  const filtros = [
    'is_active=eq.true',
    bairro ? 'catalog_json->>neighborhood=eq.' + encodeURIComponent(bairro) : '',
    cozinha ? 'catalog_json->>cuisine=eq.' + encodeURIComponent(cozinha) : '',
    'select=' + COLS,
    'limit=300',
  ].filter(Boolean).join('&');
  const [rows, notas] = await Promise.all([sb('restaurants?' + filtros), notasComunidade()]);

  const piso = tipo === 'bairro' ? MINIMO.bairro : tipo === 'cozinha' ? MINIMO.cozinha : MINIMO.combinacao;
  if (rows.length < piso) return erro404(res);

  rows.sort((x, y) => (y.catalog_json && y.catalog_json.sello_score || 0) - (x.catalog_json && x.catalog_json.sello_score || 0));

  /* A cidade sai das linhas desta página (ver taxonomia.js). `uf` vai no
   * título, que é curto e é onde a busca mais pesa; o nome vai no texto. */
  const cidade = cidadeDasLinhas(rows, mapaDeCidades(linhasCidades));
  const naCidade = cidade ? ', ' + cidade.nome : '';
  // No meio da frase o aposto fecha com vírgula: "em Pinheiros, São Paulo, na curadoria".
  const naCidadeAposto = cidade ? naCidade + ',' : '';
  const ufTitulo = cidade && cidade.uf ? ', ' + cidade.uf : '';

  const preco = faixaMaisComum(rows);
  const media = notaMedia(rows, notas);
  const fraseFinal = frases(
    preco ? 'Faixa de preço mais comum: ' + preco + '.' : '',
    media ? 'Nota média da comunidade: ' + media + '.' : '',
  );

  let h1, title, canonical, lead, description, kicker, trilha;
  if (tipo === 'bairro') {
    const cozinhasTop = maisFrequentes(rows, 'cuisine', 3);
    h1 = 'Onde comer em ' + bairro;
    title = 'Onde comer em ' + bairro + ufTitulo + ': ' + rows.length + ' restaurantes | Sello';
    canonical = SITE + '/onde-comer/' + aSlug(bairro);
    kicker = 'Bairro';
    lead = frases(
      rows.length + ' lugares em ' + bairro + naCidadeAposto + ' selecionados pelo Sello, na ordem da curadoria.',
      cozinhasTop.length ? 'Cozinhas mais presentes: ' + listaHumana(cozinhasTop.map((e) => e[0] + ' (' + e[1] + ')')) + '.' : '',
      fraseFinal,
    );
    description = 'Onde comer em ' + bairro + naCidade + ': ' + rows.length + ' restaurantes com curadoria do Sello' +
      (cozinhasTop.length ? ', com destaque para ' + listaHumana(cozinhasTop.map((e) => e[0].toLowerCase())) : '') +
      '. Nota, preço e o que pedir em cada um.';
    trilha = migalhas([
      { nome: 'Início', href: '/' },
      { nome: 'Bairros', href: '/guias#bairros' },
      { nome: bairro, href: '/onde-comer/' + aSlug(bairro) },
    ]);
  } else if (tipo === 'cozinha') {
    const bairrosTop = maisFrequentes(rows, 'neighborhood', 3);
    h1 = 'Os melhores ' + tax.plural;
    title = 'Os melhores ' + tax.plural + (cidade && cidade.uf ? ' em ' + cidade.uf : '') + ' | Sello';
    canonical = SITE + '/restaurantes/' + tax.slug;
    kicker = 'Cozinha';
    lead = frases(
      rows.length + ' ' + tax.plural + (cidade ? ' em ' + cidade.nome : '') +
        ' selecionados pelo Sello, na ordem da curadoria — com endereço, faixa de preço e horário.',
      bairrosTop.length ? 'Bairros com mais opções: ' + listaHumana(bairrosTop.map((e) => e[0] + ' (' + e[1] + ')')) + '.' : '',
      fraseFinal,
    );
    description = rows.length + ' ' + tax.plural + (cidade ? ' em ' + cidade.nome : '') +
      ' com curadoria do Sello' +
      (bairrosTop.length ? '. Mais opções em ' + listaHumana(bairrosTop.map((e) => e[0])) : '') + '.';
    trilha = migalhas([
      { nome: 'Início', href: '/' },
      { nome: 'Cozinhas', href: '/guias#cozinhas' },
      { nome: maiuscula(tax.plural), href: '/restaurantes/' + tax.slug },
    ]);
  } else {
    const melhor = rows
      .filter((r) => notaDe(r, notas) != null)
      .sort((a, b) => notaDe(b, notas) - notaDe(a, notas))[0];
    h1 = maiuscula(tax.plural) + ' em ' + bairro;
    title = 'Os melhores ' + tax.plural + ' em ' + bairro + ufTitulo + ' | Sello';
    canonical = SITE + '/restaurantes/' + tax.slug + '/' + aSlug(bairro);
    kicker = cozinha + ' · ' + bairro;
    lead = frases(
      rows.length + ' ' + tax.plural + ' em ' + bairro + naCidadeAposto +
        ' na curadoria do Sello — com o que pedir, quanto custa e a que horas abre.',
      melhor ? 'A nota mais alta da comunidade é de ' + melhor.name + ' (' + decimal(notaDe(melhor, notas)) + ').' : '',
      fraseFinal,
    );
    description = rows.length + ' ' + tax.plural + ' em ' + bairro + naCidadeAposto +
      ' com curadoria do Sello — com o que pedir, preço e horário de cada um.';
    /* O degrau do meio é o bairro, quando ele tem página; se não tiver, é a
     * cozinha (a página dela ou o guia que a substitui). */
    const meio = bairroOk(idx, bairro)
      ? [{ nome: 'Bairros', href: '/guias#bairros' }, { nome: bairro, href: '/onde-comer/' + aSlug(bairro) }]
      : destinoCozinha(idx, cozinha)
        ? [{ nome: 'Cozinhas', href: '/guias#cozinhas' }, { nome: maiuscula(tax.plural), href: destinoCozinha(idx, cozinha) }]
        : [{ nome: 'Guias', href: '/guias' }];
    trilha = migalhas([{ nome: 'Início', href: '/' }, ...meio, { nome: h1, href: '/restaurantes/' + tax.slug + '/' + aSlug(bairro) }]);
  }

  /* Links internos: é o que transforma páginas soltas em site. Cada página
   * aponta para as vizinhas óbvias, que é por onde o leitor continua e por
   * onde a relevância circula. Só entra link para página que passa do piso. */
  const blocos = [];
  const todosOsGuias = { href: '/guias', txt: 'Todos os guias e bairros' };
  if (tipo === 'bairro') {
    const porCozinha = [];
    for (const nome of Object.keys(COZINHAS)) {
      if (comboOk(idx, nome, bairro)) {
        porCozinha.push({ href: '/restaurantes/' + COZINHAS[nome].slug + '/' + aSlug(bairro), txt: COZINHAS[nome].plural + ' em ' + bairro });
      }
    }
    blocos.push(pilulas('Por cozinha em ' + bairro, porCozinha));
    blocos.push(pilulas('Outros bairros perto', [
      ...bairrosPerto(idx, bairro, 8).map((nb) => ({ href: '/onde-comer/' + aSlug(nb), txt: 'Onde comer em ' + nb })),
      todosOsGuias,
    ]));
  } else if (tipo === 'combo') {
    const tudo = [];
    if (bairroOk(idx, bairro)) tudo.push({ href: '/onde-comer/' + aSlug(bairro), txt: 'Tudo em ' + bairro });
    const dest = destinoCozinha(idx, cozinha);
    if (dest) tudo.push({ href: dest, txt: (tax.guia ? 'O guia de ' : 'Todos os ') + tax.plural });
    tudo.push(todosOsGuias);
    blocos.push(pilulas('Veja também', tudo));
    blocos.push(pilulas('Outras cozinhas em ' + bairro, Object.keys(COZINHAS)
      .filter((c) => c !== cozinha && comboOk(idx, c, bairro))
      .map((c) => ({ href: '/restaurantes/' + COZINHAS[c].slug + '/' + aSlug(bairro), txt: COZINHAS[c].plural + ' em ' + bairro }))));
    blocos.push(pilulas(maiuscula(tax.plural) + ' em outros bairros', Object.keys(idx.nBairro)
      .filter((nb) => nb !== bairro && comboOk(idx, cozinha, nb))
      .sort((x, y) => idx.nCombo[cozinha + '|' + y] - idx.nCombo[cozinha + '|' + x])
      .slice(0, 8)
      .map((nb) => ({ href: '/restaurantes/' + tax.slug + '/' + aSlug(nb), txt: tax.plural + ' em ' + nb }))));
  } else {
    const porBairro = {};
    for (const r of rows) {
      const nb = r.catalog_json && r.catalog_json.neighborhood;
      if (nb) porBairro[nb] = (porBairro[nb] || 0) + 1;
    }
    blocos.push(pilulas(maiuscula(tax.plural) + ' por bairro', Object.entries(porBairro)
      .filter((e) => e[1] >= MINIMO.combinacao)
      .sort((x, y) => y[1] - x[1])
      .slice(0, 12)
      .map((e) => ({ href: '/restaurantes/' + tax.slug + '/' + aSlug(e[0]), txt: tax.plural + ' em ' + e[0] }))));
    // Outras cozinhas: um link por destino (Pizza e Pizza Napolitana dividem o guia).
    const vistos = new Set([canonical.slice(SITE.length)]);
    const outras = [];
    for (const c of Object.keys(COZINHAS).sort((x, y) => (idx.nCozinha[y] || 0) - (idx.nCozinha[x] || 0))) {
      const href = destinoCozinha(idx, c);
      if (!href || vistos.has(href)) continue;
      vistos.add(href);
      outras.push({ href, txt: COZINHAS[c].plural });
    }
    blocos.push(pilulas('Outras cozinhas', [...outras.slice(0, 12), todosOsGuias]));
  }

  const jsonld = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: h1,
    description: lead,
    numberOfItems: rows.length,
    itemListElement: rows.slice(0, 50).map((r, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: r.name,
      url: SITE + '/r/' + (r.share_slug || r.slug),
    })),
  };

  res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=86400');
  res.status(200).send(pagina({
    title: title,
    description: description,
    h1: h1,
    kicker: kicker,
    lead: lead,
    canonical: canonical,
    jsonld: jsonld,
    trilha: trilha,
    cartoes: rows.map((r) => cartao(r, notas)).join(''),
    relacionados: blocos.join('\n'),
  }));
}
