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
  COZINHAS, aSlug, MINIMO, destinoFixo, mapaDeCidades, cidadeDasLinhas, migalhas, rodape, jsonLd, CSS_NAV,
} from './_lib/taxonomia.js';
import { OCASIOES, COLS_OCASIAO, contarOcasioes, atende } from './_lib/ocasioes.js';
import { esc, cifroes } from './_lib/cartao.js';
import { layoutListagem, documentoListagem, capaNitida } from './_lib/listagem.js';
import { notasComunidade } from './_lib/notas.js';

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
/* O índice é o mesmo para todas as páginas e muda quando o catálogo muda —
 * no máximo algumas vezes por dia. Guardado por 5 minutos na função quente,
 * poupa uma consulta de ~500 linhas por página servida. */
let indiceCache = null;
function indice() {
  const agora = Date.now();
  if (indiceCache && agora - indiceCache.t < 5 * 60 * 1000) return indiceCache.p;
  const p = montarIndice().catch((e) => { indiceCache = null; throw e; });
  indiceCache = { t: agora, p };
  return p;
}

async function montarIndice() {
  const rows = await sb(
    'restaurants?is_active=eq.true&select=slug,name,lat,lng,catalog_json->>neighborhood,catalog_json->>cuisine,' +
      'sello:catalog_json->>sello_score,' + COLS_OCASIAO + '&limit=2000',
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
  // Ocasiões: a mesma conta que o sitemap e os links usam (ocasioes.js).
  const oc = contarOcasioes(rows, MINIMO);
  return { bairros, cozinhas, nBairro, nCozinha, nCombo, centro, oc, rows };
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
  if (destinoFixo(t)) return destinoFixo(t);
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

/** O lugar de nota mais alta, entre os que têm ao menos 3 avaliações — um
 *  10,0 de um voto só diz quem avaliou, não o lugar. */
function melhorAvaliado(rows, notas) {
  return rows
    .filter((r) => { const n = notas && notas.get ? notas.get(r.slug) : null; return n && n.votos >= 3; })
    .sort((x, y) => notaDe(y, notas) - notaDe(x, notas))[0] || null;
}

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

/** Um bloco de links para a listagem (vira pílulas da home). */
function pilulas(titulo, links) {
  return links.length ? { titulo, links } : null;
}

const maiuscula = (s) => s.charAt(0).toUpperCase() + s.slice(1);

/**
 * O documento inteiro. O corpo é o layout de listagem (api/_lib/listagem.js),
 * a mesma pele da ficha e da home: css/sello.css + js/sello.js da home, mais o
 * CSS da ficha e o da listagem. `d.lugares` = [{ r, destaque? }].
 */
async function pagina(d) {
  const rows = d.lugares.map((it) => it.r);
  const total = d.total || rows.length;
  const media = notaMedia(rows, d.notas);
  const faixa = faixaMaisComum(rows);
  // A primeira frase do lead sobe para a capa; o resto fica no "Em resumo".
  const corte = d.lead.search(/\.\s+(?=[A-ZÁÉÍÓÚÂÊÔÃÕÇ0-9])/);
  const sub = corte > 0 ? d.lead.slice(0, corte + 1) : d.lead;
  // 'Estão na ordem da curadoria.' é o título da grade; no resumo seria eco.
  const resumo = (corte > 0 ? d.lead.slice(corte + 1).trim() : '')
    .replace(/^(Aqui estão os \d+ primeiros, na ordem da curadoria|Estão na ordem da curadoria)\.\s*/, '');
  const comFotos = rows.filter((r) => r.hero_image);
  const urlCapa = await capaNitida(comFotos[0] && comFotos[0].hero_image, comFotos.slice(1, 7).map((r) => r.hero_image));
  const comFoto = comFotos.find((r) => r.hero_image === urlCapa);
  const capa = comFoto
    ? {
        url: comFoto.hero_image,
        credito: (comFoto.catalog_json && comFoto.catalog_json.hero_attribution &&
          comFoto.catalog_json.hero_attribution.attribution_text) || '',
      }
    : null;
  const corpo = layoutListagem({
    kicker: d.kicker,
    h1: d.h1,
    sub,
    resumo,
    trilha: d.trilha.itens,
    capa,
    fatos: [
      total + (total === 1 ? ' lugar' : ' lugares'),
      media ? 'Nota média ' + media : '',
      faixa ? 'Faixa mais comum ' + faixa : '',
    ].filter(Boolean),
    lugares: d.lugares,
    notas: d.notas,
    olhoLugares: total > rows.length ? 'Os ' + rows.length + ' primeiros de ' + total : rows.length + ' lugares',
    tituloLugares: 'Na ordem da curadoria',
    blocos: d.blocos,
  });
  return documentoListagem({
    title: d.title,
    description: d.description,
    canonical: d.canonical,
    imagem: capa ? capa.url : null,
    jsonlds: [d.jsonld, d.trilha.ld],
    capaUrl: capa ? capa.url : null,
    corpo,
  });
}

/* ══════════════════════════════════════════════════════════════════════════
 * Ocasiões — /ocasioes/:ocasiao e /ocasioes/:ocasiao/:bairro (ver ocasioes.js)
 * ══════════════════════════════════════════════════════════════════════════ */

const DIA_CURTO = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
const POR_HORARIO = new Set(['aberto-domingo', 'aberto-ate-tarde', 'almoco', 'brunch']);
const POR_REGISTRO = new Set(['com-criancas', 'pet-friendly', 'ao-ar-livre', 'vegetariano']);

/** "0130" → "01:30". */
const hhmm = (t) => String(t || '').padStart(4, '0').replace(/^(\d\d)(\d\d)$/, '$1:$2');

/** O dado do cartão que responde à pergunta da página: na página de domingo,
 *  o horário de domingo — e não o "de hoje", que numa terça não diz nada. */
function destaque(slug, r) {
  const c = r.catalog_json || {};
  const dia = (nome) => (c.hours || []).find((h) => h && h.label === nome);
  if (slug === 'aberto-domingo') {
    const d = dia('Domingo');
    return d && d.value ? { rotulo: 'Domingo', valor: d.value } : null;
  }
  if (slug === 'brunch') {
    const vals = ['Sábado', 'Domingo'].map(dia).filter((d) => d && d.value && !/fechado/i.test(d.value));
    return vals.length ? { rotulo: 'Fim de semana', valor: vals.map((d) => d.label.slice(0, 3).toLowerCase() + ' ' + d.value).join(' · ') } : null;
  }
  if (slug === 'aberto-ate-tarde') {
    const tarde = (r.hours_periods || c.hours_periods || []).filter((p) => p && p.open && p.close &&
      (p.close.day !== p.open.day || Number(p.close.time) === 0));
    if (!tarde.length) return null;
    // Madrugada conta como "depois": 01:00 é mais tarde que 00:00.
    const maisTarde = tarde.map((p) => p.close.time).sort((x, y) => Number(y) - Number(x))[0];
    const dias = [...new Set(tarde.map((p) => p.open.day))].sort((x, y) => ((x + 6) % 7) - ((y + 6) % 7));
    return { rotulo: 'Fecha', valor: 'até ' + hhmm(maisTarde) + ' · ' + dias.map((d) => DIA_CURTO[d]).join(', ') };
  }
  return null;
}

/** Na página do bairro: o que as ocasiões dizem dele, em uma frase. É fato
 *  útil para quem lê ("abre domingo?") e é a frase que um assistente cita. */
function fatosDeOcasiao(idx, bairro) {
  const m = idx.oc.porBairro[bairro] || {};
  const partes = [];
  if (m['aberto-domingo']) partes.push(m['aberto-domingo'] + ' abrem no domingo');
  if (m['aberto-ate-tarde']) partes.push(m['aberto-ate-tarde'] + ' ficam abertos depois da meia-noite em algum dia');
  if (m['bom-e-barato']) partes.push(m['bom-e-barato'] + ' estão nas faixas de preço $ e $$');
  return partes.length ? 'Deles, ' + listaHumana(partes) + '.' : '';
}

async function paginaOcasiao(res, a, b, idx, linhasCidades) {
  const slug = aSlug(a);
  const o = OCASIOES[slug];
  if (!o) return erro404(res);
  const bairro = b ? idx.bairros.get(aSlug(b)) : null;
  if (b && !bairro) return erro404(res);

  // Na cidade inteira, a ocasião que um guia já disputa é do guia.
  if (!bairro && o.guia) {
    res.setHeader('Location', '/g/' + o.guia);
    res.status(308).end();
    return;
  }
  if (bairro ? !idx.oc.existeBairro(slug, bairro) : !idx.oc.existeGeral(slug)) return erro404(res);

  /* Quem entra sai do índice leve; o catalog_json inteiro só é baixado para
   * os que vão aparecer. A página geral de "domingo" tem ~390 lugares — 390
   * cartões não ajudam ninguém a escolher e pesariam megabytes. */
  const LIMITE = 60;
  const candidatos = idx.rows
    .filter((r) => (!bairro || r.neighborhood === bairro) && atende(slug, r))
    .sort((x, y) => Number(y.sello || 0) - Number(x.sello || 0));
  const total = candidatos.length;
  const mostrar = candidatos.slice(0, LIMITE).map((r) => r.slug);
  const [linhas, notas] = await Promise.all([
    sb('restaurants?is_active=eq.true&slug=in.(' + mostrar.map(encodeURIComponent).join(',') + ')' +
      '&select=' + COLS + ',hours_periods,amenities&limit=' + LIMITE),
    notasComunidade(),
  ]);
  const ordem = new Map(mostrar.map((s, i) => [s, i]));
  linhas.sort((x, y) => ordem.get(x.slug) - ordem.get(y.slug));
  if (!linhas.length) return erro404(res);

  const cidade = cidadeDasLinhas(linhas, mapaDeCidades(linhasCidades));
  const ondeBairro = bairro ? ' em ' + bairro : '';
  const ondeLead = bairro
    ? ' em ' + bairro + (cidade ? ', ' + cidade.nome + ',' : '')
    : (cidade ? ' em ' + cidade.nome : '');
  const ufTitulo = cidade && cidade.uf ? (bairro ? ', ' : ' em ') + cidade.uf : '';
  const naCidadeDesc = cidade ? (bairro ? ', ' : ' em ') + cidade.nome : '';

  // Sem bairro, o H1 leva a cidade — vinda das linhas, nunca escrita aqui.
  const h1 = o.titulo(bairro ? ondeBairro : (cidade ? ' em ' + cidade.nome : ''));
  const title = o.busca(ondeBairro) + ufTitulo + ': ' + total + ' lugares | Sello';
  const canonical = SITE + '/ocasioes/' + slug + (bairro ? '/' + aSlug(bairro) : '');

  /* Os fatos falam de TODOS os que atendem, não só dos 60 mostrados — senão
   * "bairros com mais opções" contaria só o topo da curadoria. As linhas do
   * índice são achatadas; daí o embrulho para maisFrequentes. */
  const todos = candidatos.map((r) => ({ ...r, catalog_json: { cuisine: r.cuisine, neighborhood: r.neighborhood } }));
  const melhor = melhorAvaliado(candidatos, notas);
  const contexto = bairro ? maisFrequentes(todos, 'cuisine', 3) : maisFrequentes(todos, 'neighborhood', 3);
  const media = notaMedia(candidatos, notas);
  const lead = frases(
    'Na curadoria do Sello, ' + total + ' lugares' + ondeLead + ' ' + o.criterio + '.',
    total > linhas.length
      ? 'Aqui estão os ' + linhas.length + ' primeiros, na ordem da curadoria.'
      : 'Estão na ordem da curadoria.',
    contexto.length
      ? (bairro ? 'Cozinhas mais presentes: ' : 'Bairros com mais opções: ') +
        listaHumana(contexto.map((e) => e[0] + ' (' + e[1] + ')')) + '.'
      : '',
    melhor ? 'A nota mais alta da comunidade é de ' + melhor.name + ' (' + decimal(notaDe(melhor, notas)) + ').' : '',
    media ? 'Nota média da comunidade: ' + media + '.' : '',
    POR_HORARIO.has(slug) ? 'Horários mudam: confira na ficha de cada lugar antes de sair.' : '',
    POR_REGISTRO.has(slug) ? 'A lista mostra onde há registro; uma casa fora dela não quer dizer que não atenda.' : '',
  );
  const description = o.busca(ondeBairro) + naCidadeDesc + ': ' + total +
    ' lugares com curadoria do Sello que ' + o.criterio + '. Nota, preço e endereço de cada um.';

  const trilha = migalhas(bairro
    ? [
        { nome: 'Início', href: '/' },
        { nome: 'Bairros', href: '/guias#bairros' },
        { nome: bairro, href: '/onde-comer/' + aSlug(bairro) },
        { nome: o.nome, href: '/ocasioes/' + slug + '/' + aSlug(bairro) },
      ]
    : [
        { nome: 'Início', href: '/' },
        { nome: 'Ocasiões', href: '/guias#ocasioes' },
        { nome: o.nome, href: '/ocasioes/' + slug },
      ]);

  /* Para onde vai quem quer esta ocasião sem recorte de bairro: a página
   * geral, ou o guia que a substitui. */
  const geral = o.guia ? '/g/' + o.guia : (idx.oc.existeGeral(slug) ? '/ocasioes/' + slug : '');
  const outrosBairros = Object.keys(idx.oc.porBairro)
    .filter((nb) => nb !== bairro && idx.oc.existeBairro(slug, nb))
    .sort((x, y) => idx.oc.porBairro[y][slug] - idx.oc.porBairro[x][slug]);
  const blocos = [];
  const todosOsGuias = { href: '/guias', txt: 'Todos os guias e bairros' };
  if (bairro) {
    blocos.push(pilulas('Outras ocasiões em ' + bairro, Object.keys(OCASIOES)
      .filter((x) => x !== slug && idx.oc.existeBairro(x, bairro))
      .map((x) => ({ href: '/ocasioes/' + x + '/' + aSlug(bairro), txt: OCASIOES[x].titulo(' em ' + bairro) }))));
    blocos.push(pilulas('Veja também', [
      { href: '/onde-comer/' + aSlug(bairro), txt: 'Tudo em ' + bairro },
      geral ? { href: geral, txt: o.guia ? o.nome + ': o guia do Sello' : o.nome + (cidade ? ' em ' + cidade.nome : ', todos') } : null,
      todosOsGuias,
    ].filter(Boolean)));
    blocos.push(pilulas(o.nome + ' em outros bairros', outrosBairros.slice(0, 8)
      .map((nb) => ({ href: '/ocasioes/' + slug + '/' + aSlug(nb), txt: o.titulo(' em ' + nb) }))));
  } else {
    blocos.push(pilulas(o.nome + ' por bairro', outrosBairros.slice(0, 12)
      .map((nb) => ({ href: '/ocasioes/' + slug + '/' + aSlug(nb), txt: o.titulo(' em ' + nb) }))));
    blocos.push(pilulas('Outras ocasiões', [
      ...Object.keys(OCASIOES)
        .filter((x) => x !== slug)
        .map((x) => {
          const href = OCASIOES[x].guia ? '/g/' + OCASIOES[x].guia : (idx.oc.existeGeral(x) ? '/ocasioes/' + x : '');
          return href ? { href, txt: OCASIOES[x].nome } : null;
        })
        .filter(Boolean),
      todosOsGuias,
    ]));
  }

  const jsonld = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: h1,
    description: lead,
    numberOfItems: linhas.length,
    itemListElement: linhas.slice(0, 50).map((r, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: r.name,
      url: SITE + '/r/' + (r.share_slug || r.slug),
    })),
  };

  res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=86400');
  res.status(200).send(await pagina({
    title, description, h1, lead, canonical, jsonld, trilha,
    kicker: bairro ? 'Ocasião · ' + bairro : 'Ocasião',
    lugares: linhas.map((r) => ({ r, destaque: destaque(slug, r) })),
    total,
    notas,
    blocos: blocos.filter(Boolean),
  }));
}

