# FortuneBet Backend

Backend API para plataforma FortuneBet

## Instalação

```bash
npm install
```

## Configuração

1. Copie o arquivo `.env.example` para `.env`:
```bash
cp .env.example .env
```

2. Configure as variáveis de ambiente no arquivo `.env`:
```
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/fortune-bet
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRE=7d
FRONTEND_URL=http://localhost:3000
```

## Banco de Dados

Este projeto usa MongoDB. Certifique-se de ter o MongoDB instalado e rodando localmente, ou configure uma URI de conexão remota.

### Instalação do MongoDB (macOS)

```bash
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community
```

## Executar em desenvolvimento

```bash
npm run dev
```

A API estará disponível em `http://localhost:5000`

## Executar em produção

```bash
npm start
```

## Estrutura do Projeto

```
backend/
├── config/         # Configurações (database)
├── middleware/     # Middlewares (auth, error handling)
├── models/         # Modelos Mongoose
├── routes/         # Rotas da API
└── utils/          # Utilitários
```

## Rotas da API

### Autenticação

- `POST /api/auth/register` - Registrar novo usuário
- `POST /api/auth/login` - Login de usuário
- `GET /api/auth/me` - Obter usuário atual (requer autenticação)

### Health Check

- `GET /api/health` - Verificar status da API

## Exemplo de Requisição

### Registro

```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "usuario123",
    "phone": "(11) 98765-4321",
    "password": "senha123",
    "confirmPassword": "senha123",
    "termsAccepted": "true"
  }'
```

### Login

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "usuario123",
    "password": "senha123"
  }'
```

## Segurança

- Senhas são hasheadas usando bcrypt
- Tokens JWT para autenticação
- Rate limiting nas rotas de autenticação
- Validação de dados de entrada
- Helmet para segurança HTTP
