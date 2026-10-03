/**
 * Avaliações externas — Tripadvisor e Google Maps — na ficha do site.
 *
 * Porta direta de `lib/avaliacoesExternas.ts` do app, com as mesmas regras,
 * para o site e o app mostrarem os mesmos cards:
 *
 *  - Todo número foi LIDO em algum lugar, nunca deduzido.
 *  - Tripadvisor: instantâneo manual (api/tripadvisor.js, gerado do app). Vale
 *    por VALIDADE_MESES a partir da leitura; depois o card some em vez de
 *    repetir número velho. Abaixo de PISO_AVALIACOES também some — "6
 *    avaliações" ao lado da comunidade desencoraja em vez de convencer.
 *  - Google: nota (`rating_score`) e contagem do próprio catálogo.
 *  - Escala da FONTE (0–5), nunca convertida para 0–10.
 *
 * Isto é conteúdo visível, NÃO dado estruturado: o aggregateRating da ficha
 * continua sendo só o da comunidade do Sello. O Google proíbe marcar nota
 * colhida de outro site.
 */
import { TRIPADVISOR } from './tripadvisor.js';

export const VALIDADE_MESES = 6;
export const PISO_AVALIACOES = 10;

export function instantaneoValido(lidoEm, agora) {
  const lido = new Date(lidoEm);
  if (Number.isNaN(lido.getTime())) return false;
  const limite = new Date(lido);
  limite.setMonth(limite.getMonth() + VALIDADE_MESES);
  return agora <= limite;
}

/** `r` é a linha de restaurants (slug, rating_score, review_count) e `c` o
 *  catalog_json. Lista vazia = a seção some. */
export function fontesExternas(r, c, agora = new Date()) {
  const fontes = [];
  const trip = TRIPADVISOR[r.slug];
  if (trip && trip.nota != null && instantaneoValido(trip.lidoEm, agora) && trip.total >= PISO_AVALIACOES) {
    fontes.push({ id: 'tripadvisor', nome: 'Tripadvisor', url: trip.url, nota: trip.nota, total: trip.total });
  }
  const placeId = c.google_place_id || r.google_place_id;
  if (placeId) {
    const nota = Number(r.rating_score ?? c.rating_score);
    const total = Number(c.google_review_count ?? r.review_count);
    fontes.push({
      id: 'google',
      nome: 'Google Maps',
      url: 'https://www.google.com/maps/place/?q=place_id:' + placeId,
      nota: Number.isFinite(nota) && nota > 0 ? nota : undefined,
      total: Number.isFinite(total) && total > 0 ? total : undefined,
    });
  }
  return fontes;
}

/** "4,6" — uma casa, sem arredondar para cima (4,55 → 4,5), como no app. */
export function fmtNotaFonte(n) {
  return (Math.floor(n * 10) / 10).toFixed(1).replace('.', ',');
}
