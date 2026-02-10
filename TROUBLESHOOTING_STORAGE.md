# Troubleshooting: Logos e Banners sumindo após deploy

## Problema

Mesmo com Persistent Storage configurado, logos e banners desaparecem ou a aplicação trava após um novo deploy.

## Verificações

### 1. O volume está no serviço correto?

O volume **deve estar configurado no serviço BACKEND**, não no Frontend.

- O Frontend é um site estático e não serve os arquivos de upload.
- Os arquivos são salvos e servidos pelo Backend em `/uploads`.

### 2. O Destination Path está correto?

O **Destination Path** no Storages deve corresponder exatamente ao caminho onde o backend salva/serve os arquivos.

**Valores comuns:**
- Colify com Base Directory `/backend`: `/app/backend/uploads`
- Nixpacks padrão: `/app/backend/uploads`
- Dockerfile customizado: verifique o `WORKDIR` e a estrutura do projeto

**Como descobrir o caminho correto:**

1. Após o deploy, veja os logs do backend.
2. O backend agora imprime: `📁 Servindo uploads em: /caminho/...`
3. Use esse caminho como **Destination Path** no volume.

### 3. Variável UPLOADS_PATH (opcional)

Se o caminho padrão não bater com o volume, configure explicitamente:

```env
UPLOADS_PATH=/app/backend/uploads
```

No Colify, add essa variável nas **Environment Variables** do serviço Backend.

O `UPLOADS_PATH` deve ser **exatamente** o mesmo que o **Destination Path** do volume.

### 4. Configuração do volume no Colify

Exemplo de configuração:

| Campo | Valor |
|-------|-------|
| **Source Path** | `/root/uploads` |
| **Destination Path** | `/app/backend/uploads` |

- **Source Path**: pasta persistente no servidor host (persiste entre deploys).
- **Destination Path**: pasta dentro do container onde o app salva e lê os arquivos.

### 5. Ordem de deploy

1. Configure o volume nas Storages.
2. Faça um **novo deploy** do Backend.
3. Faça upload de logo/banner pelo admin.
4. Verifique se aparece.
5. Faça outro deploy e confira se os arquivos continuam lá.

### 6. Imagens quebradas não travam mais o app

Foram adicionados handlers `onError` em logo e banners. Se o arquivo não existir (404), o app usa imagem padrão em vez de travar.

## Resumo de ações

1. [ ] Volume configurado no serviço **Backend**
2. [ ] Destination Path = caminho exibido nos logs (`📁 Servindo uploads em: ...`)
3. [ ] `UPLOADS_PATH` definido (se necessário) e igual ao Destination Path
4. [ ] Novo deploy feito após alterar o volume
5. [ ] Teste: upload → novo deploy → verificar se os arquivos continuam lá
