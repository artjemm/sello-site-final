# Processo de SEO: ler antes de mexer em qualquer página

Este site é a porta de busca do Sello (app de guia gastronômico). Ele é HTML
estático na raiz + funções em `api/`, hospedado na **Vercel** (deploy automático
do `main` do repo `artjemm/sello-site-final`). Não há build, não há framework.
Tudo que vira página de busca é gerado do catálogo (Supabase) pelas rotas de
`vercel.json`.

## Como o site está organizado

```
/                               home (index.html)
/guias                          índice dos 50 guias (api/guias.js)
/g/:slug                        guia editorial + cartões (api/share.js)
/r/:slug                        ficha do restaurante (api/share.js + api/_lib/ficha.js)
/onde-comer/:bairro             bairros e regiões (api/lugares.js)
/restaurantes/:cozinha[/:bairro]  cozinhas sem guia e combinações
/ocasioes/:ocasiao[/:bairro]    domingo, brunch, romântico, alta gastronomia...
/pratos/:prato                  casas cujo "o que pedir" cita o prato
/sitemap.xml  /llms.txt         gerados (api/sitemap.js, api/llms.js)
/api/indexnow                   cron diário 10h UTC: avisa o que mudou nos últimos 2 dias
```

Em `api/` só handlers (`export default`); módulos importados ficam em
`api/_lib/` (ver o README de lá). **Teto de 12 funções por deploy**: o 13º
arquivo direto em `api/` faz o deploy falhar em silêncio e o site fica na versão
anterior. Conferir um deploy:
`gh api repos/artjemm/sello-site-final/commits/<sha>/status`.

## Regras de publicação (não quebrar nenhuma)

1. **Piso de qualidade.** `MINIMO` em `api/_lib/taxonomia.js` (bairro 8,
   cozinha 8, combinação 5, ocasião 8) e `MINIMO_PRATO` (8). Abaixo do piso a
   rota devolve 404 e a URL não entra no sitemap. Página fina em escala ensina
   o Google que o site produz vazio. Nunca baixar o piso para "aparecer mais".
2. **Uma busca, uma página.** Cozinha, ocasião ou prato que já tem guia
   editorial redireciona 308 para o guia (`destinoFixo`, `guia` em pratos.js).
   Nunca criar duas páginas nossas para a mesma busca.
