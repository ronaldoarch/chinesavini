# 👤 Como Criar um Usuário Administrador

## 📋 Pré-requisitos

1. O usuário **deve existir** primeiro através do registro normal no site
2. Você precisa ter acesso ao servidor/terminal onde o backend está rodando
3. MongoDB deve estar conectado e funcionando

---

## 🚀 Passo a Passo

### 1️⃣ Criar o Usuário Normalmente

Primeiro, faça o registro do usuário através do site normalmente:
- Acesse a página de registro
- Crie a conta com username e senha
- Faça login uma vez para garantir que está funcionando

### 2️⃣ Tornar o Usuário Admin

No servidor onde o backend está rodando, execute:

```bash
cd backend
npm run create-admin <username> admin
```

**Exemplo:**
```bash
cd backend
npm run create-admin joao admin
```

### 3️⃣ Tornar o Usuário Superadmin (Opcional)

Para dar permissões completas:

```bash
cd backend
npm run create-admin <username> superadmin
```

**Exemplo:**
```bash
cd backend
npm run create-admin maria superadmin
```

---

## 🔍 Verificar se Funcionou

1. Faça login no site normalmente
2. Acesse: `https://seu-dominio.com/admin.html`
3. Você deve ver o painel administrativo

---

## ⚠️ Troubleshooting

### Erro: "Usuário não encontrado"

**Causa:** O username não existe no banco de dados.

**Solução:**
1. Verifique se o usuário foi criado corretamente
2. Confirme o username exato (case-sensitive)
3. Liste os usuários para verificar:
   ```bash
   cd backend
   npm run list-users
   ```

### Erro: "Role deve ser admin ou superadmin"

**Causa:** Você passou um role inválido.

**Solução:** Use apenas `admin` ou `superadmin`:
```bash
npm run create-admin joao admin        # ✅ Correto
npm run create-admin joao superadmin   # ✅ Correto
npm run create-admin joao administrator # ❌ Errado
```

### Erro: "Can't cd to backend"

**Causa:** Você não está no diretório correto.

**Solução:** Navegue até o diretório backend primeiro:
```bash
cd /caminho/para/seu/projeto/backend
npm run create-admin joao admin
```

---

## 📝 Exemplo Completo

```bash
# 1. Navegar até o backend
cd /Volumes/midascod/chinesa2.0/backend

# 2. Criar admin
npm run create-admin diago97 admin

# Saída esperada:
# ✅ Connected to MongoDB
# ✅ Usuário "diago97" agora é admin
# 📧 Você pode fazer login em http://localhost:3000/admin.html
```

---

## 🔐 Níveis de Permissão

- **user** (padrão): Acesso normal ao site
- **admin**: Acesso ao painel administrativo (gerenciar usuários, transações)
- **superadmin**: Acesso completo (todas as funcionalidades administrativas)

---

## 💡 Dicas

1. **Sempre crie o usuário primeiro** através do registro normal
2. **Use o username exato** (sem espaços, case-sensitive)
3. **Teste o login** após criar o admin para garantir que funciona
4. **Mantenha segredo** sobre quem são os admins

---

## 🆘 Precisa de Ajuda?

Se ainda tiver problemas:
1. Verifique os logs do backend
2. Confirme que o MongoDB está conectado
3. Verifique se o usuário existe no banco de dados
