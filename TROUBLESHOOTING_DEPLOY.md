# 🔧 Troubleshooting: Falha no Deploy

## 🐛 Problema: Deploy Falhou no Build

```
Deployment failed: Command execution failed (exit code 255)
#8 [stage-0 4/9] RUN nix-env -if .nixpacks/nixpkgs...
```

---

## 🔍 Possíveis Causas

### 1. ⚠️ NODE_ENV=production no Build Time

**Aviso mostrado:**
```
⚠️ Build-time environment variable warning: NODE_ENV=production
Issue: Skips devDependencies installation which are often required for building
```

**Problema:** Se `NODE_ENV=production` está marcado como "Available at Buildtime", o npm não instala `devDependencies`, que podem ser necessárias para o build.

**Solução:**
1. No Colify, vá em **Environment Variables**
2. Encontre `NODE_ENV`
3. **Desmarque** "Available at Buildtime" ✅
4. Mantenha apenas "Available at Runtime" ✅
5. Faça deploy novamente

---

### 2. 🌐 Problema Temporário de Rede

O erro pode ser temporário se o Nixpacks não conseguir baixar pacotes.

**Solução:**
- Aguarde alguns minutos
- Tente fazer deploy novamente
- O Colify vai tentar novamente automaticamente

---

### 3. 📦 Cache Corrompido

O cache do build pode estar corrompido.

**Solução:**
1. No Colify, vá em **Settings** do serviço
2. Procure por **"Clear Build Cache"** ou **"Rebuild"**
3. Faça um rebuild completo

---

## ✅ Soluções Recomendadas

### Solução 1: Ajustar NODE_ENV (Recomendado)

1. **No Colify - Serviço Backend:**
   - Vá em **Environment Variables**
   - Encontre `NODE_ENV`
   - **Desmarque** "Available at Buildtime"
   - **Marque** apenas "Available at Runtime"
   - Salve

2. **Faça deploy novamente**

### Solução 2: Criar nixpacks.toml

Crie um arquivo `backend/nixpacks.toml` para configurar o build:

```toml
[phases.setup]
nixPkgs = ["nodejs-22_x", "npm-10_x"]

[phases.install]
cmds = ["npm ci"]

[phases.build]
cmds = ["echo 'No build step needed'"]

[start]
cmd = "npm start"
```

### Solução 3: Verificar Logs Completos

1. No Colify, clique em **"Show Debug Logs"**
2. Procure por erros específicos
3. Verifique se há problemas de rede ou timeout

---

## 🔄 Tentar Novamente

### Opção 1: Redeploy Simples

1. No Colify, vá no serviço Backend
2. Clique em **"Redeploy"** ou **"Deploy"**
3. Aguarde o build completar

### Opção 2: Rebuild Completo

1. No Colify, vá em **Settings**
2. Procure por **"Clear Cache"** ou **"Rebuild"**
3. Faça deploy novamente

### Opção 3: Verificar Variáveis de Ambiente

Certifique-se de que as variáveis estão configuradas corretamente:

```env
# Runtime only (não marcar "Available at Buildtime")
NODE_ENV=production

# Buildtime e Runtime
PORT=5000
MONGODB_URI=...
JWT_SECRET=...
```

---

## 📋 Checklist de Troubleshooting

- [ ] `NODE_ENV` está marcado apenas como "Runtime" (não Buildtime)?
- [ ] Todas as variáveis de ambiente estão configuradas?
- [ ] Tentou fazer deploy novamente após alguns minutos?
- [ ] Verificou os logs completos (Show Debug Logs)?
- [ ] Limpou o cache do build?

---

## 🚨 Se Nada Funcionar

### Verificar se o Código Está Correto

```bash
# Localmente, testar se o build funciona
cd backend
npm ci
npm start
```

Se funcionar localmente, o problema é no ambiente de deploy.

### Contatar Suporte do Colify

Se o problema persistir:
1. Copie os logs completos
2. Verifique se há issues conhecidas no Colify
3. Entre em contato com o suporte se necessário

---

## 💡 Dica: Build Mais Rápido

Para builds mais rápidos e confiáveis:

1. **Use `.dockerignore`** para excluir arquivos desnecessários
2. **Configure cache** corretamente
3. **Use variáveis de ambiente** apenas quando necessário

---

## 🔍 Verificar Status do Deploy

Após tentar novamente, verifique:

1. **Logs do Build:**
   - Deve mostrar: `✅ Build completed successfully`
   - Não deve ter erros de rede ou timeout

2. **Logs do Runtime:**
   - Deve mostrar: `🚀 Server running on port 5000`
   - Deve conectar ao MongoDB: `✅ Database Connected`

3. **Health Check:**
   - Acesse: `https://seu-backend.com/api/health`
   - Deve retornar: `{"status":"OK","message":"FortuneBet API is running"}`

---

## 📝 Notas

- O erro `exit code 255` geralmente indica falha no processo de build
- Pode ser temporário (rede, timeout)
- Pode ser configuração (NODE_ENV, variáveis)
- Tente novamente após ajustar configurações
