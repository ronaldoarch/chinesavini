# iGameWin API – Referência (API Link Guide)

**Endpoint:** `https://igamewin.com/api/v1`  
**Valores:** Todos os valores monetários na API são em **centavos** (ex: 10000 = R$ 100,00).

---

## Transfer API

Fluxo: saldo sai da carteira do agente (na iGameWin) e vai para o saldo do jogador no jogo. O agente precisa ter saldo na carteira para `user_deposit` funcionar.

### 1. user_create

```json
{
  "method": "user_create",
  "agent_code": "Midaslabs",
  "agent_token": "...",
  "user_code": "test",
  "is_demo": true  // opcional
}
```

**Resposta sucesso:** `{ "status": 1, "msg": "SUCCESS", "user_code": "test", "user_balance": 0 }`  
**Erros:** `DUPLICATED_USER`, `MAX_DEMO_USER`

### 2. user_deposit

Transfere saldo da carteira do agente para o jogador.

```json
{
  "method": "user_deposit",
  "agent_code": "Midaslabs",
  "agent_token": "...",
  "user_code": "test",
  "amount": 10000
}
```

**Resposta sucesso:** `{ "status": 1, "msg": "SUCCESS", "agent_balance": 990000, "user_balance": 10000 }`  
**Erro:** `INSUFFICIENT_AGENT_FUNDS` — saldo do agente insuficiente.

### 3. user_withdraw

Retira saldo do jogador e devolve para a carteira do agente.

```json
{
  "method": "user_withdraw",
  "agent_code": "Midaslabs",
  "agent_token": "...",
  "user_code": "test",
  "amount": 10000
}
```

**Erro:** `INSUFFICIENT_USER_FUNDS` — saldo do jogador insuficiente.

### 4. user_withdraw_reset

Zera o saldo do jogador no jogo e devolve à carteira do agente.

```json
{ "method": "user_withdraw_reset", "agent_code": "...", "agent_token": "...", "user_code": "test" }
// ou
{ "method": "user_withdraw_reset", "agent_code": "...", "agent_token": "...", "all_users": true }
```

**Resposta:** `agent.balance`, `user.balance` (ou `user_list`), `withdraw_amount`.

### 5. set_demo

Marca usuário como demo.

### 6. game_launch

Retorna URL para abrir o jogo.

---

## 7. money_info (Get Balance of Agent and User)

**Sem `user_code`** — retorna apenas saldo do agente:

```json
{
  "method": "money_info",
  "agent_code": "Midaslabs",
  "agent_token": "..."
}
```

**Resposta:**
```json
{
  "status": 1,
  "msg": "SUCCESS",
  "agent": {
    "agent_code": "Midaslabs",
    "balance": 1000000
  }
}
```

**Com `user_code`** — retorna agente + usuário:

```json
{
  "method": "money_info",
  "agent_code": "Midaslabs",
  "agent_token": "...",
  "user_code": "test"
}
```

**Resposta:** `agent` + `user` (ambos com `balance` em centavos).

**Com `all_users`** — retorna agente + lista de usuários.

---

## Seamless API (Site API) – Modo único

O backend usa **apenas Seamless**. O iGameWin chama **nosso** backend:

- **user_balance** — retornamos saldo do usuário (em centavos).
- **transaction** — debitamos/creditamos conforme `slot.bet_money`, `win_money`, `txn_type`.

Assim não há `INSUFFICIENT_AGENT_FUNDS` em Seamless — o saldo fica no nosso sistema.

---

## Error Code (API Link Guide)

| Código | Descrição |
|--------|-----------|
| INVALID_METHOD | Método inválido |
| INVALID_PARAMETER | Parâmetro inválido |
| INVALID_AGENT | Agente inválido |
| INVALID_AGENT_ROLE | Role do agente inválido |
| BLOCKED_AGENT | Agente bloqueado |
| INVALID_USER | Usuário inválido |
| MAX_DEMO_USER | Máximo de usuários demo (500) |
| **INSUFFICIENT_AGENT_FUNDS** | **Saldo do agente insuficiente** |
| INSUFFICIENT_USER_FUNDS | Saldo do usuário insuficiente |
| DUPLICATED_USER | Usuário duplicado |
| INVALID_PROVIDER | Provedor inválido |
| INTERNAL_ERROR | Erro interno |
| AGENT_SEAMLESS | Erro Seamless do agente |

---

## Nosso mapeamento (Seamless)

| Método iGameWin | Serviço | Uso |
|-----------------|---------|-----|
| user_create | createUser(userCode, isDemo) | Launch |
| game_launch | launchGame(...) | Launch jogo |
| Site API (user_balance, transaction) | POST /api/games/seamless | iGameWin chama nós |
