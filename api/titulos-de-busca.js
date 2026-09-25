/**
 * Título de BUSCA de cada guia.
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
  // ── concentração alta: título direto, seguro ──────────────────────────────
  'nonna-aprovaria':                 'Os melhores restaurantes italianos de São Paulo',
  'alem-do-bom-retiro':              'Os melhores restaurantes coreanos de São Paulo',
  'muito-alem-da-tortilla':          'Os melhores restaurantes mexicanos de São Paulo',
  'lima-em-sao-paulo':               'Os melhores restaurantes peruanos de São Paulo',
  'japao-alem-do-sushi':             'Os melhores restaurantes japoneses de São Paulo',
  'o-brasil-no-prato':               'Os melhores restaurantes de comida brasileira em SP',
  'burger-sem-firula':               'Os melhores hambúrgueres de São Paulo',
  'no-meio-do-vapor':                'Os melhores lámen de São Paulo',
  'cru-e-preciso':                   'Os melhores sushis de São Paulo',
  'nas-maos-do-chef':                'Os melhores omakases de São Paulo',
  'kampai':                          'Os melhores izakayas de São Paulo',
  'no-ponto-certo':                  'As melhores casas de carne de São Paulo',
  'massa-critica':                   'As melhores pizzarias de São Paulo',
  'doce-final':                      'As melhores sobremesas de São Paulo',
  'a-fila-vale':                     'As melhores padarias e confeitarias de São Paulo',
  'mais-que-um-cafe':                'Os melhores cafés de São Paulo',
  'entre-duas-fatias':               'Os melhores sanduíches de São Paulo',

  // ── recorte geográfico ────────────────────────────────────────────────────
  'o-eixo-gastronomico':             'Onde comer em Pinheiros, Jardins e Itaim',
  'centro-das-atencoes':             'Onde comer no Centro de São Paulo',
  'zona-sul-sem-escalas':            'Onde comer na Zona Sul de São Paulo',
  'muito-alem-da-marginal':          'Onde comer na Zona Leste de São Paulo',
  'o-lado-norte-da-mesa':            'Onde comer na Zona Norte de São Paulo',

  // ── ocasião: como as pessoas realmente descrevem o que querem ─────────────
  'mesa-para-dois':                  'Restaurantes para jantar romântico em São Paulo',
  'domingo-em-familia':              'Restaurantes para ir em família em São Paulo',
  'almoco-que-resolve':              'Onde almoçar bem em São Paulo',
  'depois-das-dez':                  'Onde comer tarde da noite em São Paulo',
  'tem-motivo-tem-mesa':             'Restaurantes para comemorar em São Paulo',
  'quando-nao-da-pra-errar':         'Restaurantes para impressionar em São Paulo',
  'primeira-parada':                 'Onde comer em São Paulo: guia para quem visita',
  'balcao-preferencial':             'Restaurantes de balcão em São Paulo',

  // ── prêmio: as pessoas buscam pelo nome do prêmio ─────────────────────────
  'premio-paladar-2026-restaurantes': 'Prêmio Paladar 2026: os restaurantes vencedores',
  'premio-paladar-2026-bares':       'Prêmio Paladar 2026: os bares vencedores',

  // ── REVER: conceito editorial, sem assunto que o dado revele ──────────────
  // A proposta abaixo é chute educado. Quem escreveu o guia sabe o que ele
  // responde melhor do que a estatística das cozinhas — vale reescrever.
  'top-25-melhores':                 'Os melhores restaurantes de São Paulo',
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