export default async function handler(req, res) {
  const q = req.query || {};
  const tipo = q.tipo || '';
  const a = q.a || '';
  const b = q.b || '';
  res.setHeader('Content-Type', 'text/html; charset=utf-8');

  const [idx, linhasCidades] = await Promise.all([indice(), sb('cities?select=id,name,state&limit=100')]);
  if (tipo === 'ocasiao') return paginaOcasiao(res, a, b, idx, linhasCidades);
  const bairro = tipo === 'bairro' ? idx.bairros.get(aSlug(a)) : (b ? idx.bairros.get(aSlug(b)) : null);
  const cozinha = tipo === 'bairro' ? null : idx.cozinhas.get(aSlug(a));
  const tax = cozinha ? COZINHAS[cozinha] : null;

  if (tipo === 'bairro' ? !bairro : !cozinha) return erro404(res);
  if (tipo === 'combo' && !bairro) return erro404(res);

  // Cozinha que um guia (ou uma ocasião) já disputa não ganha página própria
  // (ver taxonomia.js).
  if (tipo === 'cozinha' && destinoFixo(tax)) {
    res.setHeader('Location', destinoFixo(tax));
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
      fatosDeOcasiao(idx, bairro),
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
    const melhor = melhorAvaliado(rows, notas);
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
    blocos.push(pilulas('Por ocasião em ' + bairro, Object.keys(OCASIOES)
      .filter((o) => idx.oc.existeBairro(o, bairro))
      .map((o) => ({ href: '/ocasioes/' + o + '/' + aSlug(bairro), txt: OCASIOES[o].titulo(' em ' + bairro) }))));
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
  res.status(200).send(await pagina({
    title: title,
    description: description,
    h1: h1,
    kicker: kicker,
    lead: lead,
    canonical: canonical,
    jsonld: jsonld,
    trilha: trilha,
    lugares: rows.map((r) => ({ r })),
    notas,
    blocos: blocos.filter(Boolean),
  }));
}
