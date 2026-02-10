# Integração iGameWin API

## Visão geral

O backend suporta dois modos de integração com o iGameWin:

1. **Transfer** (padrão): Saldo é transferido para o iGameWin no lançamento do jogo e devolvido ao sair.
2. **Seamless**: O iGameWin consulta nosso backend para saldo e transações em tempo real.

## Formato de valores

A API do iGameWin usa **centavos** (ex: 10000 = R$ 100,00). Nosso banco usa **reais**. A conversão é feita automaticamente no `igamewin.service.js`.

## Variáveis de ambiente

```env
IGAMEWIN_AGENT_CODE=Midaslabs
IGAMEWIN_AGENT_TOKEN=092b6406e28211f0b8f1bc2411881493
IGAMEWIN_AGENT_SECRET=19e4c979a7a5a4f70ffc30b510312317
# transfer | seamless
IGAMEWIN_API_MODE=transfer
# true | 1 | yes quando o agente iGameWin está em samples/demo mode (não movimenta saldo real)
IGAMEWIN_SAMPLES_MODE=false
```

## Samples mode (agente em demo)

Quando o **agente** está em samples/demo mode no painel iGameWin, defina:

```env
IGAMEWIN_SAMPLES_MODE=true
```

Comportamento:

- Usuários são criados com **is_demo: true** na iGameWin.
- No **launch**, não transferimos saldo real (não faz deposit/withdraw).
- No **seamless** (transaction), respondemos sucesso mas **não alteramos** o saldo real do jogador.
- **sync-balance**, **deposit** e **withdraw** para o jogo não chamam a API (no-op ou retorno simulado).

Assim o saldo do jogador no nosso sistema permanece intacto; o jogo roda em modo demo no lado iGameWin.

## Modo Transfer (produção / saldo real)

Para usar **modo transfer** (saldo real movimentado entre nosso sistema e o iGameWin):

```env
IGAMEWIN_SAMPLES_MODE=false
# ou omita IGAMEWIN_SAMPLES_MODE

IGAMEWIN_API_MODE=transfer
```

Comportamento:

- **Launch**: cria usuário **sem** `is_demo`; recupera qualquer saldo que estiver no iGameWin do usuário; deposita o saldo atual do jogador no iGameWin para aparecer no jogo.
- **Ao sair do jogo**: o frontend deve chamar **POST /api/games/sync-balance** para retirar o saldo do iGameWin e devolver ao jogador no nosso sistema.
- **POST /games/deposit** e **/games/withdraw**: chamam a API iGameWin e movimentam saldo de verdade.

O agente iGameWin deve estar em modo **não-demo** (produção) para aceitar depósitos/saques reais.

## Modo Seamless

Quando `IGAMEWIN_API_MODE=seamless`, configure no painel do iGameWin a URL de callback:

```
https://seu-dominio.com/api/games/seamless
```

O iGameWin fará POST para esse endpoint com:

- **user_balance**: Para obter o saldo do usuário (retornamos em centavos).
- **transaction**: Para registrar apostas/ganhos (atualizamos o saldo do usuário).

A validação é feita via `agent_secret` no body da requisição.

## Endpoints implementados

| Endpoint | Método | Descrição |
|----------|--------|-----------|
| `/api/games/launch` | POST | Lança o jogo (Transfer: deposita saldo; Seamless: apenas lança) |
| `/api/games/sync-balance` | POST | Sincroniza saldo ao sair (Transfer: retira do iGameWin; Seamless: no-op) |
| `/api/games/seamless` | POST | Callback do iGameWin (user_balance, transaction) - sem JWT |
| `/api/games/balance` | GET | Retorna saldo do usuário no iGameWin (em reais) |

## Erros comuns

- **INSUFFICIENT_USER_FUNDS**: Saldo insuficiente para a aposta.
- **INVALID_USER**: `user_code` não encontrado (deve ser o `_id` do usuário).
- **INVALID_AGENT**: `agent_secret` incorreto.
