/**
 * Páginas de compartilhamento — /r/:slug, /g/:slug, /l/:slug, /u/:username
 *
 * O que o app compartilha precisa cair em algum lugar. Estas páginas existem
 * para dois públicos ao mesmo tempo:
 *
 *  1. O ROBÔ do WhatsApp/Instagram/Twitter, que lê as meta tags og: para montar
 *     a prévia. Ele NÃO executa JavaScript, então título, descrição e imagem
 *     têm que vir prontos no HTML — é por isso que isto é uma função de
 *     servidor e não uma página estática com fetch no cliente.
 *  2. A PESSOA que clica, que deve ver o conteúdo e um caminho claro para o app.
 *
 * Uma função só atende os quatro tipos: a diferença entre eles é qual tabela
 * consultar e como escrever o texto — o resto (HTML, prévia, fallback) é igual,
 * e manter isso em quatro arquivos só multiplicaria os lugares onde corrigir.
 */

const SUPABASE_URL = 'https://lshecrzhcpqqiaytkemf.supabase.co';
// Chave publicável (anon). Só enxerga o que o RLS libera para qualquer visitante
// — as mesmas linhas que o app já mostra sem login.
const SUPABASE_KEY = 'sb_publishable_Q431fFjy1BM9vjCeQfkJZw_CQHgCQwl';

const SITE = 'https://selloapp.com.br';
// Mesma imagem que a home usa como prévia — existe e já está no padrão da
// marca. Entra quando o conteúdo não tem capa (lista recém-criada, perfil sem
// foto) ou quando nada foi encontrado.
const OG_FALLBACK = `${SITE}/assets/img/hero.jpg`;
const APP_STORE = 'https://apps.apple.com/br/app/sello/id6791353216';
const PLAY_STORE = 'https://play.google.com/store/apps/details?id=com.sello.app';

/** Impede que um nome de lista ou @ com `<` quebre a página — ou pior, injete
 *  markup. Todo dado vindo do banco passa por aqui antes de entrar no HTML. */
function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Extrai o identificador real de um endereço decorado.
 *
 *   z-deli-restaurante-delicatessen--r632  →  r632
 *   mamma-mia--u-50e887fa-…                →  u-50e887fa-…
 *   top-25-melhores                        →  top-25-melhores
 *
 * O app põe o nome antes do `--` só para o link ficar legível. Ler o que vem
 * DEPOIS do último `--` significa que renomear um restaurante não invalida
 * nenhum link já compartilhado — o pedaço bonito é descartável por construção.
 */
/** Guias como "Em alta no Sello" fariam "… no Sello no Sello". Corta a
 *  repetição em vez de mexer nos títulos, que são editoriais. */
function noSello(s) {
  return `${s} no Sello`.replace(/( no Sello){2,}$/i, " no Sello");
}

function realId(slug) {
  const i = slug.lastIndexOf('--');
  return i === -1 ? slug : slug.slice(i + 2);
}

async function sb(path) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
  });
  if (!res.ok) return null;
  const rows = await res.json();
  return Array.isArray(rows) && rows.length ? rows[0] : null;
}

/** Busca o conteúdo e devolve a cópia de cada tipo, já no formato da página.
 *  `deepLink` é o caminho equivalente dentro do app. */
async function resolve(type, rawSlug) {
  // O trecho bonito do endereço é enfeite; o identificador vem depois do `--`.
  const slug = realId(rawSlug);
  if (type === 'r') {
    // O endereço novo é o nome (z-deli-restaurante-delicatessen); o antigo é o
    // identificador interno (r632). Aceitar os dois mantém válido tudo que já
    // foi compartilhado e tudo que ainda venha de um app desatualizado.
    const r =
      (await sb(
        `restaurants?share_slug=eq.${encodeURIComponent(slug)}&is_active=eq.true&select=name,slug,hero_image&limit=1`,
      )) ||
      (await sb(
        `restaurants?slug=eq.${encodeURIComponent(slug)}&is_active=eq.true&select=name,slug,hero_image&limit=1`,
      ));
    if (!r) return null;
    return {
      title: noSello(`Confira o ${r.name}`),
      description:
        'Descubra fotos, informações e tudo o que você precisa saber antes da sua próxima visita.',
      image: r.hero_image,
      heading: r.name,
      kicker: 'Restaurante',
      deepLink: `sello://restaurant/${r.slug}`,
    };
  }

  if (type === 'g') {
    const g = await sb(
      `lists?slug=eq.${encodeURIComponent(slug)}&is_curated=eq.true&is_public=eq.true&select=title,slug,cover,subtitle&limit=1`,
    );
    if (!g) return null;
    return {
      title: noSello(`Confira o guia ${g.title}`),
      description:
        'Uma curadoria editorial do Sello para descobrir restaurantes que realmente valem a visita.',
      image: g.cover,
      heading: g.title,
      kicker: g.subtitle || 'Guia do Sello',
      deepLink: `sello://list/${g.slug}`,
    };
  }

  if (type === 'l') {
    const l =
      (await sb(
        `lists?share_slug=eq.${encodeURIComponent(slug)}&is_public=eq.true&select=id,title,slug,cover,user_id&limit=1`,
      )) ||
      (await sb(
        `lists?slug=eq.${encodeURIComponent(slug)}&is_public=eq.true&select=id,title,slug,cover,user_id&limit=1`,
      ));
    if (!l) return null;
    // O @ do dono entra no texto, então vale uma segunda consulta — sem ele a
    // frase perderia justamente o que faz alguém clicar: quem montou a lista.
    const owner = l.user_id
      ? await sb(
          `profiles_public?id=eq.${encodeURIComponent(l.user_id)}&select=username&limit=1`,
        )
      : null;
    const at = owner?.username ? `@${owner.username}` : 'alguém';
    return {
      title: noSello(`Confira a lista ${l.title} de ${at}`),
      description: `Explore a seleção de restaurantes criada por ${at} e descubra novos lugares para conhecer.`,
      image: l.cover,
      heading: l.title,
      kicker: `Lista de ${at}`,
      deepLink: `sello://userlist/${l.id}`,
    };
  }

  if (type === 'u') {
    const u = await sb(
      `profiles_public?username=eq.${encodeURIComponent(slug)}&select=name,username,avatar_url&limit=1`,
    );
    if (!u) return null;
    return {
      title: noSello(`Confira o perfil de @${u.username}`),
      description: 'Explore suas listas, avaliações e restaurantes favoritos.',
      image: u.avatar_url,
      heading: u.name || `@${u.username}`,
      kicker: `@${u.username}`,
      deepLink: `sello://user/${u.username}`,
    };
  }

  return null;
}

