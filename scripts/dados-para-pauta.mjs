// Números para pauta de imprensa (docs/marketing/imprensa/kit-de-imprensa.md no repo do app).
// Mesmo critério das páginas de ocasião (api/ocasioes.js). Só leitura, chave pública.
// Uso: node scripts/dados-para-pauta.mjs

import { atende } from '../api/ocasioes.js';
const K = 'sb_publishable_Q431fFjy1BM9vjCeQfkJZw_CQHgCQwl';
const U = 'https://lshecrzhcpqqiaytkemf.supabase.co/rest/v1';
const h = { apikey: K, Authorization: `Bearer ${K}` };
const rows = (await (await fetch(`${U}/restaurants?is_active=eq.true&select=slug,name,amenities,price_level,hours_periods,catalog_json&limit=2000`, { headers: h })).json()).filter(r => r.catalog_json && r.catalog_json.sello_in_catalog !== false);
const lists = await (await fetch(`${U}/lists?is_curated=eq.true&is_public=eq.true&select=slug&limit=500`, { headers: h })).json();
const n = rows.length;
const pct = (a) => Math.round(100 * a / n) + '%';
const c = (f) => rows.filter(f).length;
console.log('restaurantes', n, 'guias', lists.length);
for (const o of ['aberto-domingo','aberto-ate-tarde','almoco','brunch','bom-e-barato','com-criancas','pet-friendly']) console.log(o, c(r=>atende(o,r)), pct(c(r=>atende(o,r))));
const byB = {}; for (const r of rows) { const b = r.catalog_json.neighborhood; (byB[b] ||= []).push(r); }
const big = Object.entries(byB).filter(([b, rs]) => rs.length >= 15);
console.log('bairros >=15:', big.map(([b, rs]) => `${b} ${rs.length} | tarde ${Math.round(100*rs.filter(r=>atende('aberto-ate-tarde',r)).length/rs.length)}% | dom ${Math.round(100*rs.filter(r=>atende('aberto-domingo',r)).length/rs.length)}% | $-$$ ${Math.round(100*rs.filter(r=>atende('bom-e-barato',r)).length/rs.length)}%`).join('\n'));
const segFechado = c(r => (r.hours_periods||[]).length && !(r.hours_periods||[]).some(p => p.open?.day === 1));
console.log('fecham segunda', segFechado, pct(segFechado));
const cuis = {}; for (const r of rows) cuis[r.catalog_json.cuisine] = (cuis[r.catalog_json.cuisine]||0)+1;
console.log(Object.entries(cuis).sort((a,b)=>b[1]-a[1]).slice(0,10));
const precoCuis = {}; for (const r of rows) { const p = r.catalog_json.price_range ?? r.price_level; if (!p) continue; const k = r.catalog_json.cuisine; (precoCuis[k] ||= []).push(p); }
console.log(Object.entries(precoCuis).filter(e=>e[1].length>=10).map(([k,v])=>[k, (v.reduce((a,b)=>a+b,0)/v.length).toFixed(2), v.length]).sort((a,b)=>b[1]-a[1]));
