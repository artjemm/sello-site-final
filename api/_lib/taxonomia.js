/**
 * Como a curadoria nomeia × como as pessoas buscam.
 *
 * O catálogo usa rótulos editoriais — "Doces & Bakery", "Drinks & Listening
 * Bars". São bons para organizar e péssimos para busca: ninguém digita
 * "doces & bakery" no Google, digita "confeitaria" ou "padaria".
 *
 * Cada entrada tem:
 *   slug     — o endereço da página (é o que mais carrega o termo de busca)
 *   plural   — como a pessoa chama o lugar: "restaurantes japoneses", "bares"
 *   guia     — se um guia editorial JÁ disputa essa busca. Quando tem, não se
 *              gera a página de cozinha: duas páginas nossas competindo pela
 *              mesma busca dividem a força e as duas perdem (canibalização).
 *              O guia vence porque é curadoria humana, não lista automática.
 */
import { esc } from './cartao.js';

export const COZINHAS = {
  'Japonesa':                 { slug: 'japoneses',        plural: 'restaurantes japoneses',   guia: 'japao-alem-do-sushi' },
  'Italiana':                 { slug: 'italianos',        plural: 'restaurantes italianos',   guia: 'nonna-aprovaria' },
  'Brasileira':               { slug: 'brasileiros',      plural: 'restaurantes brasileiros', guia: 'o-brasil-no-prato' },
  'Coreana':                  { slug: 'coreanos',         plural: 'restaurantes coreanos',    guia: 'alem-do-bom-retiro' },
  'Peruana':                  { slug: 'peruanos',         plural: 'restaurantes peruanos',    guia: 'lima-em-sao-paulo' },
  'Mexicana':                 { slug: 'mexicanos',        plural: 'restaurantes mexicanos',   guia: 'muito-alem-da-tortilla' },
  'Hambúrguer':               { slug: 'hamburguerias',    plural: 'hamburguerias',            guia: 'burger-sem-firula' },
  'Carnes':                   { slug: 'casas-de-carne',   plural: 'casas de carne',           guia: 'no-ponto-certo' },
  'Pizza':                    { slug: 'pizzarias',        plural: 'pizzarias',                guia: 'massa-critica' },
  'Pizza Napolitana':         { slug: 'pizzas-napolitanas', plural: 'pizzarias napolitanas',  guia: 'massa-critica' },
  'Doces & Bakery':           { slug: 'confeitarias',     plural: 'confeitarias e padarias',  guia: 'doce-final' },
  'Cafés':                    { slug: 'cafeterias',       plural: 'cafeterias',               guia: 'mais-que-um-cafe' },
  'Deli & Sanduíches':        { slug: 'sanduicherias',    plural: 'sanduicherias',            guia: 'entre-duas-fatias' },

  // ── sem guia: aqui a página de cozinha é a única chance de aparecer ───────
  'Boteco':                   { slug: 'botecos',          plural: 'botecos' },
  'Drinks & Listening Bars':  { slug: 'bares-de-drinks',  plural: 'bares de drinks' },
  // A página de bares é a de maior busca depois de "restaurantes" ("bares de sp",
  // 22 mil/mês) e junta as três categorias de bar (ver GRUPOS_COZINHA).
  'Bares & Vida Noturna':     { slug: 'bares',            plural: 'bares',
                                titulo: (onde) => 'Bares' + onde + ': os melhores bares, botecos e drinks' },
  'Asiática':                 { slug: 'asiaticos',        plural: 'restaurantes asiáticos' },
  'Mediterrânea':             { slug: 'mediterraneos',    plural: 'restaurantes mediterrâneos' },
  'Árabe & Oriente Médio':    { slug: 'arabes',           plural: 'restaurantes árabes' },
  'Francesa':                 { slug: 'franceses',        plural: 'restaurantes franceses' },
  'Frutos do Mar':            { slug: 'frutos-do-mar',    plural: 'restaurantes de frutos do mar' },
  // Brunch é mais OCASIÃO que cozinha: a página de ocasião (ocasioes.js) junta
  // os 8 de cozinha "Brunch" e os ~40 outros que servem brunch no fim de semana.
  'Brunch':                   { slug: 'brunch',           plural: 'lugares de brunch',        ocasiao: 'brunch' },
  'Hot Dog':                  { slug: 'hot-dog',          plural: 'hot dogs' },
  'Vegana':                   { slug: 'veganos',          plural: 'restaurantes veganos' },
};

