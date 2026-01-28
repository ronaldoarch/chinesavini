# Troubleshooting - Erros Comuns

## 🐛 Erro 404 no Registro/Login

### Sintomas
- Erro: `404 (Not Found)` ao tentar registrar ou fazer login
- Erro: `Unexpected token '<', "<!DOCTYPE" ... is not valid JSON`
- Console mostra: `POST .../auth/register 404`

### Causas Possíveis

1. **Backend não está rodando**
2. **URL da API está incorreta**
3. **Rota não existe no backend**
4. **CORS não configurado**

### ✅ Soluções

#### 1. Verificar se o Backend está rodando

No Colify, verifique:
- Status do serviço backend está "Running"?
- Logs do backend mostram erros?
- Porta 5000 está configurada?

#### 2. Verificar URL da API no Frontend

No serviço do **Frontend** no Colify, verifique a variável:

```env
VITE_API_URL=https://seu-backend.colify.app/api
```

**Importante:**
- Deve ter `/api` no final
- Deve usar HTTPS (não HTTP)
- Deve ser a URL real do backend

**Como descobrir a URL do backend:**
1. No Colify, vá no serviço do **Backend**
2. Procure por **"Public URL"** ou **"Domain"**
3. Copie a URL completa
4. Adicione `/api` no final
5. Configure no frontend como `VITE_API_URL`

#### 3. Verificar Rotas do Backend

O backend deve ter a rota `/api/auth/register` configurada.

Verifique nos logs do backend se aparece:
```
🚀 Server running on port 5000
```

#### 4. Verificar CORS

No backend, verifique se `FRONTEND_URL` está correto:

```env
FRONTEND_URL=https://seu-frontend.colify.app
```

**Sem barra no final!**

---

## 🔍 Debug Passo a Passo

### 1. Testar Backend Diretamente

No terminal do backend ou via curl:

```bash
curl https://seu-backend.colify.app/api/health
```

**Resposta esperada:**
```json
{"status":"OK","message":"FortuneBet API is running"}
```

Se retornar 404, o backend não está rodando ou a URL está errada.

### 2. Testar Rota de Registro

```bash
curl -X POST https://seu-backend.colify.app/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "teste",
    "phone": "(11) 98765-4321",
    "password": "senha123",
    "confirmPassword": "senha123",
    "termsAccepted": "true"
  }'
```

**Resposta esperada:**
- Se funcionar: JSON com dados do usuário
- Se 404: Backend não está rodando ou rota não existe
- Se 500: Erro no backend (verifique logs)

### 3. Verificar Variáveis de Ambiente

**Backend:**
```env
PORT=5000
NODE_ENV=production
MONGODB_URI=mongodb://...
FRONTEND_URL=https://seu-frontend.colify.app
```

**Frontend:**
```env
VITE_API_URL=https://seu-backend.colify.app/api
```

### 4. Verificar Logs

**Backend logs devem mostrar:**
```
🚀 Server running on port 5000
✅ Database Connected: ...
```

**Frontend console deve mostrar:**
- Sem erros 404
- Requisições sendo feitas para a URL correta

---

## 🛠️ Checklist de Debug

- [ ] Backend está rodando? (Status "Running" no Colify)
- [ ] `VITE_API_URL` está correto no frontend?
- [ ] URL tem `/api` no final?
- [ ] Backend responde em `/api/health`?
- [ ] `FRONTEND_URL` está correto no backend?
- [ ] MongoDB está conectado? (verifique logs do backend)
- [ ] CORS está configurado? (verifique `FRONTEND_URL`)

---

## 📝 Exemplo de Configuração Correta

### Backend (Colify)
```env
PORT=5000
NODE_ENV=production
MONGODB_URI=mongodb://root:senha@mongodb-service:27017/default
FRONTEND_URL=https://h8csc0okokgcgk0g48s8gwcc.agenciamidas.com
```

### Frontend (Colify)
```env
VITE_API_URL=https://g04swwkwow0c8swkkwko04cc.agenciamidas.com/api
```

**Importante:** 
- Use as URLs reais do seu Colify
- Backend URL + `/api` = `VITE_API_URL`
- Frontend URL (sem `/api`) = `FRONTEND_URL` no backend

---

## 🚨 Erro Específico: 404 em /auth/register

Se você está vendo 404 especificamente em `/auth/register`:

1. **Verifique se o backend está rodando**
2. **Verifique a URL completa:**
   - Deve ser: `https://backend-url/api/auth/register`
   - Não: `https://backend-url/auth/register` (falta `/api`)
3. **Verifique os logs do backend** para ver se a rota está registrada
4. **Teste manualmente** com curl (veja acima)

---

## 💡 Dica Rápida

Se o erro é 404, geralmente significa:
- ❌ Backend não está rodando
- ❌ URL da API está errada
- ❌ Rota não existe

Se o erro é 500, significa:
- ✅ Backend está rodando
- ✅ Rota existe
- ❌ Mas há um erro no código
