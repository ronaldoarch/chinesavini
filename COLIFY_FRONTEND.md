# Configuração Frontend no Colify - Guia Rápido

## ✅ Configuração Correta para Frontend

Quando você marca **"Is it a static site?"**, a porta fica desabilitada - **isso é NORMAL e CORRETO!**

### Por que a porta fica desabilitada?

- Sites estáticos são servidos diretamente pelo servidor web do Colify
- A porta 80 (HTTP) e 443 (HTTPS) são gerenciadas automaticamente
- Você não precisa se preocupar com porta para sites estáticos
- O Colify configura HTTPS automaticamente

### Configuração Completa do Frontend

**Repository URL:**
```
https://github.com/ronaldoarch/chinesavini
```

**Configurações:**
- ✅ **Branch:** `main`
- ✅ **Build Pack:** `Nixpacks`
- ✅ **Base Directory:** `/chinesa-main`
- ✅ **Publish Directory:** `/dist` ⚠️ **MUITO IMPORTANTE!**
- ✅ **Port:** `80` (fica desabilitado - **NORMAL!**)
- ✅ **Is it a static site?** ✅ **MARCADO**

### Build Command

```bash
cd chinesa-main && npm install && npm run build
```

**Não precisa de Start Command** - o Colify serve automaticamente!

### Variável de Ambiente

```env
VITE_API_URL=https://seu-backend.colify.app/api
```

**Importante:** Substitua `seu-backend.colify.app` pela URL real do seu serviço backend.

---

## 📋 Checklist Frontend

- [ ] Base Directory: `/chinesa-main`
- [ ] Publish Directory: `/dist`
- [ ] Is it a static site: ✅ MARCADO
- [ ] Port desabilitada (80): ✅ NORMAL!
- [ ] Build command configurado
- [ ] `VITE_API_URL` apontando para o backend

---

## 🎯 Resumo

**Para Frontend (React/Vite):**
- ✅ Marque "Is it a static site?"
- ✅ Port desabilitada = CORRETO!
- ✅ Configure Publish Directory como `/dist`
- ✅ O Colify gerencia tudo automaticamente

**Para Backend (Node.js/Express):**
- ❌ NÃO marque "Is it a static site?"
- ✅ Port: `5000` (você escolhe)
- ✅ Precisa de start command

---

## ❓ Dúvidas Comuns

**P: Por que a porta está desabilitada?**
R: Porque sites estáticos são servidos diretamente pelo servidor web. O Colify gerencia automaticamente HTTP (80) e HTTPS (443).

**P: Preciso configurar algo na porta?**
R: Não! Deixe como está. O Colify faz tudo automaticamente.

**P: Como funciona o HTTPS?**
R: O Colify configura HTTPS automaticamente para sites estáticos. Você só precisa acessar via `https://`.

**P: E se eu desmarcar "static site"?**
R: A porta ficaria habilitada, mas você precisaria configurar um servidor web manualmente. Para React/Vite build, é melhor deixar como static site.
