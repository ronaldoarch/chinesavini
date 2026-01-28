# Guia de Instalação - FortuneBet

Este guia irá ajudá-lo a configurar tanto o backend quanto o frontend da aplicação FortuneBet.

## Pré-requisitos

- Node.js (versão 18 ou superior)
- npm ou yarn
- MongoDB (instalado localmente ou acesso a uma instância remota)

## Instalação do MongoDB (macOS)

```bash
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community
```

## Configuração do Backend

1. Navegue até a pasta do backend:
```bash
cd backend
```

2. Instale as dependências:
```bash
npm install
```

3. Configure as variáveis de ambiente:
```bash
cp .env.example .env
```

4. Edite o arquivo `.env` e configure:
```
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/fortune-bet
JWT_SECRET=seu-secret-jwt-super-seguro-altere-em-producao
JWT_EXPIRE=7d
FRONTEND_URL=http://localhost:3000
```

5. Inicie o servidor:
```bash
npm run dev
```

O backend estará rodando em `http://localhost:5000`

## Configuração do Frontend

1. Navegue até a pasta do frontend:
```bash
cd chinesa-main
```

2. Instale as dependências:
```bash
npm install
```

3. Configure as variáveis de ambiente:
```bash
cp .env.example .env
```

4. Edite o arquivo `.env` e configure:
```
VITE_API_URL=http://localhost:5000/api
```

5. Inicie o servidor de desenvolvimento:
```bash
npm run dev
```

O frontend estará rodando em `http://localhost:3000`

## Testando a Aplicação

### 1. Teste de Registro

1. Abra o navegador em `http://localhost:3000`
2. Clique em "Registrar"
3. Preencha o formulário:
   - Username: mínimo 3 caracteres, apenas letras, números e underscore
   - Telefone: formato brasileiro (XX) XXXXX-XXXX
   - Senha: mínimo 6 caracteres
   - Confirme a senha
   - Aceite os termos
4. Clique em "Registro"

### 2. Teste de Login

1. Clique em "Entrar"
2. Preencha:
   - Username: o mesmo usado no registro
   - Senha: a senha cadastrada
3. Clique em "Login"

### 3. Verificar Autenticação

Após o login, você deve ver:
- Seu saldo no header (R$ 0,00 inicialmente)
- Menu de usuário disponível
- Opções de depósito e perfil habilitadas

## Estrutura de Arquivos

```
chinesa2.0/
├── backend/                 # Backend Node.js/Express
│   ├── config/             # Configurações
│   ├── middleware/         # Middlewares
│   ├── models/             # Modelos Mongoose
│   ├── routes/             # Rotas da API
│   ├── utils/              # Utilitários
│   └── server.js           # Servidor principal
│
└── chinesa-main/           # Frontend React
    ├── src/
    │   ├── components/     # Componentes React
    │   ├── contexts/       # Context API
    │   ├── services/       # Serviços de API
    │   └── styles/         # Estilos CSS
    └── public/             # Arquivos estáticos
```

## Troubleshooting

### Backend não inicia

- Verifique se o MongoDB está rodando: `brew services list`
- Verifique se a porta 5000 está disponível
- Confirme que o arquivo `.env` existe e está configurado corretamente

### Frontend não conecta ao backend

- Verifique se o backend está rodando
- Confirme que `VITE_API_URL` no `.env` do frontend está correto
- Verifique o console do navegador para erros de CORS

### Erro de autenticação

- Verifique se o token está sendo salvo no localStorage
- Confirme que o JWT_SECRET está configurado no backend
- Verifique os logs do backend para mais detalhes

## Próximos Passos

- [ ] Implementar rotas de depósito
- [ ] Implementar rotas de saque
- [ ] Adicionar histórico de transações
- [ ] Implementar sistema VIP
- [ ] Adicionar sistema de referência
