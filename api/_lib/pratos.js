/**
 * Páginas por PRATO — /pratos/:prato ("onde comer carbonara").
 *
 * POR QUE EXISTEM
 * Muita gente não busca por cozinha nem por bairro, busca pelo prato:
 * "carbonara em sp", "onde comer tiramisù", "massas em sp". O catálogo já sabe
 * a resposta — cada ficha tem "o que pedir" (`catalog_json.dishes.must_order`),
 * escrito pela curadoria —, só não havia página que juntasse.
 *
 * DE ONDE VEM O DADO
 * Só de `dishes.must_order`: o prato entra quando a curadoria manda PEDIR ele
 * ali, não quando ele só existe no cardápio. É o que torna a página uma
 * recomendação, e não uma busca no cardápio. O cartão mostra o nome exato do
 * prato na casa ("Tonnarelli alla carbonara"), para quem lê saber o que pedir.
 *
 * O QUE NÃO SE FAZ
 *  - Página fina: abaixo de `MINIMO_PRATO` casas a rota devolve 404 e a URL não
 *    entra no sitemap (mesma regra das outras páginas geradas).
 *  - Canibalizar guia: prato que um guia editorial já disputa (pizza,
 *    hambúrguer, lámen, sushi) não ganha página — `guia` redireciona (308).
 *    O guia é curadoria humana e fica com a busca.
 *
 * `re` roda sobre o nome do prato sem acento e em minúsculas; `nao`, quando
 * existe, tira os falsos positivos ("pasta de missô" não é massa).
 * `titulo(onde)` é o H1; `busca(onde)` é o começo do <title>.
 */

export const MINIMO_PRATO = 8;

export const PRATOS = {
  massas: {
    nome: 'Massas', re: /\b(massa|massas|pasta|spaghetti|espaguete|tagliatelle|tagliolini|pappardelle|fettuccine|fettuccini|rigatoni|linguine|tonnarelli|bucatini|paccheri|mafaldine|gnocchi|nhoque|ravioli|raviolo|cappelletti|tortellini|agnolotti|lasanha|lasagna)\b/,
    // "pasta de missô", "massa folhada", "espaguete de lula/abobrinha" não são massa.
    nao: /pasta de |massa (folhada|madre|de pao|crocante|filo)|(espaguete|spaghetti|talharim) de (fios|lula|abobrinha|pupunha|palmito|legumes)|fios de lula/,
    titulo: (o) => 'Onde comer massas' + o, busca: (o) => 'Massas' + o,
    frase: 'têm uma massa entre os pratos que a curadoria manda pedir',
  },
  carbonara: {
    nome: 'Carbonara', re: /carbonara/,
    titulo: (o) => 'Onde comer carbonara' + o, busca: (o) => 'Carbonara' + o,
    frase: 'têm carbonara entre os pratos que a curadoria manda pedir',
  },
  nhoque: {
    nome: 'Nhoque', re: /nhoque|gnocchi/,
    titulo: (o) => 'Onde comer nhoque' + o, busca: (o) => 'Nhoque' + o,
    frase: 'têm nhoque entre os pratos que a curadoria manda pedir',
  },
  ravioli: {
    nome: 'Ravióli', re: /ravio|raviol|cappelletti|tortellini|agnolotti/,
    titulo: (o) => 'Onde comer ravióli e massas recheadas' + o, busca: (o) => 'Ravióli' + o,
    frase: 'têm ravióli ou outra massa recheada entre os pratos que a curadoria manda pedir',
  },
  lasanha: {
    nome: 'Lasanha', re: /lasanh|lasagn/,
    titulo: (o) => 'Onde comer lasanha' + o, busca: (o) => 'Lasanha' + o,
    frase: 'têm lasanha entre os pratos que a curadoria manda pedir',
  },
  parmegiana: {
    nome: 'Parmegiana', re: /parmegian|parmigian/,
    titulo: (o) => 'Onde comer parmegiana' + o, busca: (o) => 'Parmegiana' + o,
    frase: 'têm parmegiana entre os pratos que a curadoria manda pedir',
  },
  tiramisu: {
    nome: 'Tiramisù', re: /tiramis/,
    titulo: (o) => 'Onde comer tiramisù' + o, busca: (o) => 'Tiramisù' + o,
    frase: 'têm tiramisù entre os pratos que a curadoria manda pedir',
  },
  'pizza-margherita': {
    nome: 'Pizza margherita', re: /margherita|marguerita/,
    titulo: (o) => 'Onde comer pizza margherita' + o, busca: (o) => 'Pizza margherita' + o,
    frase: 'têm a margherita entre os pratos que a curadoria manda pedir',
  },
  pastrami: {
    nome: 'Pastrami', re: /pastrami/,
    titulo: (o) => 'Onde comer pastrami' + o, busca: (o) => 'Pastrami' + o,
    frase: 'têm pastrami entre os pratos que a curadoria manda pedir',
  },
  ceviche: {
    nome: 'Ceviche', re: /ceviche/,
    titulo: (o) => 'Onde comer ceviche' + o, busca: (o) => 'Ceviche' + o,
    frase: 'têm ceviche entre os pratos que a curadoria manda pedir',
  },
  feijoada: {
    nome: 'Feijoada', re: /feijoada/,
    titulo: (o) => 'Onde comer feijoada' + o, busca: (o) => 'Feijoada' + o,
    frase: 'têm feijoada entre os pratos que a curadoria manda pedir',
  },
  picanha: {
    nome: 'Picanha', re: /picanha/,
    titulo: (o) => 'Onde comer picanha' + o, busca: (o) => 'Picanha' + o,
    frase: 'têm picanha entre os pratos que a curadoria manda pedir',
  },
  'bife-ancho': {
    nome: 'Bife ancho', re: /\bancho\b/,
    titulo: (o) => 'Onde comer bife ancho' + o, busca: (o) => 'Bife ancho' + o,
    frase: 'têm ancho entre os pratos que a curadoria manda pedir',
  },
  coxinha: {
    nome: 'Coxinha', re: /coxinha/,
    titulo: (o) => 'Onde comer coxinha' + o, busca: (o) => 'Coxinha' + o,
    frase: 'têm coxinha entre os pratos que a curadoria manda pedir',
  },
  'pao-de-queijo': {
    nome: 'Pão de queijo', re: /pao de queijo/,
    titulo: (o) => 'Onde comer pão de queijo' + o, busca: (o) => 'Pão de queijo' + o,
    frase: 'têm pão de queijo entre os pratos que a curadoria manda pedir',
  },
  croissant: {
    nome: 'Croissant', re: /croissant/,
    titulo: (o) => 'Onde comer croissant' + o, busca: (o) => 'Croissant' + o,
    frase: 'têm croissant entre os pratos que a curadoria manda pedir',
  },
  cheesecake: {
    nome: 'Cheesecake', re: /cheesecake/,
    titulo: (o) => 'Onde comer cheesecake' + o, busca: (o) => 'Cheesecake' + o,
    frase: 'têm cheesecake entre os pratos que a curadoria manda pedir',
  },
  // "sorvete são paulo" e "sorveterias são paulo": 3.600/mês cada.
  sorvete: {
    nome: 'Sorvete e gelato', re: /sorvete|gelato|gelatos|gelateria/,
    titulo: (o) => 'Onde tomar sorvete e gelato' + o, busca: (o) => 'Sorvete e gelato' + o,
    frase: 'têm sorvete ou gelato entre os pratos que a curadoria manda pedir',
  },
  'bolinho-de-bacalhau': {
    nome: 'Bolinho de bacalhau', re: /bolinho.*bacalhau|bacalhau.*bolinho/,
    titulo: (o) => 'Onde comer bolinho de bacalhau' + o, busca: (o) => 'Bolinho de bacalhau' + o,
    frase: 'têm bolinho de bacalhau entre os pratos que a curadoria manda pedir',
  },

  // ── pratos que um guia já disputa: sem página própria, vão para o guia ────
  pizza:      { nome: 'Pizza', re: /pizza/, guia: 'massa-critica' },
  hamburguer: { nome: 'Hambúrguer', re: /burger|hamburg/, guia: 'burger-sem-firula' },
  lamen:      { nome: 'Lámen', re: /lamen|ramen/, guia: 'no-meio-do-vapor' },
  sushi:      { nome: 'Sushi', re: /sushi|nigiri|niguiri|sashimi/, guia: 'cru-e-preciso' },
};