/**
 * GRUPOS de cozinha: a página da chave mostra as casas de todas as categorias
 * da lista. "Bares em SP" é como a pessoa busca; o catálogo divide em três
 * (bar, bar de drinks, boteco). As páginas de cada parte continuam existindo.
 */
export const GRUPOS_COZINHA = {
  'Bares & Vida Noturna': ['Bares & Vida Noturna', 'Drinks & Listening Bars', 'Boteco'],
};

/**
 * REGIÕES: o nome que a pessoa busca para um conjunto de bairros do catálogo.
 * Ninguém busca "Cerqueira César": busca "Jardins". A página da região soma os
 * pedaços; a de cada pedaço continua existindo.
 */
export const REGIOES = {
  'Jardins': ['Jardins', 'Jardim Paulista', 'Cerqueira César', 'Jardim Paulistano', 'Jardim Europa'],
  'Centro': ['Centro Histórico de São Paulo', 'República', 'Vila Buarque', 'Santa Cecília', 'Santa Cecilia', 'Campos Elíseos'],
};

/** "em Pinheiros", mas "nos Jardins" e "no Centro": a região leva o artigo. */
const EM_REGIAO = { Jardins: 'nos Jardins', Centro: 'no Centro' };
export const emBairro = (b) => EM_REGIAO[b] || 'em ' + b;

