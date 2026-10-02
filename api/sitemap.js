/**
 * Sitemap — /sitemap.xml
 *
 * O sitemap anterior tinha UMA url: a home. As centenas de fichas de
 * restaurante e os guias existiam, respondiam 200, e o Google não tinha como
 * saber que existiam — nada no site aponta para elas, então a única porta era
 * alguém compartilhar o link por fora.
 *
 * É gerado em vez de escrito à mão porque o catálogo muda toda semana: um
 * arquivo estático nasceria desatualizado e ninguém lembraria de regerar.
 *
 * SOBRE O <lastmod>
 * O Google só usa o lastmod enquanto ele se mostra verdadeiro; quando percebe
 * que a data mente, passa a ignorar o campo no site inteiro. Por isso:
 *
 *   - `restaurants.updated_at` NÃO serve. Ele é tocado por sincronização em
 *     lote: em out/2026, 491 dos 515 restaurantes ativos tinham a mesma data
 *     (11/09), mudasse a ficha ou não. Usá-lo seria dizer ao Google que o
 *     catálogo inteiro mudou no mesmo dia.
 *   - Vale a data editorial de cada linha: `catalog_json.enriched_at` (quando
 *     o texto da ficha foi escrito/reescrito) ou, na falta dela,
 *     `catalog_json.created_at` (quando o lugar entrou no catálogo). Sem
 *     nenhuma das duas, a URL vai SEM lastmod — omitir é honesto, inventar não.
 *   - Página de descoberta (bairro, cozinha, combinação) é feita dos cartões
 *     dos restaurantes dela, então mudou quando o mais recente deles mudou.
 *   - Guia usa `lists.updated_at`, que só se move quando o guia é editado.
 */

import { COZINHAS, aSlug, MINIMO } from './taxonomia.js';

const SUPABASE_URL = 'https://lshecrzhcpqqiaytkemf.supabase.co';
const SUPABASE_KEY = 'sb_publishable_Q431fFjy1BM9vjCeQfkJZw_CQHgCQwl';
const SITE = 'https://selloapp.com.br';

/** Páginas fixas. As legais entram porque existir no sitemap é o que a Apple e
 *  o Google esperam de política de privacidade e termos. */
const ESTATICAS = [
  { loc: '/', prio: '1.0', freq: 'weekly' },
  { loc: '/guias', prio: '0.9', freq: 'weekly' },
  { loc: '/baixar', prio: '0.8', freq: 'monthly' },
  { loc: '/sobre', prio: '0.5', freq: 'monthly' },
  { loc: '/termos', prio: '0.3', freq: 'yearly' },
  { loc: '/privacidade', prio: '0.3', freq: 'yearly' },
];

/** Listas pessoais (/l/) e perfis (/u/) são conteúdo de usuário: existem para
 *  serem compartilhadas por link, não para disputar busca em nome do site.
 *  Nenhuma consulta abaixo as gera; a trava é para ninguém incluí-las sem
 *  querer no futuro. */
const FORA_DO_SITEMAP = /^\/(l|u)\//;

function xmlEsc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

async function sb(path) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
  });
  if (!res.ok) return [];
  return res.json();
}

/** Data ISO válida e não futura, ou null. Data no futuro é dado quebrado, e
 *  o Google a lê como mentira. */
function dataValida(s) {
  const t = Date.parse(s);
  return Number.isFinite(t) && t <= Date.now() ? new Date(t).toISOString() : null;
}

/** A data editorial de um restaurante (ver o comentário do topo). */
function dataEditorial(r) {
  return dataValida(r.enriched_at) || dataValida(r.created_at);
}

/** A mais recente de uma lista de datas ISO (que comparam como texto). */
function maisRecente(datas) {
  return datas.filter(Boolean).sort().pop() || null;
}

function url({ loc, lastmod, freq, prio }) {
  return [
    '  <url>',
    `    <loc>${xmlEsc(SITE + loc)}</loc>`,
    lastmod ? `    <lastmod>${xmlEsc(String(lastmod).slice(0, 10))}</lastmod>` : '',
    freq ? `    <changefreq>${freq}</changefreq>` : '',
    prio ? `    <priority>${prio}</priority>` : '',
    '  </url>',
  ]
    .filter(Boolean)
    .join('\n');
}

