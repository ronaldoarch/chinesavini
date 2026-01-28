# FortuneBet - Plataforma de Jogos e Apostas

Plataforma completa de jogos e apostas com sistema de pagamentos PIX integrado.

## 🚀 Tecnologias

### Backend
- Node.js + Express
- MongoDB (com suporte para PostgreSQL via DATABASE_URL)
- JWT Authentication
- Integração com API NXGATE para pagamentos PIX

### Frontend
- React 18
- Vite
- Context API para gerenciamento de estado
- Design mobile-first

## 📁 Estrutura do Projeto

```
chinesa2.0/
├── backend/              # API Backend
│   ├── config/          # Configurações
│   ├── middleware/      # Middlewares
│   ├── models/          # Modelos de dados
│   ├── routes/          # Rotas da API
│   ├── services/        # Serviços (NXGATE)
│   └── scripts/         # Scripts utilitários
│
└── chinesa-main/        # Frontend React
    ├── src/
    │   ├── components/  # Componentes React
    │   ├── contexts/    # Context API
    │   ├── pages/       # Páginas (Admin)
    │   ├── services/    # Serviços de API
    │   └── styles/      # Estilos CSS
    └── public/          # Arquivos estáticos
```

## 🛠️ Instalação

### Backend

```bash
cd backend
npm install
cp .env.example .env
# Configure as variáveis de ambiente no .env
npm run dev
```

### Frontend

```bash
cd chinesa-main
npm install
cp .env.example .env
# Configure VITE_API_URL no .env
npm run dev
```

## 📝 Variáveis de Ambiente

### Backend (.env)
```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/fortune-bet
# Ou para PostgreSQL (Colify):
# DATABASE_URL=postgresql://user:password@host:port/database
JWT_SECRET=your-secret-key
JWT_EXPIRE=7d
FRONTEND_URL=http://localhost:3000
NXGATE_API_KEY=sua-api-key
WEBHOOK_BASE_URL=http://localhost:5000
```

### Frontend (.env)
```env
VITE_API_URL=http://localhost:5000/api
```

## 🔐 Criar Usuário Admin

```bash
cd backend
npm run create-admin <username> [admin|superadmin]
```

## 📚 Documentação

- [INSTALL.md](INSTALL.md) - Guia de instalação completo
- [INTEGRATION.md](INTEGRATION.md) - Guia de integração NXGATE
- [ADMIN.md](ADMIN.md) - Documentação do painel administrativo

## 🌐 Deploy

### Colify (Railway/Similar)

1. Configure as variáveis de ambiente no painel
2. Use `DATABASE_URL` para PostgreSQL
3. Configure `WEBHOOK_BASE_URL` com a URL pública do seu backend
4. Configure `FRONTEND_URL` com a URL do frontend

## 📄 Licença

ISC
