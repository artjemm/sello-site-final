/**
 * Copia os instantâneos do Tripadvisor do APP para o site.
 *
 * A fonte de verdade é `lib/avaliacoesExternas.ts` no repositório do app
 * (sello-app-final): lá cada restaurante tem o `location_id` do Tripadvisor e
 * a nota/contagem lidas à mão na página pública, com a data da leitura. O site
 * mostra exatamente os mesmos cards que o app — então lê o mesmo dado, em vez
 * de manter uma segunda lista que divergiria na primeira atualização.
 *
 * USO (da raiz deste repositório):
 *   node scripts/sync-tripadvisor.mjs <caminho>/sello-app-final/lib/avaliacoesExternas.ts
 *
 * Gera `api/tripadvisor.js`. Rodar de novo sempre que o app atualizar a lista.
 */
import fs from 'fs';

const origem = process.argv[2];
if (!origem || !fs.existsSync(origem)) {
  console.error('Informe o caminho de lib/avaliacoesExternas.ts do app.');
  process.exit(1);
}
const src = fs.readFileSync(origem, 'utf8');

// Cada entrada: r05: { locationId: '…', url: ta('…', 'Slug'), instantaneo: { nota, total, lidoEm } }
const re = /\b(r\d+):\s*\{\s*locationId:\s*'(\d+)',\s*url:\s*ta\('(\d+)',\s*'([^']+)'\),\s*(?:instantaneo:\s*\{\s*nota:\s*([\d.]+),\s*total:\s*(\d+),\s*lidoEm:\s*'([\d-]+)'\s*\},?)?\s*\}/g;
const dados = {};
for (const m of src.matchAll(re)) {
  const [, slug, locationId, d, nomeUrl, nota, total, lidoEm] = m;
  dados[slug] = {
    url: `https://www.tripadvisor.com.br/Restaurant_Review-g303631-d${d}-Reviews-${nomeUrl}-Sao_Paulo_State_of_Sao_Paulo.html`,
    locationId,
    ...(nota ? { nota: Number(nota), total: Number(total), lidoEm } : {}),
  };
}
const n = Object.keys(dados).length;
if (n < 10) {
  console.error(`Só ${n} entradas reconhecidas — o formato do arquivo do app mudou? Nada foi gravado.`);
  process.exit(1);
}

const saida = `/**
 * GERADO por scripts/sync-tripadvisor.mjs a partir de lib/avaliacoesExternas.ts
 * do app — não editar à mão. ${n} restaurantes, gerado em ${new Date().toISOString().slice(0, 10)}.
 *
 * nota/total/lidoEm são leitura manual da página pública do Tripadvisor (o app
 * explica o porquê e a regra de validade). Só o locationId pode ser guardado
 * sem prazo pela licença deles; o resto expira (ver avaliacoes-externas.js).
 */
export const TRIPADVISOR = ${JSON.stringify(dados, null, 2)};
`;
fs.writeFileSync(new URL('../api/tripadvisor.js', import.meta.url), saida);
console.log(`${n} restaurantes → api/tripadvisor.js`);
