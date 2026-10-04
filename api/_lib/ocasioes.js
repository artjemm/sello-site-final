/**
 * Ocasiões — "aberto no domingo", "até tarde", "com crianças", "bom e barato".
 *
 * POR QUE EXISTEM
 * A pesquisa de demanda (out/2026) mostrou que o topo — "melhor restaurante
 * de SP" — tem dono: Michelin, Veja, Paladar. O que sobra mal atendido é a
 * ocasião com recorte de lugar e de tempo. O autocomplete de "onde comer em
 * sp" completa com "hoje", "domingo", "barato", "com crianças", "depois das
 * 23h"; família e pet têm de 6 a 8 vezes a procura de "romântico". O catálogo
 * já sabe responder a essas perguntas — horário, faixa de preço, atributos —
 * e não tinha página que respondesse.
 *
 * O QUE CADA OCASIÃO PRECISA TER
 *   teste    — decide só com o DADO. Nada de palpite: horário vem dos períodos
 *              publicados, preço da faixa, atributo da lista de amenidades.
 *              Ausência de dado não é prova do contrário (regra do catálogo),
 *              então as páginas falam "onde há registro", nunca "só estes".
 *   criterio — a frase que diz ao leitor COMO a lista foi feita. Fica visível:
 *              é o que separa uma lista honesta de uma lista com cara de SEO.
 *   guia     — se um guia editorial já disputa a busca da cidade inteira, a
 *              página geral redireciona para ele (mesma regra das cozinhas,
 *              ver taxonomia.js). As páginas por bairro continuam: o guia não
 *              tem recorte de bairro.
 *
 * PISO E DUPLICATA
 * Valem os pisos de `MINIMO` (8 na geral, 5 por bairro). E uma página por
 * bairro só nasce se a ocasião CORTA a lista do bairro: se 21 dos 22 lugares
 * da Liberdade abrem no domingo, "abertos no domingo na Liberdade" é a página
 * do bairro repetida, e duas páginas iguais disputando a mesma busca perdem as
 * duas. Esse fato vai para o texto da página do bairro, não para página nova.
 */

/** Lê o mesmo sinal das duas formas de linha que circulam pelo site: a linha
 *  inteira (com catalog_json) e a linha leve do índice (campos achatados). */
function sinais(r) {
  const c = r.catalog_json || {};
  const preco = c.price_range ?? r.cj_price ?? r.price_level;
  return {
    periodos: r.hours_periods || c.hours_periods || [],
    amenidades: r.amenities || [],
    preco: preco == null ? null : Number(preco),
    melhorPara: c.best_for || r.best_for || [],
    vibes: c.vibe_tags || r.vibe_tags || [],
    intimidade: (c.semantic && c.semantic.intimacy) || r.intimacy || '',
    cozinha: c.cuisine || r.cuisine || '',
  };
}

const hora = (t) => Number(t);

/** Algum período fecha à meia-noite ou depois — vira o dia, ou fecha "0000". */
function fechaTarde(periodos) {
  return periodos.some((p) => p && p.open && p.close &&
    (p.close.day !== p.open.day || hora(p.close.time) === 0));
}

/** Aberto em dia de semana no horário de almoço (abre até 12h30 e segue até
 *  pelo menos 14h). */
function abreAlmoco(periodos) {
  return periodos.some((p) => p && p.open && p.close &&
    p.open.day >= 1 && p.open.day <= 5 && hora(p.open.time) <= 1230 &&
    (p.close.day !== p.open.day || hora(p.close.time) >= 1400));
}

/** Sábado ou domingo, abrindo até 11h. */
function abreFimDeSemanaCedo(periodos) {
  return periodos.some((p) => p && p.open && (p.open.day === 0 || p.open.day === 6) && hora(p.open.time) <= 1100);
}

/*
 * A ordem aqui é a ordem em que aparecem nas páginas. `nome` é o rótulo curto
 * (pílula), `titulo(onde)` o H1 e `busca(onde)` a frase do <title>, que segue
 * o jeito que as pessoas digitam. `onde` chega pronto: " em Pinheiros", ou ""
 * na página geral (a cidade entra depois, vinda do dado).
 */
