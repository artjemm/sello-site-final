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
  'Bares & Vida Noturna':     { slug: 'bares',            plural: 'bares' },
  'Asiática':                 { slug: 'asiaticos',        plural: 'restaurantes asiáticos' },
  'Mediterrânea':             { slug: 'mediterraneos',    plural: 'restaurantes mediterrâneos' },
  'Árabe & Oriente Médio':    { slug: 'arabes',           plural: 'restaurantes árabes' },
  'Francesa':                 { slug: 'franceses',        plural: 'restaurantes franceses' },
  'Frutos do Mar':            { slug: 'frutos-do-mar',    plural: 'restaurantes de frutos do mar' },
  'Brunch':                   { slug: 'brunch',           plural: 'lugares de brunch' },
  'Hot Dog':                  { slug: 'hot-dog',          plural: 'hot dogs' },
  'Vegana':                   { slug: 'veganos',          plural: 'restaurantes veganos' },
};

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
export const MINIMO = { bairro: 8, cozinha: 8, combinacao: 5 };