function page(data, canonical) {
  const img = data.image || OG_FALLBACK;
  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(data.title)}</title>
<meta name="description" content="${esc(data.description)}" />
<link rel="canonical" href="${esc(canonical)}" />
<meta property="og:type" content="website" />
<meta property="og:site_name" content="Sello" />
<meta property="og:locale" content="pt_BR" />
<meta property="og:url" content="${esc(canonical)}" />
<meta property="og:title" content="${esc(data.title)}" />
<meta property="og:description" content="${esc(data.description)}" />
<meta property="og:image" content="${esc(img)}" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${esc(data.title)}" />
<meta name="twitter:description" content="${esc(data.description)}" />
<meta name="twitter:image" content="${esc(img)}" />
<link rel="icon" href="/favicon.svg" />
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Anton+SC&family=Open+Sans:wght@400;600;700&display=swap" rel="stylesheet" />
<style>
  :root { --red:#E30F2F; --ink:#0D111B; --muted:#4D5461; }
  * { box-sizing:border-box; }
  body { margin:0; font-family:'Open Sans',system-ui,sans-serif; color:var(--ink);
         background:#fff; display:flex; min-height:100vh; align-items:center; justify-content:center; padding:24px; }
  .card { width:100%; max-width:420px; }
  .cover { width:100%; aspect-ratio:16/10; object-fit:cover; border-radius:16px; background:#EEE; display:block; }
  .kicker { font-size:13px; color:var(--red); font-weight:700; text-transform:uppercase;
            letter-spacing:.06em; margin:20px 0 6px; }
  h1 { font-family:'Anton SC',sans-serif; font-weight:400; text-transform:uppercase;
       font-size:30px; line-height:1.15; margin:0 0 10px; }
  p { color:var(--muted); font-size:15px; line-height:1.55; margin:0 0 24px; }
  .cta { display:block; text-align:center; text-decoration:none; border-radius:14px;
         padding:15px 20px; font-weight:700; font-size:15px; }
  .primary { background:var(--red); color:#fff; }
  .stores { display:flex; gap:10px; margin-top:10px; }
  .stores a { flex:1; border:1.5px solid #E4E4E7; color:var(--ink); }
  .foot { margin-top:28px; text-align:center; font-size:13px; }
  .foot a { color:var(--muted); }
</style>
</head>
<body>
  <main class="card">
    <img class="cover" src="${esc(img)}" alt="" onerror="this.src='${esc(OG_FALLBACK)}'" />
    <div class="kicker">${esc(data.kicker)}</div>
    <h1>${esc(data.heading)}</h1>
    <p>${esc(data.description)}</p>
    <a class="cta primary" href="${esc(data.deepLink)}">Abrir no Sello</a>
    <div class="stores">
      <a class="cta" href="${APP_STORE}">App Store</a>
      <a class="cta" href="${PLAY_STORE}">Google Play</a>
    </div>
    <div class="foot"><a href="${SITE}">selloapp.com.br</a></div>
  </main>
<script>
  // Quem já tem o app vai direto para a tela certa. Só depois de um gesto? Não:
  // navegadores bloqueiam a abertura automática de esquema em alguns casos, e o
  // botão acima cobre esses. Aqui é só a tentativa silenciosa, sem redirecionar
  // para a loja depois — mandar quem não tem o app para a loja no susto some
  // com a página que ele veio ver.
  setTimeout(function () { location.href = ${JSON.stringify(data.deepLink)}; }, 400);
</script>
</body>
</html>`;
}

function notFound(canonical) {
  return page(
    {
      title: 'Sello — Os melhores restaurantes vêm de pessoas.',
      description:
        'Este conteúdo não está mais disponível, mas há muito o que descobrir no Sello.',
      image: OG_FALLBACK,
      heading: 'Conteúdo não encontrado',
      kicker: 'Sello',
      deepLink: 'sello://',
    },
    canonical,
  );
}

export default async function handler(req, res) {
  const { type = '', slug = '' } = req.query || {};
  const canonical = `${SITE}/${type}/${slug}`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');

  if (!slug) {
    res.status(404).send(notFound(canonical));
    return;
  }

  let data = null;
  try {
    data = await resolve(String(type), String(slug));
  } catch {
    // Uma falha do banco não pode virar página de erro: o robô já leu o link e
    // a pessoa já clicou. Cai no conteúdo genérico, que ainda leva ao app.
  }

  if (!data) {
    res.status(404).send(notFound(canonical));
    return;
  }

  // Cache curto na borda: a prévia do WhatsApp fica estável e uma edição de
  // título aparece em minutos, não em dias.
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=3600');
  res.status(200).send(page(data, canonical));
}