export default async function handler(req, res) {
  // Cópia de cada objeto: o lastmod de /guias é escrito abaixo, e a função
  // quente da Vercel reaproveita o módulo entre requisições.
  const entradas = ESTATICAS.map((e) => ({ ...e }));

  try {
    /* `limit` alto de propósito: o padrão do PostgREST corta em 1000 e um
     * sitemap silenciosamente truncado é pior que nenhum — ele diz ao Google
     * que o resto não existe. Se o catálogo passar disso, paginar aqui.
     * Uma consulta só serve às fichas e às páginas de descoberta: as mesmas
     * linhas, contadas do mesmo jeito que a rota conta. */
    const [rest, guias] = await Promise.all([
      sb(
        'restaurants?is_active=eq.true&select=slug,share_slug,' +
          'catalog_json->>neighborhood,catalog_json->>cuisine,' +
          'catalog_json->>enriched_at,catalog_json->>created_at&limit=5000',
      ),
      sb('lists?is_curated=eq.true&is_public=eq.true&select=slug,updated_at&order=updated_at.desc&limit=5000'),
    ]);

    for (const r of rest) {
      entradas.push({
        loc: `/r/${r.share_slug || r.slug}`,
        lastmod: dataEditorial(r),
        freq: 'monthly',
        prio: '0.7',
      });
    }

    /* Paginas de descoberta. So entram as que passam do piso — o mesmo que a
     * rota usa para devolver 404. Listar no sitemap uma URL que responde 404
     * e pedir ao Google para bater numa porta fechada, e ele desconta isso na
     * confianca do arquivo inteiro. */
    const porBairro = {}, porCozinha = {}, porCombo = {};
    const somar = (mapa, k, data) => {
      const e = mapa[k] || (mapa[k] = { n: 0, datas: [] });
      e.n += 1;
      e.datas.push(data);
    };
    for (const r of rest) {
      const b = r.neighborhood, c = r.cuisine, d = dataEditorial(r);
      if (b) somar(porBairro, b, d);
      if (c) somar(porCozinha, c, d);
      if (b && c) somar(porCombo, c + '|' + b, d);
    }
    for (const [b, e] of Object.entries(porBairro)) {
      if (e.n >= MINIMO.bairro) {
        entradas.push({ loc: '/onde-comer/' + aSlug(b), lastmod: maisRecente(e.datas), freq: 'weekly', prio: '0.8' });
      }
    }
    for (const [c, e] of Object.entries(porCozinha)) {
      const t = COZINHAS[c];
      // Cozinha com guia redireciona 308 para ele — nao e URL propria.
      if (t && !t.guia && e.n >= MINIMO.cozinha) {
        entradas.push({ loc: '/restaurantes/' + t.slug, lastmod: maisRecente(e.datas), freq: 'weekly', prio: '0.8' });
      }
    }
    for (const [k, e] of Object.entries(porCombo)) {
      const [c, b] = k.split('|');
      const t = COZINHAS[c];
      if (t && e.n >= MINIMO.combinacao) {
        entradas.push({ loc: '/restaurantes/' + t.slug + '/' + aSlug(b), lastmod: maisRecente(e.datas), freq: 'weekly', prio: '0.8' });
      }
    }

    for (const g of guias) {
      entradas.push({ loc: `/g/${g.slug}`, lastmod: dataValida(g.updated_at), freq: 'weekly', prio: '0.8' });
    }

    // O índice de guias mudou quando o guia mais recente mudou.
    const indice = entradas.find((e) => e.loc === '/guias');
    if (indice) indice.lastmod = maisRecente(guias.map((g) => dataValida(g.updated_at)));
  } catch {
    /* Banco fora do ar não pode devolver 500: um sitemap com as estáticas ainda
     * é válido, e o Google tenta de novo depois. Sitemap quebrado faz ele
     * desconfiar do arquivo inteiro por dias. */
  }

  const urls = entradas.filter((e) => !FORA_DO_SITEMAP.test(e.loc)).map(url);

  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
  res.status(200).send(
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`,
  );
}
