# Painel Administrativo - FortuneBet

## Visão Geral

O painel administrativo permite gerenciar todos os aspectos da plataforma FortuneBet, incluindo usuários, transações, depósitos e saques.

## Acesso

### Criar Usuário Admin

Para criar um usuário administrador, você precisa atualizar manualmente o banco de dados:

```javascript
// No MongoDB shell ou usando Mongoose
db.users.updateOne(
  { username: "seu_usuario" },
  { $set: { role: "admin" } }
)

// Para super admin
db.users.updateOne(
  { username: "seu_usuario" },
  { $set: { role: "superadmin" } }
)
```

Ou via código Node.js:

```javascript
const User = require('./models/User.model')
await User.updateOne(
  { username: 'admin' },
  { role: 'admin' }
)
```

## Funcionalidades

### 1. Dashboard

- **Estatísticas de Usuários**
  - Total de usuários
  - Usuários ativos
  - Novos usuários hoje
  - Novos usuários este mês

- **Estatísticas de Depósitos**
  - Total depositado
  - Quantidade de depósitos
  - Depósitos hoje
  - Depósitos este mês
  - Depósitos pendentes

- **Estatísticas de Saques**
  - Total sacado
  - Quantidade de saques
  - Saques hoje
  - Saques este mês
  - Saques pendentes

- **Saldo Total**
  - Soma de todos os saldos dos usuários

- **Transações Recentes**
  - Últimas 10 transações com detalhes

### 2. Gerenciamento de Usuários

- **Listar Usuários**
  - Busca por username ou telefone
  - Paginação
  - Filtros por status (ativo/inativo)

- **Visualizar Detalhes**
  - Informações completas do usuário
  - Histórico de transações

- **Editar Usuário**
  - Alterar saldo
  - Alterar nível VIP
  - Ativar/Desativar conta
  - Alterar role (apenas superadmin)

### 3. Gerenciamento de Transações

- **Listar Transações**
  - Filtros por tipo (depósito/saque)
  - Filtros por status
  - Paginação
  - Busca por usuário

- **Visualizar Detalhes**
  - Informações completas da transação
  - Dados do webhook
  - Código PIX (para depósitos)
  - Informações de saque

- **Alterar Status**
  - Atualizar status manualmente
  - Atualização automática de saldo
  - Reembolso automático em caso de falha

## Rotas da API Admin

### Dashboard
- `GET /api/admin/dashboard` - Estatísticas do dashboard

### Usuários
- `GET /api/admin/users` - Listar usuários
- `GET /api/admin/users/:id` - Detalhes do usuário
- `PUT /api/admin/users/:id` - Atualizar usuário

### Transações
- `GET /api/admin/transactions` - Listar transações
- `GET /api/admin/transactions/:id` - Detalhes da transação
- `PUT /api/admin/transactions/:id/status` - Atualizar status

## Permissões

### Admin
- Acesso ao dashboard
- Gerenciar usuários
- Visualizar transações
- Alterar status de transações
- Editar saldo de usuários

### Super Admin
- Todas as permissões de Admin
- Alterar roles de usuários
- Acesso completo ao sistema

## Como Usar

### 1. Acessar o Painel Admin

Acesse: `http://localhost:3000/admin.html`

Ou configure o Vite para servir o admin em uma rota específica.

### 2. Fazer Login

Faça login com uma conta que tenha role `admin` ou `superadmin`.

### 3. Navegar pelo Painel

- Use o menu lateral para navegar entre as seções
- Dashboard: Visualize estatísticas gerais
- Usuários: Gerencie contas de usuários
- Transações: Gerencie depósitos e saques

## Segurança

- ✅ Autenticação JWT obrigatória
- ✅ Verificação de role admin
- ✅ Validação de dados de entrada
- ✅ Proteção contra alterações não autorizadas
- ⚠️ **Recomendado**: Adicionar rate limiting nas rotas admin
- ⚠️ **Recomendado**: Log de ações administrativas
- ⚠️ **Recomendado**: Autenticação de dois fatores para admins

## Próximas Melhorias

1. Sistema de logs de ações administrativas
2. Exportação de relatórios (PDF/Excel)
3. Gráficos e visualizações avançadas
4. Notificações em tempo real
5. Sistema de permissões mais granular
6. Auditoria de mudanças

## Troubleshooting

### Não consigo acessar o admin

- Verifique se o usuário tem role `admin` ou `superadmin`
- Verifique se está autenticado
- Verifique os logs do backend para erros

### Dashboard não carrega

- Verifique se o MongoDB está conectado
- Verifique os logs do backend
- Verifique se há dados no banco

### Não consigo editar usuários

- Verifique se você tem permissões de admin
- Verifique se o usuário existe
- Verifique os logs para erros de validação
