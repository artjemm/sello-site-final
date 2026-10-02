/**
 * A nota que o site mostra é a MESMA do app: a nota da comunidade.
 *
 * Desde 16/09/2026 o app trocou, nos cards e na ficha, a nota editorial
 * (`sello_score`) pela média das avaliações reais dos usuários (lib/notaComunidade.ts
 * no app). O site continuava mostrando a editorial — a Casa do Porco aparecia
 * 9,6 aqui e 9,3 no app. Uma nota diferente para o mesmo lugar, conforme a
 * porta de entrada, é exatamente o tipo de contradição que corrói confiança.
 *
 * Fonte: a RPC `get_restaurant_community_stats`, a mesma que o app usa, com os
 * mesmos parâmetros (uma pessoa = um voto, a partir da primeira nota, teto de
 * 300). Restaurante sem avaliação não mostra nota — não "zero".
 *
 * `sello_score` continua existindo e continua ordenando as listas (é a
 * curadoria); só não é mais o número exibido.
 */

const SUPABASE_URL = 'https://lshecrzhcpqqiaytkemf.supabase.co';
const SUPABASE_KEY = 'sb_publishable_Q431fFjy1BM9vjCeQfkJZw_CQHgCQwl';

// Cache de módulo: uma página de bairro tem 90 cartões e a função fica quente
// entre requisições. Cinco minutos acompanham o cache de borda das páginas.
let cache = null;
let cacheEm = 0;
const VALIDADE_MS = 5 * 60 * 1000;

/** slug do restaurante → { media, votos }. Falha devolve mapa vazio: sem nota
 *  é melhor que nota errada. */
export async function notasComunidade() {
  if (cache && Date.now() - cacheEm < VALIDADE_MS) return cache;
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_restaurant_community_stats`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ p_min_reviews: 1, p_limit: 300 }),
    });
    if (!res.ok) throw new Error(String(res.status));
    const linhas = await res.json();
    const mapa = new Map();
    for (const l of Array.isArray(linhas) ? linhas : []) {
      const media = Number(l.avg_rating);
      const votos = Number(l.review_count) || 0;
      if (l.restaurant_id && Number.isFinite(media) && votos >= 1) mapa.set(String(l.restaurant_id), { media, votos });
    }
    cache = mapa;
    cacheEm = Date.now();
    return mapa;
  } catch {
    return cache || new Map();
  }
}

/** 9.31 → "9,3" — a página é em português. */
export function fmtNota(n) {
  return Number(n).toFixed(1).replace('.', ',');
}
