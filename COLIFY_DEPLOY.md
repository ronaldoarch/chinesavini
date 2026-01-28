# Deploy no Colify - Configuração Completa

## 🎯 Você precisa criar DOIS serviços separados

### 1️⃣ Backend (API)
### 2️⃣ Frontend (React)

---

## 📦 Serviço 1: Backend

### Configuração Inicial

**Repository URL:**
```
https://github.com/ronaldoarch/chinesavini
```

**Configurações:**
- **Branch:** `main`
- **Build Pack:** `Nixpacks` (ou `Dockerfile` se preferir)
- **Base Directory:** `/backend` ⚠️ **IMPORTANTE: Use `/backend`**
- **Port:** `5000` ⚠️ **Mude de 3000 para 5000**
- **Is it a static site?** ❌ **NÃO** (desmarcado)

### Variáveis de Ambiente (Backend)

Adicione estas variáveis no serviço do backend:

```env
PORT=5000
NODE_ENV=production
MONGODB_URI=mongodb://root:SUA_SENHA@mongodb-database-wsoogsogswocogg4og4k8k4w:27017/default
JWT_SECRET=seu-jwt-secret-super-seguro-aqui
JWT_EXPIRE=7d
FRONTEND_URL=https://seu-frontend.colify.app
NXGATE_API_KEY=sua-api-key-nxgate
WEBHOOK_BASE_URL=https://seu-backend.colify.app
```

### Build Commands (Backend)

**Build Command:**
```bash
cd backend && npm install
```

**Start Command:**
```bash
cd backend && npm start
```

---

## 🎨 Serviço 2: Frontend

### Configuração Inicial

**Repository URL:**
```
https://github.com/ronaldoarch/chinesavini
```

**Configurações:**
- **Branch:** `main`
- **Build Pack:** `Nixpacks`
- **Base Directory:** `/chinesa-main` ⚠️ **IMPORTANTE: Use `/chinesa-main`**
- **Publish Directory:** `/dist` ✅ **IMPORTANTE: Configure como `/dist`**
- **Port:** `80` ⚠️ **Fica desabilitado quando marca static site - isso é NORMAL!**
- **Is it a static site?** ✅ **SIM** (marque esta opção!)

### Variáveis de Ambiente (Frontend)

Adicione esta variável no serviço do frontend:

```env
VITE_API_URL=https://seu-backend.colify.app/api
```

**Importante:** Substitua `seu-backend.colify.app` pela URL real do seu serviço backend.

### Build Commands (Frontend)

**Build Command:**
```bash
cd chinesa-main && npm install && npm run build
```

**Quando marcar como static site:**
- ✅ **Port fica desabilitada (80)** - Isso é NORMAL e correto!
- ✅ O Colify servirá automaticamente a pasta `dist/` na porta 80/443
- ✅ Não precisa de start command
- ✅ O Colify gerencia HTTPS automaticamente

**Publish Directory:**
- Configure como `/dist` (pasta onde o Vite gera os arquivos estáticos)

---

## 📋 Checklist de Deploy

### Backend
- [ ] Repository: `https://github.com/ronaldoarch/chinesavini`
- [ ] Branch: `main`
- [ ] Base Directory: `/backend`
- [ ] Port: `5000`
- [ ] Static site: ❌ NÃO
- [ ] Variáveis de ambiente configuradas
- [ ] `MONGODB_URI` apontando para o MongoDB
- [ ] `WEBHOOK_BASE_URL` com URL pública do backend
- [ ] `FRONTEND_URL` com URL do frontend

### Frontend
- [ ] Repository: `https://github.com/ronaldoarch/chinesavini`
- [ ] Branch: `main`
- [ ] Base Directory: `/chinesa-main`
- [ ] Port: `3000`
- [ ] Static site: ✅ SIM (ou configure build manualmente)
- [ ] `VITE_API_URL` apontando para o backend

---

## 🔗 Conectar Frontend ao Backend

Após criar ambos os serviços:

1. **Anote a URL do Backend** (ex: `https://fortune-bet-backend.colify.app`)
2. **Configure no Frontend:**
   - Variável `VITE_API_URL=https://fortune-bet-backend.colify.app/api`
3. **Configure no Backend:**
   - Variável `FRONTEND_URL=https://fortune-bet-frontend.colify.app`

---

## 🐛 Troubleshooting

### Backend não conecta ao MongoDB
- Verifique se o MongoDB está rodando
- Verifique se a `MONGODB_URI` está correta
- Verifique se o hostname do MongoDB está acessível

### Frontend não conecta ao Backend
- Verifique se `VITE_API_URL` está correto
- Verifique CORS no backend (`FRONTEND_URL` configurado)
- Verifique se o backend está rodando

### Erro de build
- Verifique se o Base Directory está correto
- Verifique os logs de build no Colify
- Certifique-se de que o `package.json` está no diretório correto
