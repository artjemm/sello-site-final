/**
 * /app — manda direto para a loja do aparelho, sem tela intermediária.
 *
 * POR QUE ISTO EXISTE
 * O botão da App Store não abria quando o link chegava por Instagram ou TikTok.
 * Três tentativas no navegador falharam (itms-apps:// por código, itms-apps://
 * no href, x-safari-https://): dentro do navegador embutido desses apps, o iOS
 * recusa entregar o link ao aplicativo da App Store, e nenhum truque de
 * JavaScript vence isso de forma estável.
 *
 * Este é um mecanismo DIFERENTE, não mais uma variação: o redirecionamento
 * acontece no SERVIDOR, antes de qualquer página carregar. O navegador recebe um
 * 302 e trata como navegação de topo — que é o caso em que esses navegadores
 * costumam devolver o link ao sistema em vez de tentar carregar sozinhos.
 *
 * E resolve o incômodo que originou o pedido: a pessoa não vê mais uma tela
 * pedindo para ela escolher a loja e depois abrir no navegador. Ela toca no
 * link e cai na loja.
 *
 * A página com as duas lojas passou a morar em /baixar. O site usa cleanUrls,
 * então /app.html seria servido como /app — e mandar o desktop para lá criaria
 * um laço: /app → função → /app → função. Caminhos separados, sem laço.
 *
 * DESKTOP CONTINUA VENDO A PÁGINA. Lá o redirecionamento não ajuda ninguém —
 * quem está no computador não vai instalar nada, e a página com as duas lojas e
 * o QR é justamente o que serve. Robôs de prévia (WhatsApp, Slack, Twitter)
 * caem no mesmo caminho, então o link compartilhado continua mostrando cartão.
 */

const APP_STORE = 'https://apps.apple.com/br/app/sello/id6791353216';
const PLAY_STORE = 'https://play.google.com/store/apps/details?id=com.sello.app';

/** Robôs que geram a prévia do link. Precisam da página, não da loja: um 302
 *  para a App Store faria o WhatsApp mostrar o cartão da Apple no lugar do
 *  nosso. */
const ROBOS =
  /bot|crawler|spider|facebookexternalhit|whatsapp|slackbot|twitterbot|discordbot|telegrambot|linkedinbot|embedly|preview/i;

export default function handler(req, res) {
  const ua = req.headers['user-agent'] || '';

  if (ROBOS.test(ua)) return paginaCompleta(res);

  // iPadOS 13+ se identifica como Macintosh; o `Mobile/` no fim é o que ainda
  // denuncia um aparelho de toque. Sem isso, iPad cairia no desktop.
  const isIOS = /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && /Mobile\//.test(ua));
  const isAndroid = /android/i.test(ua);

  if (isIOS) return paraLoja(res, APP_STORE);
  if (isAndroid) return paraLoja(res, PLAY_STORE);

  return paginaCompleta(res);
}

function paraLoja(res, destino) {
  // 302, não 301: o dia em que o app sair de uma das lojas, um 301 já estaria
  // gravado no navegador de todo mundo que clicou.
  res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
  res.setHeader('Location', destino);
  res.status(302).end();
}

function paginaCompleta(res) {
  res.setHeader('Location', '/baixar');
  res.status(302).end();
}
