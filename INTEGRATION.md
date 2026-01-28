# Integração NXGATE - Guia Completo

## Resumo da Implementação

A integração com a API NXGATE foi completamente implementada para processar depósitos e saques via PIX.

## Funcionalidades Implementadas

### Backend

1. **Modelo de Transação** (`Transaction.model.js`)
   - Armazena depósitos e saques
   - Rastreia status (pending, paid, failed, etc.)
   - Armazena dados do PIX (QR code, código copia e cola)
   - Gerencia expiração de transações

2. **Serviço NXGATE** (`nxgate.service.js`)
   - `generatePix()` - Gera PIX para depósito
   - `withdrawPix()` - Processa saque via PIX
   - Tratamento de erros e respostas

3. **Rotas de Pagamento** (`payment.routes.js`)
   - `POST /api/payments/deposit` - Criar depósito
   - `POST /api/payments/withdraw` - Criar saque
   - `GET /api/payments/transactions` - Listar transações
   - `GET /api/payments/transaction/:id` - Detalhes da transação

4. **Webhooks** (`webhook.routes.js`)
   - `POST /api/webhooks/pix` - Confirmação de depósito
   - `POST /api/webhooks/pix-withdraw` - Confirmação de saque
   - Atualização automática de saldo
   - Reembolso automático em caso de falha

### Frontend

1. **Serviço de API Atualizado**
   - Métodos para criar depósitos e saques
   - Buscar transações
   - Integração completa com backend

2. **DepositModal Atualizado**
   - Integração com API real
   - Validações de valor e CPF
   - Estados de loading e erro
   - Passa dados da transação para PixPaymentModal

3. **PixPaymentModal Atualizado**
   - Exibe QR code real da API
   - Código PIX copia e cola funcional
   - Timer baseado na data de expiração
   - Estados de loading

4. **AuthContext Atualizado**
   - Método `refreshUser()` para atualizar saldo
   - Sincronização automática após transações

## Configuração

### Variáveis de Ambiente (Backend)

Adicione ao arquivo `.env`:

```env
NXGATE_API_KEY=d6fd1a0ed8daf4b33754d9f7d494d697
WEBHOOK_BASE_URL=http://localhost:5000
```

**Importante**: Em produção, use uma URL pública acessível pela NXGATE para os webhooks.

### Webhooks em Produção

Para receber webhooks em produção, você precisa:

1. **URL Pública**: Use um serviço como ngrok para desenvolvimento ou configure um domínio público em produção
2. **HTTPS**: Os webhooks devem ser recebidos via HTTPS
3. **Validação**: Considere adicionar validação de IP ou assinatura para segurança

## Fluxo de Depósito

1. Usuário preenche valor e CPF no `DepositModal`
2. Frontend chama `POST /api/payments/deposit`
3. Backend cria transação e chama API NXGATE
4. NXGATE retorna QR code e código PIX
5. Frontend exibe QR code no `PixPaymentModal`
6. Usuário paga via PIX
7. NXGATE envia webhook para `/api/webhooks/pix`
8. Backend atualiza transação e saldo do usuário
9. Frontend pode atualizar saldo chamando `refreshUser()`

## Fluxo de Saque

1. Usuário preenche dados no `WithdrawModal`
2. Frontend chama `POST /api/payments/withdraw`
3. Backend valida saldo e cria transação
4. Saldo é debitado imediatamente
5. Backend chama API NXGATE para processar saque
6. NXGATE processa e envia webhook para `/api/webhooks/pix-withdraw`
7. Se sucesso: transação confirmada
8. Se falha: saldo é reembolsado automaticamente

## Testando a Integração

### 1. Teste de Depósito

```bash
# Criar depósito via API
curl -X POST http://localhost:5000/api/payments/deposit \
  -H "Authorization: Bearer SEU_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 50.00,
    "cpf": "123.456.789-00"
  }'
```

### 2. Simular Webhook de Depósito

```bash
curl -X POST http://localhost:5000/api/webhooks/pix \
  -H "Content-Type: application/json" \
  -d '{
    "idTransaction": "ID_DA_TRANSACAO",
    "status": "paid",
    "type": "QR_CODE_COPY_AND_PASTE_PAID"
  }'
```

### 3. Teste de Saque

```bash
curl -X POST http://localhost:5000/api/payments/withdraw \
  -H "Authorization: Bearer SEU_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 10.00,
    "pixKey": "123.456.789-00",
    "pixKeyType": "CPF",
    "cpf": "123.456.789-00"
  }'
```

## Segurança

- ✅ Validação de dados de entrada
- ✅ Autenticação JWT obrigatória
- ✅ Verificação de saldo antes de saque
- ✅ Reembolso automático em caso de falha
- ✅ Rate limiting nas rotas de autenticação
- ⚠️ **Pendente**: Validação de IP dos webhooks (recomendado em produção)
- ⚠️ **Pendente**: Assinatura de webhooks (recomendado em produção)

## Próximos Passos

1. Implementar validação de webhooks (IP whitelist ou assinatura)
2. Adicionar polling para verificar status de transações pendentes
3. Implementar histórico de transações no frontend
4. Adicionar notificações push quando transação for confirmada
5. Implementar sistema de bônus (já calculado, falta aplicar no saldo)

## Troubleshooting

### Webhook não está sendo recebido

- Verifique se `WEBHOOK_BASE_URL` está correto
- Use ngrok para desenvolvimento: `ngrok http 5000`
- Verifique logs do backend para erros

### QR Code não aparece

- Verifique se a resposta da API NXGATE contém `qrCodeImage` ou `base_64_image_url`
- Verifique logs do backend para erros na chamada da API

### Saldo não atualiza

- Verifique se o webhook está sendo recebido (logs do backend)
- Chame `refreshUser()` no frontend após confirmação
- Verifique se a transação foi atualizada no banco de dados
