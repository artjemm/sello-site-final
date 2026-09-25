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
 */

import { COZINHAS, aSlug, MINIMO } from './taxonomia.js';
import { cartao, esc, CSS_CARTAO } from './cartao.js';

const SUPABASE_URL = 'https://lshecrzhcpqqiaytkemf.supabase.co';
const SUPABASE_KEY = 'sb_publishable_Q431fFjy1BM9vjCeQfkJZw_CQHgCQwl';
const SITE = 'https://selloapp.com.br';
const OG_FALLBACK = SITE + '/assets/img/hero.jpg';
const COLS = 'name,slug,share_slug,hero_image,address,price_level,catalog_json';

async function sb(path) {
  const r = await fetch(SUPABASE_URL + '/rest/v1/' + path, {
    headers: { apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY },
  });
  return r.ok ? r.json() : [];
}

/** Índice leve slug→nome real. Os slugs não existem no banco, então o nome
 *  exato precisa ser descoberto antes de dar para filtrar por ele. */
async function indice() {
  const rows = await sb(
    'restaurants?is_active=eq.true&select=catalog_json->>neighborhood,catalog_json->>cuisine&limit=2000',
  );
  const bairros = new Map();
  const cozinhas = new Map();
  for (const r of rows) {
    if (r.neighborhood) bairros.set(aSlug(r.neighborhood), r.neighborhood);
    if (r.cuisine && COZINHAS[r.cuisine]) cozinhas.set(COZINHAS[r.cuisine].slug, r.cuisine);
  }
  return { bairros, cozinhas };
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
    '<script type="application/ld+json">' + JSON.stringify(d.jsonld) + '</script>\n' +
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
    '</style>\n</head>\n<body>\n  <main>\n' +
    '    <div class="kicker">' + esc(d.kicker) + '</div>\n' +
    '    <h1>' + esc(d.h1) + '</h1>\n' +
    '    <p class="lead">' + esc(d.lead) + '</p>\n' +
    '    ' + d.cartoes + '\n' +
    '    ' + d.relacionados + '\n' +
    '    <div class="foot"><a href="/baixar">Baixar o app</a> · <a href="/guias">Ver os guias</a></div>\n' +
    '  </main>\n' +
    '<script defer src="/_vercel/insights/script.js"></script>\n' +
    '</body>\n</html>';
}

export default async function handler(req, res) {
  const q = req.query || {};
  const tipo = q.tipo || '';
  const a = q.a || '';
  const b = q.b || '';
  res.setHeader('Content-Type', 'text/html; charset=utf-8');

  const idx = await indice();
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
  const rows = await sb('restaurants?' + filtros);

  const piso = tipo === 'bairro' ? MINIMO.bairro : tipo === 'cozinha' ? MINIMO.cozinha : MINIMO.combinacao;
  if (rows.length < piso) return erro404(res);

  rows.sort((x, y) => (y.catalog_json && y.catalog_json.sello_score || 0) - (x.catalog_json && x.catalog_json.sello_score || 0));

  let h1, title, canonical, lead, kicker;
  if (tipo === 'bairro') {
    h1 = 'Onde comer em ' + bairro;
    title = 'Onde comer em ' + bairro + ': ' + rows.length + ' restaurantes | Sello';
    canonical = SITE + '/onde-comer/' + aSlug(bairro);
    kicker = 'Bairro';
    lead = rows.length + ' restaurantes, bares e cafés em ' + bairro +
      ' selecionados pela curadoria do Sello — com o que pedir, faixa de preço e horário de cada um.';
  } else if (tipo === 'cozinha') {
    h1 = 'Os melhores ' + tax.plural;
    title = 'Os melhores ' + tax.plural + ' de São Paulo | Sello';
    canonical = SITE + '/restaurantes/' + tax.slug;
    kicker = 'Cozinha';
    lead = rows.length + ' ' + tax.plural +
      ' escolhidos pela curadoria do Sello, ordenados pela nota — com endereço, faixa de preço e horário.';
  } else {
    h1 = tax.plural.charAt(0).toUpperCase() + tax.plural.slice(1) + ' em ' + bairro;
    title = 'Os melhores ' + tax.plural + ' em ' + bairro + ' | Sello';
    canonical = SITE + '/restaurantes/' + tax.slug + '/' + aSlug(bairro);
    kicker = cozinha + ' · ' + bairro;
    lead = rows.length + ' ' + tax.plural + ' em ' + bairro +
      ' pela curadoria do Sello, do mais bem avaliado ao menos — com o que pedir, quanto custa e a que horas abre.';
  }

  /* Links internos: é o que transforma páginas soltas em site. Cada página
   * aponta para as vizinhas óbvias, que é por onde o leitor continua e por
   * onde a relevância circula. */
  const rel = [];
  if (tipo === 'bairro') {
    for (const nome of Object.keys(COZINHAS)) {
      const t = COZINHAS[nome];
      const n = rows.filter((r) => r.catalog_json && r.catalog_json.cuisine === nome).length;
      if (n >= MINIMO.combinacao) {
        rel.push({ href: '/restaurantes/' + t.slug + '/' + aSlug(bairro), txt: t.plural + ' em ' + bairro });
      }
    }
  } else if (tipo === 'combo') {
    rel.push({ href: '/onde-comer/' + aSlug(bairro), txt: 'Tudo em ' + bairro });
    if (tax.guia) rel.push({ href: '/g/' + tax.guia, txt: 'O guia de ' + tax.plural });
  } else {
    const porBairro = {};
    for (const r of rows) {
      const nb = r.catalog_json && r.catalog_json.neighborhood;
      if (nb) porBairro[nb] = (porBairro[nb] || 0) + 1;
    }
    Object.entries(porBairro)
      .filter((e) => e[1] >= MINIMO.combinacao)
      .sort((x, y) => y[1] - x[1])
      .slice(0, 8)
      .forEach((e) => rel.push({ href: '/restaurantes/' + tax.slug + '/' + aSlug(e[0]), txt: tax.plural + ' em ' + e[0] }));
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
    description: lead,
    h1: h1,
    kicker: kicker,
    lead: lead,
    canonical: canonical,
    jsonld: jsonld,
    cartoes: rows.map(cartao).join(''),
    relacionados: pilulas('Veja também', rel),
  }));
}