/** As categorias que uma página de cozinha mostra. */
export const membrosCozinha = (c) => GRUPOS_COZINHA[c] || [c];
/** As páginas de cozinha em que uma casa desta categoria conta (ela + grupos). */
export const cozinhasAlvo = (c) => [c, ...Object.keys(GRUPOS_COZINHA).filter((g) => g !== c && GRUPOS_COZINHA[g].includes(c))];
/** Os bairros do catálogo que uma página de bairro mostra. */
export const membrosBairro = (b) => REGIOES[b] || [b];
/** As páginas de bairro em que uma casa deste bairro conta (ele + regiões). */
export const bairrosAlvo = (b) => [b, ...Object.keys(REGIOES).filter((r) => r !== b && REGIOES[r].includes(b))];
/** Filtro PostgREST "campo in (a, b)" com aspas (nomes têm espaço e acento). */
export const filtroIn = (campo, valores) =>
  campo + '=in.(' + valores.map((v) => encodeURIComponent('"' + String(v).replace(/"/g, '') + '"')).join(',') + ')';

/** Acento e espaço fora, para virar endereço. */
export function aSlug(s) {
  return String(s ?? '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Piso de qualidade. Abaixo disto a página nasce fina, e página fina em
 *  escala é o que faz o Google desconfiar do site inteiro — o contrário do
 *  que estas páginas existem para conseguir. */
export const MINIMO = { bairro: 8, cozinha: 8, combinacao: 5, ocasiao: 8 };

/** Para onde vai a página de uma cozinha que NÃO tem página própria porque
 *  outra página já disputa a busca: o guia editorial ou a página de ocasião.
 *  null = a cozinha tem (ou pode ter) página própria. */
export function destinoFixo(t) {
  if (!t) return null;
  if (t.guia) return '/g/' + t.guia;
  if (t.ocasiao) return '/ocasioes/' + t.ocasiao;
  return null;
}

/* ══════════════════════════════════════════════════════════════════════════
 * A CIDADE vem do dado, nunca do código.
 *
 * O catálogo guarda a cidade de cada restaurante em `restaurants.city_id`, que
 * aponta para a tabela `cities` (nome e UF). Fixar "São Paulo" numa string
 * daria certo hoje e mentiria no dia em que entrar a segunda cidade — e
 * ninguém lembraria de caçar a string. Aqui a cidade de uma página é a das
 * linhas que ela mostra: se todas são da mesma, ela entra no título; se a
 * página misturar cidades, o título fica sem cidade em vez de inventar uma.
 *
 * No <title> vai a UF, não o nome: "SP" é buscado umas seis vezes mais que
 * "são paulo", e a UF nunca está errada — num bairro de Campinas, ", SP"
 * continua verdade. O nome por extenso fica para o texto, onde cabe.
 * ══════════════════════════════════════════════════════════════════════════ */

/** Linhas de `cities` (id, name, state) → Map id→{ nome, uf }. */
export function mapaDeCidades(linhas) {
  const m = new Map();
  for (const c of linhas || []) if (c && c.id && c.name) m.set(c.id, { nome: c.name, uf: c.state || '' });
  return m;
}

/** A cidade comum a todas as linhas, ou null se elas não concordam (ou não
 *  dizem). Melhor não ter cidade no título que ter a cidade errada. */
export function cidadeDasLinhas(rows, cidades) {
  const ids = new Set((rows || []).map((r) => r && r.city_id).filter(Boolean));
  return ids.size === 1 ? cidades.get([...ids][0]) || null : null;
}

/* ══════════════════════════════════════════════════════════════════════════
 * Navegação comum das páginas geradas: migalhas e rodapé.
 *
 * Ficam aqui, e não em cada rota, para o caminho "Início › Guias › Página" e
 * os links do rodapé serem iguais em todo lugar — inclusive em quem quiser
 * importar daqui no futuro. Página que só recebe link e não devolve nenhum é
 * beco sem saída para quem lê e para o robô de busca.
 * ══════════════════════════════════════════════════════════════════════════ */

const SITE = 'https://selloapp.com.br';

/** JSON-LD dentro de <script>: um "</script>" vindo do banco fecharia a tag
 *  no meio do JSON. Escapar o "<" resolve e continua sendo JSON válido. */
export function jsonLd(obj) {
  return '<script type="application/ld+json">' + JSON.stringify(obj).replace(/</g, '\u003c') + '</script>';
}

/**
 * Migalhas visíveis + BreadcrumbList. `itens` é [{ nome, href }], do Início à
 * página atual; o último não leva link (é onde a pessoa já está), mas leva a
 * URL no JSON-LD, que é como o Google pede.
 */
export function migalhas(itens) {
  const html = '<nav class="migalhas" aria-label="Você está em"><ol>' +
    itens.map((it, i) => '<li>' + (i < itens.length - 1
      ? '<a href="' + esc(it.href) + '">' + esc(it.nome) + '</a>'
      : '<span aria-current="page">' + esc(it.nome) + '</span>') + '</li>').join('') +
    '</ol></nav>';
  const ld = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: itens.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: it.nome,
      item: SITE + it.href,
    })),
  };
  // `itens` vai junto para quem monta a trilha com outra marcação (listagem.js).
  return { html, ld, itens };
}

export function rodape() {
  return '<footer class="rodape"><nav aria-label="Rodapé">' +
    '<a href="/">Início</a><a href="/guias">Guias</a><a href="/guias#ocasioes">Ocasiões</a><a href="/sobre">Sobre</a><a href="/baixar">Baixar o app</a>' +
    '</nav></footer>';
}

export const CSS_NAV = `
  .migalhas ol { list-style:none; margin:0 0 18px; padding:0; display:flex; flex-wrap:wrap;
                 gap:4px 0; font-size:13px; color:#9AA0A8; }
  .migalhas li { padding:0; border:0; }
  .migalhas li + li::before { content:"›"; margin:0 8px; color:#C4C8CE; }
  .migalhas a { display:inline; color:var(--muted); font-size:13px; font-weight:400; text-decoration:none; }
  .migalhas a:hover { color:var(--red); }
  .rodape { max-width:680px; margin:48px auto 0; padding-top:20px; border-top:1px solid #F1F1F3; }
  .rodape nav { display:flex; flex-wrap:wrap; justify-content:center; gap:8px 22px; font-size:14px; }
  .rodape a { color:var(--muted); text-decoration:none; }
  .rodape a:hover { color:var(--red); }
`;
