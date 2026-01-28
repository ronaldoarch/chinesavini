# Guia de Deploy - Colify/Railway

## ⚠️ Importante sobre PostgreSQL

O código atual usa **Mongoose** que é específico para **MongoDB**. Para usar PostgreSQL no Colify, você tem duas opções:

### Opção 1: Usar MongoDB no Colify (Recomendado)
- Configure um serviço MongoDB (MongoDB Atlas gratuito ou serviço do Colify)
- Use a variável `MONGODB_URI` normalmente

### Opção 2: Migrar para PostgreSQL
Se você realmente precisa usar PostgreSQL, será necessário migrar o código para usar **Sequelize** ou **Prisma** ao invés de Mongoose.

## 📋 Configuração no Colify

### Variáveis de Ambiente

Configure as seguintes variáveis no painel do Colify:

```env
# Server
PORT=5000
NODE_ENV=production

# Database
# Para MongoDB:
MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/fortune-bet
# OU para PostgreSQL:
DATABASE_URL=postgresql://user:password@host:port/database

# JWT
JWT_SECRET=seu-jwt-secret-super-seguro-aqui
JWT_EXPIRE=7d

# CORS - URL do seu frontend
FRONTEND_URL=https://seu-frontend.com

# NXGATE API
NXGATE_API_KEY=sua-api-key-nxgate
WEBHOOK_BASE_URL=https://seu-backend.colify.app
```

### Build e Start Commands

**Backend:**
- Build Command: `cd backend && npm install`
- Start Command: `cd backend && npm start`

**Frontend:**
- Build Command: `cd chinesa-main && npm install && npm run build`
- Start Command: `cd chinesa-main && npm run preview`

## 🔧 Configuração do Banco de Dados

### MongoDB (Recomendado)

1. Crie uma conta no [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Crie um cluster gratuito
3. Obtenha a connection string
4. Configure `MONGODB_URI` no Colify

### PostgreSQL (Requer Migração)

Se você escolher PostgreSQL, precisará:

1. Instalar Sequelize ou Prisma
2. Migrar os modelos de Mongoose para Sequelize/Prisma
3. Atualizar todas as rotas e serviços

**Exemplo com Sequelize:**

```bash
cd backend
npm install sequelize pg pg-hstore
```

## 🌐 Webhooks

**IMPORTANTE**: Configure `WEBHOOK_BASE_URL` com a URL pública do seu backend no Colify.

Exemplo:
```
WEBHOOK_BASE_URL=https://fortune-bet-backend.colify.app
```

## 📝 Checklist de Deploy

- [ ] Variáveis de ambiente configuradas
- [ ] Banco de dados configurado e conectado
- [ ] `WEBHOOK_BASE_URL` apontando para URL pública
- [ ] `FRONTEND_URL` configurado corretamente
- [ ] `JWT_SECRET` definido (não use o padrão!)
- [ ] Build commands configurados
- [ ] Testar conexão com banco de dados
- [ ] Testar webhooks (usar ngrok para desenvolvimento)

## 🐛 Troubleshooting

### Erro de conexão com banco

- Verifique se a URL do banco está correta
- Verifique se o banco permite conexões externas
- Verifique firewall/whitelist do banco

### Webhooks não funcionam

- Verifique se `WEBHOOK_BASE_URL` está correto
- Verifique se a URL é acessível publicamente
- Use HTTPS (obrigatório em produção)

### CORS errors

- Verifique se `FRONTEND_URL` está correto
- Adicione a URL do frontend no CORS do backend

## 📚 Recursos

- [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
- [Railway Docs](https://docs.railway.app/)
- [Colify Docs](https://docs.colify.app/)