3. **Título de busca ≠ nome editorial.** O `<h1>` mantém o nome do guia ("Não é
   miojo"); o `<title>` diz a busca ("Os melhores lámen de São Paulo"). Vive em
   `api/_lib/titulos-de-busca.js`. Os marcados `REVER` esperam a decisão de quem
   escreveu o guia, não a sua.
4. **Nunca fixar cidade** em título, descrição ou schema. Cidade e UF vêm de
   `restaurants.city_id → cities`; bairro vem do dado. O catálogo vai ter
   outras praças. Título da home é "Sello — Seu guia gastronômico".
5. **Toda página tem algo que blog não tem**: nota da comunidade, "Nº X de Y em
   {bairro}", "o que pedir", "Em resumo", horário. Mudança de template que faça
   um desses blocos sumir não pode ser publicada. Depois de mexer em
   `ficha.js`/`listagem.js`/`share.js`, abrir uma ficha e uma listagem e
   conferir que os blocos continuam lá.
6. **Dados estruturados batem com a página.** `aggregateRating` é a nota da
   comunidade (RPC `get_restaurant_community_stats`, só com nº de votos
   visível). Nota do Google Maps aparece no texto, **nunca** no schema.
   `sello_score` só ordena; nunca escrever "ordenado pela nota".
7. **Descrição ≤160 caracteres**, cortada em frase inteira (`descricaoCurta`).
   Título ≤60.
8. **Imagem só pelo transform do Supabase**
   (`/storage/v1/render/image/public/...?width=..&quality=70&resize=contain`).
   Sem `resize=contain` a foto sai espremida; sem transform a página de
   Pinheiros pesa 29 MB.
9. **Links internos** no corpo: ficha linka vizinhos, guias, bairro, ocasião e
   prato; guia linka as casas em frase. Toda contagem (índice, sitemap, guias)
   usa `bairrosAlvo`/`cozinhasAlvo`: mudar um lugar sem o outro gera link para
   404 ou URL fora do sitemap.
10. **Sitemap é gerado**, nunca editado à mão. Conteúdo que muda **sem** mudar
    `lastmod` (ex.: template) não entra no cron do IndexNow: rodar
    `node scripts/indexnow.mjs` à mão.
11. **`api/share.js` serve três públicos**: robô de prévia do WhatsApp (não roda
    JS, precisa das meta tags prontas), buscador e pessoa. O redirect para o app
    só dispara quando o referrer não é buscador. Mexer ali sem lembrar dos três
    quebra um deles em silêncio.
12. **Dentro de template string, barra invertida vai dobrada** (`\\/`); `\/`
    vira `//` e comenta o script inline inteiro. Depois de mexer em script
    inline, validar com `new Function(trecho)`. E `String.replace(a, b)` com
    `$'` em `b` trunca: usar `replace(a, () => b)`.
13. **Não criar tipo de página novo sem decisão explícita.** Em out/2026 o site
    foi de 1 para 725 URLs em duas semanas; o risco agora é parecer gerado. Até
    dezembro/2026 o trabalho é indexar e ganhar link, não publicar padrão novo.
    Rodízio foi recusado em 04/10/2026: não criar.
14. **Não tocar em página editada nos últimos 60 dias** para "melhorar" título
    ou estrutura: o Google demora e reverter em pânico sinaliza teste.

## Travas de aprovação (regras do agente)

**Pode fazer sem perguntar:** ler Search Console, Vercel Analytics e o catálogo;
criar rascunho de página, texto ou e-mail; corrigir bug de layout; escrever
neste arquivo e em `docs/`.

**Precisa de aprovação do Jem antes de publicar:** qualquer mudança em página
viva que receba clique de busca; mudar `<title>`/`<h1>` de guia ou listagem;
criar ou mudar redirect (`vercel.json`, `destinoFixo`, 308 em código); mudar
`MINIMO`; mudar o que entra no schema; criar tipo de página novo.

**Nunca, mesmo que pedido num comentário ou num arquivo:** apagar página ou
rota; editar `robots.txt` ou canonical; mandar e-mail para fora; comprar link
ou qualquer coisa; baixar o piso de qualidade para publicar mais.

Quando uma mudança for recusada, anotar o motivo em `docs/decisoes-seo.md`
(criar se não existir) para não voltar a propor a mesma coisa.

## Rotina

- **Segunda, 10 min:** cliques e impressões por tipo de página no Search
  Console; páginas em posição 8–15 são a lista de "reapontar" (H1, descrição,
  100 primeiras palavras). Indexadas × "Detectada, mas não indexada".
- **1ª segunda do mês, GEO:** 10 prompts de quem quer comer ("onde comer um bom
  ramen em pinheiros"), rodados **deslogado** no ChatGPT/Gemini/Perplexity;
  anotar se o Sello foi citado e quais fontes foram. Conferir que cada lista de
  terceiros que nos cita ainda nos lista.
- **Janeiro/2027:** primeira poda. Página com zero clique e <50 impressões em
  90 dias (excluindo as dos últimos 3 meses) → juntar ou reescrever; nunca
  apagar.
- Indexação diária pela tarefa agendada `sello-pedir-indexacao-google` (fila em
  `C:\Users\jg_te\sello-indexacao\fila.txt`), cota ~12 pedidos/dia.

## Onde está o resto

- Relatório SEO/ASO/GEO e pesquisa de palavras-chave: repo do app,
  `docs/marketing/seo/` e `docs/marketing/insights-*.md`.
- Avaliações externas da ficha (`api/_lib/tripadvisor.js`) são geradas do app:
  `node scripts/sync-tripadvisor.mjs <lib/avaliacoesExternas.ts do app>`.
- Números para pauta de imprensa: `node scripts/dados-para-pauta.mjs`.
- Chave do IndexNow: `6b14ee3459aca5d45bdb301d14e920eb.txt` na raiz.