const semAcento = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Os nomes dos pratos "o que pedir" de uma linha — aceita a linha inteira
 *  (catalog_json) ou a do índice leve (`pratos` já extraído). */
export function nomesDePratos(r) {
  const lista = r && r.pratos != null
    ? r.pratos
    : r && r.catalog_json && r.catalog_json.dishes && r.catalog_json.dishes.must_order;
  let arr = lista;
  if (typeof arr === 'string') { try { arr = JSON.parse(arr); } catch { arr = []; } }
  return (Array.isArray(arr) ? arr : []).map((d) => d && d.name).filter(Boolean);
}

/** Os pratos desta casa que casam com o prato `slug` (nomes como estão na
 *  ficha). Vazio = a casa não entra na página. */
export function pratosQueCasam(slug, r) {
  const p = PRATOS[slug];
  if (!p) return [];
  return nomesDePratos(r).filter((n) => { const t = semAcento(n); return p.re.test(t) && !(p.nao && p.nao.test(t)); });
}

/** slug → quantas casas, para os pratos com página própria (sem `guia`). */
export function contarPratos(rows) {
  const n = {};
  for (const slug of Object.keys(PRATOS)) {
    if (PRATOS[slug].guia) continue;
    n[slug] = rows.filter((r) => pratosQueCasam(slug, r).length).length;
  }
  return n;
}

/** Para onde aponta o link de um prato: a página dele (se passa do piso), o
 *  guia que o substitui, ou nada. */
export function destinoPrato(slug, contagem) {
  const p = PRATOS[slug];
  if (!p) return null;
  if (p.guia) return '/g/' + p.guia;
  return (contagem[slug] || 0) >= MINIMO_PRATO ? '/pratos/' + slug : null;
}

/** O primeiro prato com página que casa com um nome de prato — para a ficha
 *  transformar "Spaghetti alla carbonara" num link para /pratos/carbonara.
 *  Prefere o mais específico (carbonara antes de massas). */
const ORDEM_ESPECIFICA = Object.keys(PRATOS).filter((s) => s !== 'massas').concat('massas');
export function pratoDoNome(nome) {
  const t = semAcento(nome);
  for (const slug of ORDEM_ESPECIFICA) if (PRATOS[slug].re.test(t) && !(PRATOS[slug].nao && PRATOS[slug].nao.test(t))) return slug;
  return null;
}
