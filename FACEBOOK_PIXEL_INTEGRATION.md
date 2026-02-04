# Integração do Facebook Pixel

## 📋 Como Funciona

Quando você configura o Pixel ID e Access Token na página de **Rastreamento** do admin, o sistema funciona da seguinte forma:

### 1. **Backend (Conversions API)**
- O backend usa a configuração salva no `TrackingConfig` (não mais variáveis de ambiente)
- Eventos são enviados via Conversions API do Facebook:
  - **Lead**: Quando um usuário se cadastra
  - **CompleteRegistration**: Quando um usuário completa o cadastro/login
  - **Purchase**: Quando um usuário faz o primeiro depósito
- Os eventos só são enviados se estiverem marcados como "ativos" na configuração
- Todos os eventos são registrados na tabela de eventos Facebook no admin

### 2. **Frontend (Pixel JavaScript)**
- O pixel do Facebook é carregado automaticamente no frontend
- Busca o Pixel ID configurado no admin via API pública
- Rastreia eventos do lado do cliente:
  - **PageView**: Automaticamente ao carregar páginas
  - **Lead**: Quando usuário se cadastra (via `fbq('track', 'Lead')`)
  - Outros eventos podem ser rastreados conforme necessário

## ✅ Funcionalidades Implementadas

### Backend
- ✅ Usa `TrackingConfig` do banco de dados (não mais variáveis de ambiente)
- ✅ Verifica eventos ativos antes de enviar
- ✅ Registra todos os eventos (sucesso, erro, pulado) no log
- ✅ Fallback para variáveis de ambiente se não houver configuração no banco

### Frontend
- ✅ Carrega pixel dinamicamente baseado na configuração do admin
- ✅ Hook `useFacebookPixel()` para rastrear eventos
- ✅ Rastreia evento Lead no cadastro
- ✅ Rastreia PageView automaticamente

## 🔧 Configuração

1. **Acesse Admin → Rastreamento → Configuração**
2. **Preencha:**
   - Pixel ID: ID do seu pixel do Facebook
   - Access Token: Token de acesso do Facebook
   - Eventos Ativos: Selecione quais eventos devem ser enviados
3. **Salve a configuração**

## 📊 Eventos Disponíveis

- **Lead**: Cadastro de novo usuário
- **CompleteRegistration**: Usuário completa registro/login
- **Purchase**: Primeiro depósito do usuário
- **AddToCart**: Adicionar ao carrinho (não implementado ainda)
- **InitiateCheckout**: Iniciar checkout (não implementado ainda)
- **ViewContent**: Visualizar conteúdo (não implementado ainda)

## 🔍 Verificação

### Verificar se está funcionando:

1. **Configure o Pixel ID e Access Token** no admin
2. **Faça um cadastro** de teste
3. **Acesse Admin → Rastreamento → Eventos Facebook / Meta**
4. **Verifique se aparecem eventos** com status "success"

### Verificar Pixel no Frontend:

1. Abra o DevTools do navegador (F12)
2. Vá para a aba "Network"
3. Filtre por "fbevents.js"
4. Você deve ver requisições para o Facebook
5. Ou use a extensão "Facebook Pixel Helper" do Chrome

## ⚠️ Importante

- O **Pixel ID** é usado tanto no frontend (pixel JavaScript) quanto no backend (Conversions API)
- O **Access Token** é usado apenas no backend (Conversions API)
- Se você não configurar, o sistema tentará usar variáveis de ambiente como fallback
- Eventos só são enviados se estiverem marcados como "ativos" na configuração

## 🐛 Troubleshooting

### Pixel não carrega no frontend
- Verifique se o Pixel ID está configurado no admin
- Verifique o console do navegador para erros
- Verifique se a rota `/api/admin/tracking/config/public` está acessível

### Eventos não aparecem no Facebook
- Verifique se o Access Token está correto
- Verifique se o evento está marcado como "ativo" na configuração
- Verifique os logs em Admin → Rastreamento → Eventos Facebook / Meta
- Verifique se o status é "success" ou "error"

### Eventos aparecem como "skipped"
- Isso significa que o evento não está marcado como "ativo" na configuração
- Marque o evento como ativo na página de configuração
