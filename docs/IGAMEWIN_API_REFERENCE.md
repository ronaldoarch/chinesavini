# iGameWin API – Referência e conformidade

Base: **API Link Guide** (endpoint `https://igamewin.com/api/v1`).

## Transfer API (implementado)

| Método iGameWin   | Nosso serviço              | Uso |
|-------------------|----------------------------|-----|
| `user_create`     | `createUser(userCode, isDemo)` | Launch / criar usuário |
| `user_deposit`    | `depositUserBalance(userCode, reais)` | Launch (transfer mode), sync |
| `user_withdraw`   | `withdrawUserBalance(userCode, reais)` | Sync, seamless callback |
| `user_withdraw_reset` | `resetUserBalance(userCode, allUsers)` | — |
| `set_demo`        | `setDemo(userCode)`        | — |
| `game_launch`     | `launchGame(userCode, providerCode, gameCode, lang)` | Launch jogo |
| `money_info`      | `getMoneyInfo(userCode?, allUsers?)` | Saldo agente/usuário |
| `provider_list`   | `getProviderList()`        | Admin – listar provedores |
| `game_list`       | `getGameList(providerCode)`| Admin – listar jogos |
| `get_game_log`    | `getGameHistory(userCode, gameType, start, end, page, perPage)` | Histórico (slot) |

Valores monetários: **centavos** na API; internamente usamos **reais** e convertemos com `reaisToCents` / `centsToReais`.

## Seamless API (Site API – nós implementamos)

iGameWin chama **nosso** backend em modo Seamless:

- **POST** `IGAMEWIN_SEAMLESS_URL` (ex.: `https://seu-dominio.com/api/games/seamless`)
- Body: `method`, `agent_code`, `agent_secret`, `user_code`, etc.
- Métodos que tratamos:
  - `user_balance` → retornamos saldo do usuário (reais → centavos).
  - `transaction` → debitamos/creditamos saldo conforme `slot.bet_money` / `win_money` e `txn_type` (debit, credit, debit_credit).

Validação: `agent_secret` e `agent_code` devem bater com `IGAMEWIN_AGENT_SECRET` e `IGAMEWIN_AGENT_CODE`.

## Call API (Slot)

| Método iGameWin   | Nosso serviço              |
|-------------------|----------------------------|
| `control_rtp`     | `controlRTP(rtp, userCode?, userCodes?)` |
| `control_demo_spin` | `controlDemoSpin(demoSpinStart, demoSpinEnd, userCode?, userCodes?)` |

RTP: 0–95 (doc). Demo spin: start/end entre 1 e 15, start ≤ end.

## Provedores (códigos no doc)

`PRAGMATIC`, `REELKINGDOM`, `HABANERO`, `BOOONGO`, `PLAYSON`, `CQ9`, `DREAMTECH`, `EVOPLAY`, `TOPTREND`, `PGSOFT`, `GENESIS`, `EVOLUTION`, `EZUGI`.

## Samples mode (agente em demo)

Quando o **agente** está em samples/demo mode na iGameWin, use a variável:

- **`IGAMEWIN_SAMPLES_MODE`** = `true` (ou `1`, `yes`)

Comportamento do backend:

1. **user_create** – Usuários são criados com **`is_demo: true`** (doc iGameWin).
2. **Launch** – Não transfere saldo real para/da iGameWin (não faz deposit/withdraw); apenas cria usuário demo e retorna `launch_url`.
3. **Sync-balance** – Não chama a API (no-op), retorna saldo local.
4. **Seamless `transaction`** – Responde `status: 1` com saldo atual **sem alterar** o saldo real do jogador (apenas registra em GameTxnLog para auditoria).
5. **POST /games/deposit** e **/games/withdraw** – Não chamam a API; retornam sucesso sem movimentar saldo no agente.

Assim o saldo do jogador no nosso sistema não é alterado pelo jogo em samples mode; o agente iGameWin gerencia apenas o saldo demo no lado deles.

## Variáveis de ambiente

- `IGAMEWIN_AGENT_CODE` (ex.: Midaslabs)
- `IGAMEWIN_AGENT_TOKEN`
- `IGAMEWIN_AGENT_SECRET` (obrigatório para Seamless)
- `IGAMEWIN_API_MODE` = `transfer` ou `seamless`
- `IGAMEWIN_SAMPLES_MODE` = `true` quando o agente está em samples/demo mode

Em Seamless, a iGameWin precisa da URL do nosso endpoint (ex.: configurada no painel deles).
