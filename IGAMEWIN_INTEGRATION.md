# Integração iGameWin API – Modo Seamless

## Visão geral

O backend usa **apenas modo Seamless** com o iGameWin:

- O iGameWin chama nosso backend para saldo e transações em tempo real.
- O saldo fica no nosso banco de dados; não há transferência para/da carteira do agente.

## Formato de valores

A API do iGameWin usa **centavos** (ex: 10000 = R$ 100,00). Nosso banco usa **reais**. A conversão é feita automaticamente no `igamewin.service.js`.

## Variáveis de ambiente

```env
IGAMEWIN_AGENT_CODE=Midaslabs
IGAMEWIN_AGENT_TOKEN=092b6406e28211f0b8f1bc2411881493
IGAMEWIN_AGENT_SECRET=19e4c979a7a5a4f70ffc30b510312317
# true | 1 | yes quando o agente iGameWin está em samples/demo mode
IGAMEWIN_SAMPLES_MODE=false
```

## Configuração no painel iGameWin

- **API Type:** Seamless Mode
- **Site EndPoint (API Link Guide):** A doc exige `POST https://domain/gold_api`. Use a URL completa:
  ```
  https://api.midas777.fun/gold_api
  ```
- Se o painel não aceitar path, tente: `https://api.midas777.fun` (o backend também responde em `/`).

## Fluxo Seamless

1. **Launch** – Cria usuário na iGameWin e retorna `launch_url`. Não há depósito.
2. **iGameWin chama nosso backend:**
   - `user_balance` → retornamos saldo do usuário (em centavos).
   - `transaction` → debitamos/creditamos conforme apostas/ganhos.
3. **sync-balance** – No-op; retorna saldo atual do nosso DB.

## Endpoints implementados

| Endpoint | Método | Descrição |
|----------|--------|-----------|
| `/api/games/launch` | POST | Lança o jogo |
| `/api/games/sync-balance` | POST | Retorna saldo atual (no-op) |
| **`/gold_api`** | POST | **Callback iGameWin (doc) – user_balance e transaction** |
| `/api/games/seamless` | POST | Alternativa ao /gold_api |
| `/api/games/balance` | GET | Retorna saldo do usuário (nosso DB) |

## Samples mode (agente em demo)

Quando o agente está em samples/demo mode no painel iGameWin:

```env
IGAMEWIN_SAMPLES_MODE=true
```

- Usuários são criados com `is_demo: true`.
- No `transaction`, respondemos sucesso mas **não alteramos** o saldo real.

## Erros comuns

- **INSUFFICIENT_USER_FUNDS**: Saldo insuficiente para a aposta.
- **INVALID_USER**: `user_code` não encontrado (deve ser o `_id` do usuário).
- **INVALID_AGENT**: `agent_secret` incorreto.
