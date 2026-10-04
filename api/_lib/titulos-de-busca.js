/**
 * Título de BUSCA de cada guia.
 *
 * Out/2026: os títulos de cozinha e ocasião seguem a pesquisa de palavras-chave
 * (docs/marketing/seo/palavras-chave-comida-sp.md no repo do app) — "churrascarias
 * em sp" tem 18 mil buscas/mês e "casas de carne" quase nenhuma.
 *
 * Os guias têm nome editorial — "Não é miojo", "Nonna aprovaria", "Cru e
 * preciso". São bons e é assim que a marca fala. Só que ninguém procura por
 * eles no Google: quem quer lámen digita "melhor lámen são paulo".
 *
 * O <title> da página é a linha azul do resultado e o maior sinal que a página
 * manda sobre o próprio assunto. Enquanto ele dizia "Não é miojo", o Google não
 * tinha como saber que aquilo era um guia de lámen — e o guia, que é bom,
 * ficava invisível para quem o procurava.
 *
 * Aqui os dois convivem: o nome editorial continua sendo o H1 que a pessoa lê,
 * e este mapa entra só no <title> e na descrição. Não se troca um pelo outro.
 *
 * COMO FOI MONTADO: a partir da cozinha e do bairro dominantes de cada guia.
 * Onde a concentração era alta (Coreana 100%, Hambúrguer 100%) o título é
 * seguro; onde o guia é um conceito editorial ("Fora do óbvio", "No radar") a
 * proposta é mais fraca e está marcada com REVER — esses pedem o julgamento de
 * quem escreveu o guia, não estatística.
 *
 * Guia sem entrada aqui cai no nome editorial, como era antes. Nada quebra.
 */
export const TITULOS_DE_BUSCA = {
  // "X em SP" na frente nos guias de cozinha/prato (out/2026): é a forma como a
  // busca chega ("pizzarias em sp", "lamen em sp") — a UF é buscada ~6x mais
  // que o nome da cidade. "melhores" e o nome por extenso ficam depois.
  // ── concentração alta: título direto, seguro ──────────────────────────────
  'nonna-aprovaria':                 'Restaurantes italianos em SP: os melhores de São Paulo',
  'alem-do-bom-retiro':              'Os melhores restaurantes coreanos de São Paulo',
  'muito-alem-da-tortilla':          'Os melhores restaurantes mexicanos de São Paulo',
  'lima-em-sao-paulo':               'Os melhores restaurantes peruanos de São Paulo',
  'japao-alem-do-sushi':             'Restaurantes japoneses em SP: os melhores de São Paulo',
  'o-brasil-no-prato':               'Os melhores restaurantes de comida brasileira em SP',
  'burger-sem-firula':               'Hamburguerias em SP: os melhores hambúrgueres',
  'no-meio-do-vapor':                'Lámen em SP: os melhores ramen de São Paulo',
  'cru-e-preciso':                   'Sushi em SP: os melhores de São Paulo',
  'nas-maos-do-chef':                'Os melhores omakases de São Paulo',
  'kampai':                          'Os melhores izakayas de São Paulo',
  'no-ponto-certo':                  'Churrascarias e casas de carne em SP: as melhores',
  'massa-critica':                   'Pizzarias em SP: as melhores pizzas de São Paulo',
  'doce-final':                      'Docerias e sobremesas em SP: as melhores de São Paulo',
  'a-fila-vale':                     'Padarias em SP: as melhores padarias e confeitarias',
  'mais-que-um-cafe':                'Cafeterias em SP: os melhores cafés de São Paulo',
  'entre-duas-fatias':               'Os melhores sanduíches de São Paulo',

  // ── recorte geográfico ────────────────────────────────────────────────────
  'o-eixo-gastronomico':             'Onde comer em Pinheiros, Jardins e Itaim',
  'centro-das-atencoes':             'Onde comer no Centro de São Paulo',
  'zona-sul-sem-escalas':            'Onde comer na Zona Sul de São Paulo',
  'muito-alem-da-marginal':          'Onde comer na Zona Leste de São Paulo',
  'o-lado-norte-da-mesa':            'Onde comer na Zona Norte de São Paulo',

  // ── ocasião: como as pessoas realmente descrevem o que querem ─────────────
  'mesa-para-dois':                  'Restaurantes românticos em SP: jantar a dois',
  'domingo-em-familia':              'Restaurantes para ir em família em São Paulo',
  'almoco-que-resolve':              'Onde almoçar bem em São Paulo',
  'depois-das-dez':                  'Onde comer tarde da noite em São Paulo',
  'tem-motivo-tem-mesa':             'Onde comemorar aniversário em SP: restaurantes',
  'quando-nao-da-pra-errar':         'Restaurantes para impressionar em São Paulo',
  'primeira-parada':                 'Onde comer em São Paulo: guia para quem visita',
  'balcao-preferencial':             'Restaurantes de balcão em São Paulo',

  // ── prêmio: as pessoas buscam pelo nome do prêmio ─────────────────────────
  'premio-paladar-2026-restaurantes': 'Prêmio Paladar 2026: os restaurantes vencedores',
  'premio-paladar-2026-bares':       'Prêmio Paladar 2026: os bares vencedores',

  // ── REVER: conceito editorial, sem assunto que o dado revele ──────────────
  // A proposta abaixo é chute educado. Quem escreveu o guia sabe o que ele
  // responde melhor do que a estatística das cozinhas — vale reescrever.
  'top-25-melhores':                 'Melhores restaurantes em SP: os 25 do Sello',
  'onde-comer-sem-errar':            'Restaurantes bons de verdade em São Paulo',
  'a-proxima-reserva':               'Restaurantes para reservar em São Paulo',
  'so-funciona-em-sao-paulo':        'Restaurantes que só existem em São Paulo',
  'descoberta-obrigatoria':          'Restaurantes fora do óbvio em São Paulo',
  'ainda-pouco-falados':             'Restaurantes pouco conhecidos em São Paulo',
  'lugares-para-voltar-sempre':      'Restaurantes para voltar sempre em São Paulo',
  'no-radar':                        'Os restaurantes novos que estão dando o que falar em SP',
  'em-alta-no-sello':                'Os restaurantes em alta em São Paulo',
  'novidades-no-sello':              'Restaurantes novos em São Paulo',
  'o-motivo-da-fama':                'Restaurantes famosos por um prato só em São Paulo',
  'entre-quem-entende':              'Os restaurantes preferidos de quem entende de comida',
  'fora-do-cep':                     'Restaurantes que não parecem de São Paulo',
  'a-cara-de-sao-paulo':             'Os restaurantes que representam São Paulo',
  'antes-de-virar-moda':             'Restaurantes sem fila em São Paulo',
  'vale-o-desvio':                   'Restaurantes que valem o deslocamento em São Paulo',
  'o-assunto-da-semana':             'Os restaurantes mais comentados de São Paulo',
  'primeira-recomendacao':           'Os restaurantes que os paulistanos indicam',
};
