/**
 * O cartão de restaurante — usado nas listagens e nos guias.
 *
 * Um nome e um link não ajudam ninguém a decidir onde jantar. O que decide é
 * a cara do lugar, quanto custa, onde fica e se está aberto — e tudo isso já
 * existe no catálogo, só não estava sendo mostrado.
 *
 * Serve a dois públicos de uma vez: quem está escolhendo restaurante decide
 * sem abrir dez abas, e a busca vê conteúdo real e distinto em cada página em
 * vez de uma lista de links repetida.
 */

const DIAS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

export function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

export function cifroes(n) {
  const v = Number(n);
  return v >= 1 && v <= 4 ? '$'.repeat(v) : '';
}

/** Horário de HOJE, no fuso de São Paulo — o servidor da Vercel roda em UTC, e
 *  sem isso a página diria "quarta" ainda na terça à noite para quem lê aqui. */
function horarioDeHoje(hours) {
  if (!Array.isArray(hours) || !hours.length) return '';
  const agora = new Date(Date.now() - 3 * 60 * 60 * 1000);
  const hoje = DIAS[agora.getUTCDay()];
  const achado = hours.find((h) => h && h.label === hoje);
  if (!achado || !achado.value) return '';
  return /fechado/i.test(achado.value) ? 'Fechado hoje' : `Hoje ${achado.value}`;
}

/**
 * Miniatura em vez da foto inteira.
 *
 * As fotos do catálogo têm ~325 KB cada — tamanho de tela de restaurante, não
 * de selo de 96px. A página de Pinheiros tem 91 cartões: servir o original
 * seria mandar 29 MB para alguém decidir onde jantar, e velocidade é coisa que
 * o Google mede e desconta.
 *
 * O Storage do Supabase redimensiona sob demanda trocando /object/ por
 * /render/image/. A mesma foto sai com 7 KB — 44 vezes menor. URL que não seja
 * do nosso Storage passa intacta, porque o parâmetro não significaria nada lá.
 */
function miniatura(u, px) {
  const s = String(u ?? '');
  if (!s.includes('/storage/v1/object/public/')) return s;
  return s.replace('/storage/v1/object/public/', '/storage/v1/render/image/public/') +
    (s.includes('?') ? '&' : '?') + 'width=' + px + '&height=' + px + '&resize=cover&quality=70';
}

/** Só a rua e o número: o endereço completo do catálogo traz bairro, cidade,
 *  UF e CEP, e repetir isso em 90 cartões da mesma página é ruído. */
function ruaCurta(endereco) {
  return String(endereco ?? '').split(' - ')[0].trim();
}

export function cartao(r) {
  const c = r.catalog_json || {};
  const href = '/r/' + (r.share_slug || r.slug);
  const nota = c.sello_score ?? c.display_rating_10;
  const preco = cifroes(c.price_range != null ? c.price_range : r.price_level);
  const linha = [c.cuisine, c.neighborhood, preco].filter(Boolean).join(' · ');
  const hoje = horarioDeHoje(c.hours);
  const rua = ruaCurta(r.address);

  /* loading="lazy" importa aqui: uma página de bairro grande tem 90 cartões, e
   * carregar 90 fotos de uma vez torraria o carregamento — que o Google mede. */
  const foto = r.hero_image
    ? `<img class="ct__img" src="${esc(miniatura(r.hero_image, 192))}" alt="${esc(r.name)}" width="96" height="96" loading="lazy" decoding="async" />`
    : '<div class="ct__img ct__img--vazio"></div>';

  return (
    `<article class="ct">` +
      `<a class="ct__foto" href="${esc(href)}" aria-label="${esc(r.name)}">${foto}</a>` +
      `<div class="ct__corpo">` +
        `<h3 class="ct__nome"><a href="${esc(href)}">${esc(r.name)}</a>` +
          (nota ? `<span class="ct__nota">${esc(Number(nota).toFixed(1))}</span>` : '') +
        `</h3>` +
        (linha ? `<p class="ct__meta">${esc(linha)}</p>` : '') +
        (c.hook ? `<p class="ct__hook">${esc(c.hook)}</p>` : '') +
        `<dl class="ct__dados">` +
          (rua ? `<div><dt>Onde</dt><dd>${esc(rua)}</dd></div>` : '') +
          (hoje ? `<div><dt>Horário</dt><dd>${esc(hoje)}</dd></div>` : '') +
        `</dl>` +
      `</div>` +
    `</article>`
  );
}

/** Estilo dos cartões. Fica aqui para as listagens e os guias não divergirem
 *  visualmente com o tempo. */
export const CSS_CARTAO = `
  .ct { display:flex; gap:14px; padding:16px 0; border-top:1px solid #F1F1F3; }
  .ct__foto { flex:0 0 96px; display:block; }
  .ct__img { width:96px; height:96px; object-fit:cover; border-radius:12px; background:#EEE; display:block; }
  .ct__img--vazio { background:#F1F1F3; }
  .ct__corpo { flex:1; min-width:0; }
  .ct__nome { font-family:'Open Sans',sans-serif; font-size:16px; font-weight:700; margin:0 0 3px;
              display:flex; align-items:baseline; gap:8px; }
  .ct__nome a { color:var(--ink); text-decoration:none; }
  .ct__nome a:hover { text-decoration:underline; }
  .ct__nota { flex:none; font-size:13px; font-weight:700; color:var(--red); }
  .ct__meta { margin:0 0 5px; font-size:13px; color:#9AA0A8; }
  .ct__hook { margin:0 0 8px; font-size:14px; line-height:1.5; color:var(--muted); }
  .ct__dados { margin:0; display:flex; flex-wrap:wrap; gap:4px 18px; }
  .ct__dados div { display:flex; gap:6px; font-size:13px; }
  .ct__dados dt { color:#9AA0A8; margin:0; }
  .ct__dados dd { color:var(--muted); margin:0; }
  @media (max-width:520px) {
    .ct__foto { flex-basis:72px; }
    .ct__img { width:72px; height:72px; }
  }
`;
