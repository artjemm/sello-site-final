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
 */

const SUPABASE_URL = 'https://lshecrzhcpqqiaytkemf.supabase.co';
const SUPABASE_KEY = 'sb_publishable_Q431fFjy1BM9vjCeQfkJZw_CQHgCQwl';
const SITE = 'https://selloapp.com.br';

/** Páginas fixas. As legais entram porque existir no sitemap é o que a Apple e
 *  o Google esperam de política de privacidade e termos. */
const ESTATICAS = [
  { loc: '/', prio: '1.0', freq: 'weekly' },
  { loc: '/baixar', prio: '0.8', freq: 'monthly' },
  { loc: '/termos', prio: '0.3', freq: 'yearly' },
  { loc: '/privacidade', prio: '0.3', freq: 'yearly' },
];

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
  const urls = ESTATICAS.map(url);

  try {
    /* `limit` alto de propósito: o padrão do PostgREST corta em 1000 e um
     * sitemap silenciosamente truncado é pior que nenhum — ele diz ao Google
     * que o resto não existe. Se o catálogo passar disso, paginar aqui. */
    const rest = await sb(
      'restaurants?is_active=eq.true&select=slug,share_slug,updated_at&order=updated_at.desc&limit=5000',
    );
    for (const r of rest) {
      urls.push(
        url({
          loc: `/r/${r.share_slug || r.slug}`,
          lastmod: r.updated_at,
          freq: 'monthly',
          prio: '0.7',
        }),
      );
    }

    const guias = await sb(
      'lists?is_curated=eq.true&is_public=eq.true&select=slug,updated_at&order=updated_at.desc&limit=5000',
    );
    for (const g of guias) {
      urls.push(
        url({ loc: `/g/${g.slug}`, lastmod: g.updated_at, freq: 'weekly', prio: '0.8' }),
      );
    }
  } catch {
    /* Banco fora do ar não pode devolver 500: um sitemap com as estáticas ainda
     * é válido, e o Google tenta de novo depois. Sitemap quebrado faz ele
     * desconfiar do arquivo inteiro por dias. */
  }

  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
  res.status(200).send(
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`,
  );
}
