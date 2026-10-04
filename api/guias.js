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

import { TITULOS_DE_BUSCA } from './_lib/titulos-de-busca.js';
import {
  COZINHAS, aSlug, MINIMO, destinoFixo, mapaDeCidades, cidadeDasLinhas, migalhas,
} from './_lib/taxonomia.js';
import { OCASIOES, COLS_OCASIAO, contarOcasioes } from './_lib/ocasioes.js';
import { layoutListagem, documentoListagem } from './_lib/listagem.js';

const SUPABASE_URL = 'https://lshecrzhcpqqiaytkemf.supabase.co';
const SUPABASE_KEY = 'sb_publishable_Q431fFjy1BM9vjCeQfkJZw_CQHgCQwl';
const SITE = 'https://selloapp.com.br';

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

  const trilhaItens = [{ nome: 'Início', href: '/' }, { nome: 'Guias', href: '/guias' }];
  const trilha = migalhas(trilhaItens);
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

  /* Mesmo layout das listagens (api/_lib/listagem.js): capa com a foto do
   * primeiro guia, e a página vira o mapa do site — guias em cartões com capa,
   * depois bairros, cozinhas e ocasiões em pílulas, cada bloco com a âncora que
   * o menu usa (/guias#bairros, #ocasioes). O nome editorial do guia é o
   * título do cartão; o título de BUSCA entra como legenda quando não há
   * subtítulo — ajuda a entender do que o guia trata sem decifrar o nome. */
  const capa = guias.find((g) => g.cover);
  const corpo = layoutListagem({
    kicker: 'Sello',
    h1,
    sub: description,
    trilha: trilhaItens,
    capa: capa ? { url: capa.cover } : null,
    fatos: [
      guias.length + ' guias',
      bairros.length ? bairros.length + ' bairros' : '',
      ocasioes.length ? ocasioes.length + ' ocasiões' : '',
    ].filter(Boolean),
    acao: { href: '#guias', txt: 'Ver os guias' },
    lugares: [],
    blocos: [
      {
        id: 'guias',
        olho: guias.length + ' guias',
        titulo: 'Todos os guias',
        tipo: 'capas',
        links: guias.map((g) => ({
          href: '/g/' + g.slug,
          txt: g.title,
          desc: g.subtitle || TITULOS_DE_BUSCA[g.slug] || '',
          img: g.cover,
        })),
      },
      { id: 'bairros', olho: 'Por bairro', titulo: 'Onde comer por bairro', links: bairros },
      { id: 'ocasioes', olho: 'Por ocasião', titulo: 'Para cada momento', links: ocasioes },
      { id: 'cozinhas', olho: 'Por cozinha', titulo: 'Por cozinha', links: cozinhas },
    ],
  });

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=86400');
  res.status(200).send(documentoListagem({
    title,
    description,
    canonical: `${SITE}/guias`,
    imagem: capa ? capa.cover : null,
    jsonlds: [jsonld, trilha.ld],
    capaUrl: capa ? capa.cover : null,
    corpo,
  }));
}
