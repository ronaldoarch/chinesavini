# Erros no Console - Jogos

## Erros que NÃO são do nosso código

### 1. `Uncaught SyntaxError: Unexpected token 'export' (webpage_content_reporter.js)`
- **Origem:** Extensão do navegador (ex: bloqueador de anúncios, reporter de conteúdo)
- **Solução:** Desative extensões ou teste em janela anônima sem extensões

### 2. `Uncaught TypeError: Cannot read properties of null (reading '1') at formatarURL`
- **Origem:** Código do jogo (PGSoft/igamewin) em `pgsoft6.igamewin.com`
- **Causa:** O jogo tenta parsear uma URL e o resultado é null
- **Impacto:** Pode impedir o jogo de buscar o saldo corretamente
- **Solução:** Contatar suporte da igamewin – é bug no código deles

### 3. `Allow attribute will take precedence over 'allowfullscreen'`
- **Origem:** Aviso do React sobre atributos de iframe
- **Impacto:** Baixo, não afeta funcionalidade

### 4. `The path of the provided scope ('/') is not under the max scope allowed`
- **Origem:** Service Worker do jogo ou extensão
- **Impacto:** Não afeta o saldo

---

## Correções aplicadas no nosso código

1. **Loop de sincronização:** O `visibilitychange` disparava várias vezes seguidas. Foi adicionado throttle de 3 segundos para evitar chamadas repetidas ao sync.

2. **Delay após depósito:** Pequeno delay (500ms) entre o depósito no igamewin e o launch, para dar tempo do saldo ser processado antes do jogo carregar.

3. **Log de falha:** Se o depósito no igamewin falhar, o backend agora registra um aviso nos logs.

---

## Se o saldo ainda aparecer R$0 no jogo

1. Verifique os logs do **backend** – se aparecer "deposit to igamewin failed", o problema é na API igamewin.
2. O erro `formatarURL` no jogo pode estar quebrando a busca de saldo – isso precisa ser corrigido pela igamewin.
3. Teste em outro navegador ou em janela anônima (sem extensões).