export const OCASIOES = {
  'aberto-domingo': {
    nome: 'Abertos no domingo',
    titulo: (onde) => 'Abertos no domingo' + onde,
    busca: (onde) => 'Restaurantes abertos no domingo' + onde,
    criterio: 'abrem no domingo, pelo horário publicado de cada casa',
    teste: (s) => s.periodos.some((p) => p && p.open && p.open.day === 0),
  },
  'aberto-ate-tarde': {
    nome: 'Abertos até tarde',
    titulo: (onde) => 'Abertos até tarde' + onde,
    busca: (onde) => 'Restaurantes abertos depois da meia-noite' + onde,
    criterio: 'fecham à meia-noite ou depois em pelo menos um dia da semana',
    teste: (s) => fechaTarde(s.periodos),
    guia: 'depois-das-dez',
  },
  'almoco': {
    nome: 'Almoço',
    titulo: (onde) => 'Onde almoçar' + onde,
    busca: (onde) => 'Onde almoçar' + onde,
    criterio: 'abrem para o almoço em dia de semana, entre o meio-dia e as duas',
    teste: (s) => abreAlmoco(s.periodos),
    guia: 'almoco-que-resolve',
  },
  'brunch': {
    nome: 'Brunch',
    titulo: (onde) => 'Brunch' + onde,
    busca: (onde) => 'Onde tomar brunch' + onde,
    criterio: 'servem brunch e abrem cedo no sábado ou no domingo',
    teste: (s) => (s.melhorPara.includes('brunch') || s.cozinha === 'Brunch') && abreFimDeSemanaCedo(s.periodos),
  },
  'bom-e-barato': {
    nome: 'Bom e barato',
    titulo: (onde) => 'Bom e barato' + onde,
    busca: (onde) => 'Onde comer bem e barato' + onde,
    criterio: 'estão nas duas faixas de preço mais baixas do Sello ($ e $$, de quatro)',
    teste: (s) => s.preco === 1 || s.preco === 2,
  },
  // O par do bom e barato. 'restaurantes chiques sp' (3.600/mês) e 'restaurantes
  // mais caros de sp' são buscados assim; o critério é só a faixa de preço — nada
  // de 'estrela Michelin', que exige a lista oficial conferida.
  'alta-gastronomia': {
    nome: 'Alta gastronomia',
    titulo: (onde) => 'Alta gastronomia' + onde,
    // Título curto (até ~60): "Restaurantes chiques em SP: 43 lugares | Sello".
    busca: (onde) => 'Restaurantes chiques' + onde,
    criterio: 'estão na faixa de preço mais alta do Sello ($$$$, de quatro)',
    teste: (s) => s.preco === 4,
  },
  'romantico': {
    nome: 'Jantar a dois',
    titulo: (onde) => 'Jantar a dois' + onde,
    busca: (onde) => 'Restaurantes românticos' + onde,
    criterio: 'são indicados para encontro e têm clima intimista',
    teste: (s) => s.melhorPara.includes('date') && s.intimidade === 'intimate',
    guia: 'mesa-para-dois',
  },
  'com-criancas': {
    nome: 'Com crianças',
    titulo: (onde) => 'Para ir com crianças' + onde,
    busca: (onde) => 'Restaurantes para ir com crianças' + onde,
    criterio: 'têm registro de estrutura ou cardápio para crianças',
    teste: (s) => s.amenidades.includes('kids'),
  },
  'pet-friendly': {
    nome: 'Pet friendly',
    titulo: (onde) => 'Pet friendly' + onde,
    busca: (onde) => 'Restaurantes pet friendly' + onde,
    criterio: 'têm registro de que aceitam pets — vale confirmar com a casa antes',
    teste: (s) => s.amenidades.includes('pet_friendly') || s.vibes.some((v) => /pet/i.test(v)),
  },
  'ao-ar-livre': {
    nome: 'Ao ar livre',
    titulo: (onde) => 'Mesas ao ar livre' + onde,
    busca: (onde) => 'Restaurantes com área externa' + onde,
    criterio: 'têm registro de mesas ao ar livre',
    teste: (s) => s.amenidades.includes('outdoor'),
  },
  'vegetariano': {
    nome: 'Opções vegetarianas',
    titulo: (onde) => 'Opções vegetarianas' + onde,
    busca: (onde) => 'Restaurantes com opções vegetarianas' + onde,
    criterio: 'têm registro de opções vegetarianas ou veganas no cardápio',
    teste: (s) => s.amenidades.some((a) => /^veg/.test(a)) || s.cozinha === 'Vegana',
  },
};

/** A ocasião vale para esta linha? */
export function atende(slug, r) {
  const o = OCASIOES[slug];
  return !!o && o.teste(sinais(r));
}

/** Uma página por bairro só nasce se a ocasião corta a lista do bairro (ver
 *  o comentário do topo): até 85% dos lugares dele. */
export const CORTE_MAXIMO = 0.85;

/** Colunas que bastam para testar todas as ocasiões numa consulta leve (sem
 *  baixar o catalog_json inteiro de 500 restaurantes). */
export const COLS_OCASIAO =
  'hours_periods,amenities,price_level,cj_price:catalog_json->price_range,' +
  'best_for:catalog_json->best_for,vibe_tags:catalog_json->vibe_tags,' +
  'intimacy:catalog_json->semantic->>intimacy';

/**
 * Para uma lista leve de linhas (com `neighborhood`), devolve quantos lugares
 * cada ocasião tem na cidade e em cada bairro, e quais páginas existem:
 *   { geral: {slug: n}, porBairro: {bairro: {slug: n}}, nBairro: {bairro: n},
 *     existeGeral(slug), existeBairro(slug, bairro) }
 * A rota, o sitemap e os links usam esta MESMA conta, para nunca linkar ou
 * listar página que responde 404.
 */
export function contarOcasioes(rows, minimo) {
  const geral = {}, porBairro = {}, nBairro = {};
  for (const r of rows) {
    const b = r.neighborhood || (r.catalog_json && r.catalog_json.neighborhood);
    const s = sinais(r);
    if (b) nBairro[b] = (nBairro[b] || 0) + 1;
    for (const [slug, o] of Object.entries(OCASIOES)) {
      if (!o.teste(s)) continue;
      geral[slug] = (geral[slug] || 0) + 1;
      if (b) {
        const m = porBairro[b] || (porBairro[b] = {});
        m[slug] = (m[slug] || 0) + 1;
      }
    }
  }
  const existeGeral = (slug) => !OCASIOES[slug].guia && (geral[slug] || 0) >= minimo.ocasiao;
  const existeBairro = (slug, b) => {
    const n = (porBairro[b] && porBairro[b][slug]) || 0;
    const total = nBairro[b] || 0;
    return total >= minimo.bairro && n >= minimo.combinacao && n <= total * CORTE_MAXIMO;
  };
  return { geral, porBairro, nBairro, existeGeral, existeBairro };
}
