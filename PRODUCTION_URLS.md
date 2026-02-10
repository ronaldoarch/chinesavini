# URLs de produção

**Backend (API):** https://api.midas777.fun  
**Frontend:** https://midas777.fun

## Configuração no Admin (Gateway / Gatebox)

- **URL Base do Webhook:** `https://api.midas777.fun`
- **URL da API (Gatebox):** `https://api.gatebox.com.br`

Os webhooks usados pelo backend são:
- Depósitos PIX: `https://api.midas777.fun/api/webhooks/pix`
- Saques PIX: `https://api.midas777.fun/api/webhooks/pix-withdraw`

## Variáveis de ambiente

**Backend**
```env
FRONTEND_URL=https://midas777.fun
WEBHOOK_BASE_URL=https://api.midas777.fun
```

**Frontend**
```env
VITE_API_URL=https://api.midas777.fun/api
```

## Painel Gatebox (uma URL para todos os eventos)

Use **uma única URL** no painel da Gatebox:

**`https://api.midas777.fun/api/webhooks/gatebox`**

O backend recebe depósitos e saques nesse endpoint e encaminha para a lógica correta automaticamente.

(As URLs separadas `/api/webhooks/pix` e `/api/webhooks/pix-withdraw` continuam disponíveis se o painel permitir mais de uma URL.)
