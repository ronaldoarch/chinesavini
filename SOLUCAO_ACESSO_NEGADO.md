# 🔒 Solução: Acesso Negado no Painel Admin

## 🐛 Problema

Ao acessar `/admin.html`, você vê a mensagem "Acesso Negado" mesmo após criar um usuário admin.

## 🔍 Causas Possíveis

### 1. **Usuário não está logado**
- O painel admin verifica se há um token no `localStorage`
- Se não houver token, mostra "Acesso Negado"

### 2. **Usuário não tem role de admin**
- O usuário está logado, mas não tem `role: 'admin'` ou `role: 'superadmin'`
- O script `create-admin` não foi executado corretamente

### 3. **Token expirado ou inválido**
- O token JWT pode ter expirado
- O token pode estar corrompido

---

## ✅ Soluções

### Solução 1: Fazer Login Primeiro

**IMPORTANTE:** Você precisa fazer login no site principal ANTES de acessar o admin!

1. **Acesse o site principal:**
   ```
   https://seu-dominio.com/
   ```

2. **Faça login** com o usuário que você tornou admin:
   - Username: `ronaldo` (ou o username que você usou)
   - Senha: a senha que você criou no registro

3. **Depois de logado, acesse:**
   ```
   https://seu-dominio.com/admin.html
   ```

### Solução 2: Verificar se o Usuário é Admin

No terminal do Colify (serviço Backend):

```bash
# Listar usuários para verificar o role
npm run list-users

# Você deve ver algo como:
# ronaldo | admin       | Ativo    | 28/01/2026
```

Se o role não for `admin` ou `superadmin`, execute:

```bash
# Tornar admin (sem usar < >)
npm run create-admin ronaldo admin
```

### Solução 3: Verificar Token no Console

1. Abra o console do navegador (F12)
2. Execute:
   ```javascript
   // Verificar se tem token
   console.log('Token:', localStorage.getItem('token'))
   
   // Verificar usuário atual
   // Isso vai fazer uma requisição para verificar
   ```

3. Se não houver token, você precisa fazer login primeiro

---

## 🔄 Fluxo Correto

### Passo 1: Criar Usuário
1. Acesse o site principal
2. Faça o registro normalmente
3. Anote o username e senha

### Passo 2: Tornar Admin
No terminal do Colify:
```bash
cd backend
npm run create-admin ronaldo admin
```

### Passo 3: Fazer Login
1. Acesse o site principal
2. Faça login com o usuário criado
3. Confirme que está logado (deve ver seu saldo no header)

### Passo 4: Acessar Admin
1. Com o usuário logado, acesse `/admin.html`
2. Agora deve funcionar!

---

## 🐛 Troubleshooting

### "Acesso Negado" mesmo logado

**Verificar no console do navegador:**
```javascript
// Ver token
localStorage.getItem('token')

// Ver usuário atual (via API)
fetch('https://seu-backend.com/api/auth/me', {
  headers: {
    'Authorization': 'Bearer ' + localStorage.getItem('token')
  }
})
.then(r => r.json())
.then(data => console.log('User:', data))
```

**Se o role não for admin:**
```bash
# No Colify, executar:
npm run create-admin ronaldo admin
```

**Depois, fazer logout e login novamente** para atualizar o token.

### Token não está sendo salvo

1. Verifique se o login está funcionando
2. Verifique o console do navegador para erros
3. Tente fazer logout e login novamente

### Usuário não encontrado ao criar admin

```bash
# Listar usuários primeiro
npm run list-users

# Usar o username EXATO que aparece na lista
npm run create-admin username_exato admin
```

---

## 💡 Dicas

1. **Sempre faça login primeiro** antes de acessar `/admin.html`
2. **Use o username exato** (case-sensitive) ao criar admin
3. **Faça logout e login novamente** após tornar um usuário admin
4. **Verifique o role** com `npm run list-users` antes de tentar acessar

---

## 🔐 Verificação Rápida

Execute no console do navegador (F12) após fazer login:

```javascript
// Verificar autenticação
const token = localStorage.getItem('token')
console.log('Token existe?', !!token)

// Verificar usuário atual
fetch('/api/auth/me', {
  headers: {
    'Authorization': 'Bearer ' + token
  }
})
.then(r => r.json())
.then(data => {
  console.log('Usuário:', data.data?.user)
  console.log('Role:', data.data?.user?.role)
  console.log('É admin?', ['admin', 'superadmin'].includes(data.data?.user?.role))
})
```

Se `É admin?` for `false`, você precisa executar `npm run create-admin` novamente.

---

## ✅ Checklist

- [ ] Usuário foi criado via registro normal
- [ ] `npm run create-admin` foi executado com sucesso
- [ ] `npm run list-users` mostra o role como `admin` ou `superadmin`
- [ ] Login foi feito no site principal
- [ ] Token está no `localStorage` (verificar no console)
- [ ] Acessar `/admin.html` após estar logado

Se todos os itens estiverem marcados e ainda não funcionar, verifique os logs do backend no Colify.
