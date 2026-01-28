# Variáveis de Ambiente do Frontend

## 📋 Lista de Variáveis

### 🔴 OBRIGATÓRIA

```env
# URL da API Backend
VITE_API_URL=https://seu-backend.colify.app/api
```

---

## 📝 Descrição Detalhada

### VITE_API_URL

**O que é:** URL base da API backend onde o frontend vai fazer requisições

**Formato:** URL completa com `/api` no final

**Exemplo para Colify:**
```env
VITE_API_URL=https://fortune-bet-backend.colify.app/api
```

**⚠️ IMPORTANTE:**
- Use HTTPS em produção
- Inclua `/api` no final
- Sem barra no final da URL
- Substitua `seu-backend.colify.app` pela URL real do seu backend

---

## 🎯 Exemplo Completo para Colify

```env
VITE_API_URL=https://fortune-bet-backend.colify.app/api
```

---

## ✅ Checklist

- [ ] `VITE_API_URL` configurada com URL real do backend
- [ ] URL inclui `/api` no final
- [ ] Usando HTTPS (não HTTP)
- [ ] URL do backend está correta e acessível

---

## 🔗 Como Descobrir a URL do Backend

1. No Colify, vá no serviço do **Backend**
2. Procure por **"Public URL"** ou **"Domain"**
3. Copie a URL completa
4. Adicione `/api` no final
5. Configure no frontend como `VITE_API_URL`

**Exemplo:**
- URL do backend: `https://fortune-bet-backend.colify.app`
- `VITE_API_URL`: `https://fortune-bet-backend.colify.app/api`

---

## 🐛 Troubleshooting

### Frontend não conecta ao backend

**Verifique:**
- ✅ `VITE_API_URL` está correto?
- ✅ Tem `/api` no final?
- ✅ Backend está rodando?
- ✅ CORS está configurado no backend?
- ✅ `FRONTEND_URL` no backend está correto?

### Erro de CORS

Se aparecer erro de CORS:
1. Verifique se `FRONTEND_URL` no backend está correto
2. Verifique se `VITE_API_URL` no frontend está correto
3. Ambos devem usar HTTPS em produção

### Erro 404 nas requisições

- Verifique se tem `/api` no final da `VITE_API_URL`
- Verifique se o backend está rodando
- Verifique se as rotas do backend estão corretas

---

## 📚 Como Funciona no Vite

No Vite, variáveis de ambiente devem começar com `VITE_` para serem expostas ao código do frontend.

**No código:**
```javascript
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
```

**Na variável de ambiente:**
```env
VITE_API_URL=https://seu-backend.colify.app/api
```

---

## 🔐 Segurança

**NUNCA faça:**
- ❌ Commitar variáveis de ambiente no Git
- ❌ Usar URLs de desenvolvimento em produção
- ❌ Expor chaves de API no frontend

**SEMPRE faça:**
- ✅ Usar variáveis de ambiente no Colify
- ✅ Usar HTTPS em produção
- ✅ Validar URLs antes de fazer deploy

---

## 💡 Dica

Se você mudar a `VITE_API_URL` após o build, você precisará fazer rebuild do frontend, pois o Vite injeta essas variáveis no momento do build.

**Solução:** Configure a variável ANTES de fazer o build no Colify.
