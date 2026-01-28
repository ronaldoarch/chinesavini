# FortuneBet Frontend

Plataforma de jogos FortuneBet - Frontend React

## Instalação

```bash
npm install
```

## Configuração

1. Copie o arquivo `.env.example` para `.env`:
```bash
cp .env.example .env
```

2. Configure a URL da API no arquivo `.env`:
```
VITE_API_URL=http://localhost:5000/api
```

## Executar em desenvolvimento

```bash
npm run dev
```

A aplicação estará disponível em `http://localhost:3000`

## Build para produção

```bash
npm run build
```

## Estrutura do Projeto

```
src/
├── components/     # Componentes React
├── contexts/        # Context API (AuthContext)
├── services/        # Serviços de API
└── styles/         # Estilos CSS
```

## Backend

O backend está localizado em `/backend` e deve ser executado separadamente.