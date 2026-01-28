# 🖥️ Como Executar Comandos no Colify

## ⚠️ Problemas Comuns

### 1. "cd: can't cd to backend"

**Causa:** No Colify, o diretório de trabalho pode ser diferente.

**Solução:**
```bash
# Ver onde você está
pwd

# Se estiver em /app, o backend pode estar em:
cd /app/backend

# OU se o projeto está em outro lugar:
find . -name "package.json" -type f | grep backend
```

### 2. "cannot open ronaldo: No such file"

**Causa:** Você usou `<ronaldo>` ao invés de `ronaldo`.

**❌ ERRADO:**
```bash
npm run create-admin <ronaldo> admin
```

**✅ CORRETO:**
```bash
npm run create-admin ronaldo admin
```

**Nunca use `< >` ao redor do username!**

### 3. "Missing script: list-users"

**Causa:** O script não está sendo encontrado.

**Solução:**
```bash
# Verificar se o script existe
ls -la scripts/listUsers.js

# Verificar package.json
cat package.json | grep list-users

# Se não existir, você pode executar diretamente:
node scripts/listUsers.js
```

---

## 🚀 Comandos Corretos

### Listar Usuários

```bash
# Opção 1: Via npm script
npm run list-users

# Opção 2: Diretamente com node
node scripts/listUsers.js
```

### Criar Admin

```bash
# Formato correto (SEM < >)
npm run create-admin ronaldo admin

# OU diretamente:
node scripts/createAdmin.js ronaldo admin
```

---

## 📍 Encontrar o Diretório Correto

No Colify, o projeto pode estar em diferentes locais:

```bash
# Ver diretório atual
pwd

# Procurar pelo arquivo createAdmin.js
find . -name "createAdmin.js" -type f

# Procurar pelo package.json do backend
find . -name "package.json" -type f | grep backend

# Listar estrutura de diretórios
ls -la
ls -la backend/
```

---

## ✅ Passo a Passo Completo

### 1. Acessar Terminal do Colify

1. Vá no serviço **Backend** no Colify
2. Clique em **"Terminal"** ou **"Console"**

### 2. Verificar Localização

```bash
# Ver onde está
pwd

# Listar arquivos
ls -la
```

### 3. Navegar até o Backend (se necessário)

```bash
# Se estiver em /app
cd /app/backend

# OU se estiver na raiz do projeto
cd backend

# Verificar se está no lugar certo
ls -la scripts/
```

### 4. Listar Usuários

```bash
# Ver todos os usuários
npm run list-users

# OU
node scripts/listUsers.js
```

### 5. Criar Admin

```bash
# Substitua "ronaldo" pelo username REAL do usuário
npm run create-admin ronaldo admin

# OU
node scripts/createAdmin.js ronaldo admin
```

---

## 🔍 Verificar se Funcionou

```bash
# Listar usuários novamente
npm run list-users

# Você deve ver algo como:
# ronaldo | admin       | Ativo    | 28/01/2026
```

---

## 💡 Dicas Importantes

1. **Nunca use `< >` ao redor do username**
2. **O username é case-sensitive** (ronaldo ≠ Ronaldo)
3. **O usuário deve existir primeiro** (criado via registro)
4. **Use `npm run list-users`** para ver os usernames corretos

---

## 🐛 Se Ainda Não Funcionar

### Verificar Estrutura do Projeto

```bash
# Ver estrutura completa
tree -L 3

# OU
find . -type d -maxdepth 3
```

### Executar Diretamente com Node

```bash
# Ir até o diretório do script
cd /caminho/para/backend/scripts

# Executar diretamente
node createAdmin.js ronaldo admin
```

### Verificar Variáveis de Ambiente

```bash
# Ver se MONGODB_URI está configurada
echo $MONGODB_URI

# Ver todas as variáveis
env | grep MONGODB
```

---

## 📞 Exemplo Completo

```bash
# 1. Verificar localização
$ pwd
/app

# 2. Navegar até backend
$ cd backend
$ pwd
/app/backend

# 3. Verificar scripts
$ ls scripts/
createAdmin.js  listUsers.js

# 4. Listar usuários
$ npm run list-users
✅ Connected to MongoDB
📋 Usuários cadastrados:
────────────────────────────────────────────────────────────────────────────────
Username             | Role         | Status   | Cadastro
────────────────────────────────────────────────────────────────────────────────
ronaldo              | user         | Ativo    | 28/01/2026
joao                 | user         | Ativo    | 27/01/2026

# 5. Criar admin
$ npm run create-admin ronaldo admin
✅ Connected to MongoDB
✅ Usuário "ronaldo" agora é admin

# 6. Verificar
$ npm run list-users
...
ronaldo              | admin        | Ativo    | 28/01/2026
```

---

## ⚠️ Lembre-se

- **Sem `< >`** ao redor do username
- **Username exato** (case-sensitive)
- **Usuário deve existir** primeiro
- **Verifique o diretório** antes de executar
