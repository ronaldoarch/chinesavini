# Conformidade com a API Gatebox (Postman)

Análise da coleção **GATEBOX API.postman_collection.json** em relação ao backend (`gatebox.service.js` e `payment.routes.js`).

---

## 1. Authentication

| Postman | Nosso sistema | Status |
|--------|----------------|--------|
| `POST {{API_URL}}/v1/customers/auth/sign-in` | Mesmo endpoint | ✅ |
| Body: `username`, `password` | Mesmo body; credenciais vêm de `GatewayConfig` | ✅ |
| Token em `response.access_token` | Usamos `response.data.access_token` | ✅ |

---

## 2. Cash-In (Depósito PIX)

| Postman | Nosso sistema | Status |
|--------|----------------|--------|
| `POST {{API_URL}}/v1/customers/pix/create-immediate-qrcode` | Mesmo endpoint | ✅ |
| **Obrigatórios:** `externalId`, `amount`, `document`, `name`, `expire` | Enviamos todos; `document` só é enviado quando há CPF (≥11 dígitos) | ✅ |
| **Opcionais:** `email`, `phone` (ex: +5514987654321), `identification`, `description` | Suportados no payload quando fornecidos | ✅ |
| `expire`: 3600 (segundos) | Fixo 3600 no serviço | ✅ |
| Documento sem pontuação | `normalizeDocumentForGatebox` remove não-dígitos | ✅ |

**Ajuste feito:** não enviamos mais `document` vazio quando o usuário não informa CPF (alinhado ao exemplo “Cash-In com pagador diferente” do Postman).

---

## 3. Cash-Out (Saque PIX)

| Postman | Nosso sistema | Status |
|--------|----------------|--------|
| `POST {{API_URL}}/v1/customers/pix/withdraw` | Mesmo endpoint | ✅ |
| **Obrigatórios:** `externalId`, `key`, `name`, `amount` | Enviamos todos | ✅ |
| **Opcional:** `description` | Enviado quando fornecido | ✅ |
| **documentNumber:** “obrigatório apenas se validação de chave pix estiver ativa” | Enviado só quando há documento (≥11 dígitos) | ✅ |
| Chave PIX “sem pontuação” (pix-search) | Chave normalizada em `normalizePixKeyForGatebox`: | ✅ |
| | • **PHONE:** só dígitos + prefixo 55 (ex: 5594992961626) | |
| | • **CPF/CNPJ:** só dígitos | |
| | • **EMAIL:** trim + minúsculo | |
| | • **RANDOM:** trim | |

---

## 4. Consulta Status

| Postman | Nosso sistema | Status |
|--------|----------------|--------|
| `GET {{API_URL}}/v1/customers/pix/status?transactionId&externalId&endToEnd` | `getTransactionStatus(params)` monta query com os mesmos parâmetros | ✅ |

---

## 5. Endpoints não utilizados no backend

| Postman | Uso no backend |
|--------|-----------------|
| **Validar chave Pix** `GET .../pix/pix-search?dict=` | Não implementado. Opcional; a normalização da chave já atende ao formato esperado. |
| **Consultar saldo** `POST .../v1/customers/account/balance` | Não implementado. Pode ser adicionado depois se precisar exibir saldo Gatebox. |
| **Listar MEDs** `POST .../v1/customers/med/list-med` | Não implementado. Específico do fluxo Gatebox. |

---

## 6. Resumo

- **Auth, Cash-In, Cash-Out e Status** estão alinhados com a coleção Postman e com as regras de formato (documento e chave PIX sem pontuação, telefone com 55).
- **Ajustes aplicados:**
  - Cash-In: `document` só é enviado quando existe e tem ≥11 dígitos; `name` com fallback `"Pagador"`.
  - Cash-Out: chave e documento já normalizados (incluindo PHONE com 55).
- Endpoints de validação de chave, saldo e MEDs não são obrigatórios para o fluxo atual de depósito/saque.
