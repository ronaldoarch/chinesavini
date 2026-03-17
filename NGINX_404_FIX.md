# Correção dos erros 404 no Nginx (betregional.com.br)

## Problema

Os logs do nginx mostravam:
```
open() "/usr/share/nginx/html/404.html" failed (2: No such file or directory)
```

E também 404 para:
- `/favicon.ico`
- `/robots.txt`
- `/wp-login.php` (varredura de bots - esperado)

## Solução aplicada

Foram adicionados à pasta `chinesa-main/public/`:

1. **404.html** - Página de erro que redireciona para a home
2. **robots.txt** - Para SEO e crawlers
3. **favicon.ico** - Ícone do site (cópia do logo)

## Deploy

Após o build do frontend (Vite), esses arquivos são copiados para a pasta de saída e ficam disponíveis em:
- `https://betregional.com.br/404.html`
- `https://betregional.com.br/robots.txt`
- `https://betregional.com.br/favicon.ico`

**Importante:** É necessário fazer **rebuild** do frontend e **redeploy** para que as alterações entrem em produção.

## Observações

- **wp-login.php** - Bots continuarão tentando (varredura automática). O 404 é esperado e correto.
- **POST /, /index.php, /admin, /api** - Tentativas de varredura/ataque. O 405 (Method Not Allowed) é correto para uma SPA estática.
