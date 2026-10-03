# api/_lib — módulos compartilhados, NÃO rotas

Todo arquivo .js direto em `api/` vira uma função na Vercel, e o plano tem
teto de **12 funções por deploy**. Passar disso faz o deploy FALHAR (aconteceu
em 03/10/2026 com 14 arquivos: o site ficou na versão anterior).

Pastas com `_` na frente são ignoradas como rota. Por isso: em `api/` só os
handlers (`export default`), e tudo que é importado por eles mora aqui.
