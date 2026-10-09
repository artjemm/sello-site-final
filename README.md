# Sello — Landing v2

Landing page estática (HTML/CSS/JS puro) da Sello.

## Deploy
- **Vercel**, deploy automático de cada push no `main` deste repo. Não há build.
- URL pública: https://selloapp.com.br (www redireciona para o apex).
- Ao trocar um asset, **bumpe o `?v=`** no `index.html` (e em `ASSETS_HOME` de `api/_lib/ficha.js`) pra furar o cache do browser.
- Conferir um deploy: `gh api repos/artjemm/sello-site-final/commits/<sha>/status`.
- Regras de publicação e travas do agente: **`CLAUDE.md`**.

## Estrutura
- `index.html` — página única
- `css/`, `js/` — estilos e scripts
- `assets/` — imagens (inclui o mural de pratos `d01`–`d28`)
- Modal de download: `#dl-modal` (app ainda não publicado → CTA "Em breve")

## Não confundir
- `~/sello-site` é OUTRA coisa (serve `/sello-preview/`), **não** este v2.
- O app mobile e o cockpit vivem em repos separados: `artjemm/Sello-app` e `artjemm/sello-admin-backend`.
