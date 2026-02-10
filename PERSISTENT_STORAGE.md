# Configuração de Persistent Storage para Logos e Banners

Este documento explica como configurar persistent storage para garantir que logos e banners não sejam perdidos após cada deploy.

## 📁 Localização dos Arquivos

Os arquivos de logos e banners são salvos no diretório:
```
backend/uploads/
```

Este diretório contém:
- Logos: `/backend/uploads/logo-*.{jpg,png,webp}`
- Banners: `/backend/uploads/image-*.{jpg,png,webp}`
- Promoções: `/backend/uploads/promo-*.{jpg,png,webp}`

## 🚀 Configuração no Colify (Recomendado)

Se você está usando Colify para deploy, siga estes passos:

1. **Acesse o painel do Colify**
2. **Vá para o serviço Backend**
3. **Clique na aba "Advanced" ou procure por "Volumes"**
4. **Clique em "Add Volume Mount"**
5. **Preencha os campos:**

   ```
   Name: uploads-storage
   Source Path: /root/uploads
   Destination Path: /app/backend/uploads
   ```

6. **Clique em "Add"**
7. **Faça um novo deploy** para aplicar as mudanças

### ⚠️ Importante para Colify:

- O **Destination Path** `/app/backend/uploads` é o caminho dentro do container onde o código salva os arquivos
- O **Source Path** `/root/uploads` é onde os arquivos ficarão salvos no servidor host (persistente entre deploys)
- Você pode escolher outro Source Path se preferir (ex: `/var/data/uploads`)
- **O volume deve estar no serviço BACKEND**, não no Frontend

### Se os arquivos ainda sumirem

1. Confira os logs do backend após o deploy – ele exibe: `📁 Servindo uploads em: /caminho/...`
2. Use esse caminho como **Destination Path** no volume
3. Opcional: adicione a variável `UPLOADS_PATH=/app/backend/uploads` nas env vars do Backend
4. Veja [TROUBLESHOOTING_STORAGE.md](TROUBLESHOOTING_STORAGE.md) para mais detalhes

## 🔧 Configuração de Volume Docker

Para garantir que os arquivos persistam após deploys, você precisa montar um volume Docker que mapeia o diretório `backend/uploads/` para um storage persistente.

### Opção 1: Configuração via Interface (Colify/Plataforma de Deploy)

Na interface de configuração de volumes do seu provedor de deploy:

1. **Name**: `uploads-storage` (ou qualquer nome descritivo)
2. **Source Path**: `/root/uploads` (ou outro caminho no servidor host)
3. **Destination Path**: `/app/backend/uploads` (caminho dentro do container)

**Importante**: O caminho de destino deve corresponder ao caminho onde o backend está rodando dentro do container.

### Opção 2: Docker Compose

Se você estiver usando Docker Compose, adicione o volume no `docker-compose.yml`:

```yaml
version: '3.8'

services:
  backend:
    build: ./backend
    volumes:
      - ./uploads:/app/backend/uploads
      # ou para storage nomeado:
      # - uploads-data:/app/backend/uploads
    # ... outras configurações

volumes:
  uploads-data:
    driver: local
```

### Opção 3: Docker Run

Se estiver usando `docker run` diretamente:

```bash
docker run -v /root/uploads:/app/backend/uploads your-backend-image
```

## 📋 Verificação

Após configurar o volume:

1. **Faça upload de uma logo ou banner** via admin
2. **Verifique se o arquivo existe** no diretório montado no host
3. **Faça um deploy** (recrie o container)
4. **Verifique se o arquivo ainda existe** após o deploy

## ⚠️ Importante

- O diretório `backend/uploads/` está no `.gitignore` e não é versionado
- Certifique-se de que o volume está montado **antes** de fazer uploads importantes
- Se você já tem arquivos no diretório, copie-os para o volume antes de configurar:
  ```bash
  # Exemplo: copiar arquivos existentes para o volume
  cp -r backend/uploads/* /root/uploads/
  ```

## 🔍 Verificar Caminho do Container

Para descobrir o caminho exato dentro do container, você pode:

1. Entrar no container:
   ```bash
   docker exec -it <container-name> sh
   ```

2. Verificar onde o backend está rodando:
   ```bash
   pwd
   ls -la
   ```

3. O caminho típico pode ser:
   - `/app/backend/uploads`
   - `/usr/src/app/backend/uploads`
   - `/app/uploads`
   - Depende da configuração do seu Dockerfile

## 📝 Exemplo de Dockerfile

Se você precisar garantir que o diretório existe no container:

```dockerfile
FROM node:18-alpine

WORKDIR /app

# Criar diretório de uploads
RUN mkdir -p /app/backend/uploads

# ... resto do Dockerfile
```

## 🚀 Migração de Arquivos Existentes

Se você já tem arquivos e quer migrá-los para o volume persistente:

1. **Pare o container** (se estiver rodando)
2. **Copie os arquivos** do diretório antigo para o novo volume:
   ```bash
   # Exemplo
   cp -r /caminho/antigo/uploads/* /root/uploads/
   ```
3. **Configure o volume** conforme instruções acima
4. **Inicie o container** novamente

## ✅ Checklist

- [ ] Volume configurado na plataforma de deploy
- [ ] Caminho de destino correto (dentro do container)
- [ ] Caminho de origem configurado (no host)
- [ ] Teste de upload realizado
- [ ] Teste de persistência após deploy realizado
- [ ] Arquivos existentes migrados (se aplicável)
