# 📦 Configuração de Volume Persistente no Colify

## 🎯 Objetivo

Configurar um volume Docker persistente para que **logos e banners não desapareçam** após cada deploy.

## 📍 Passo a Passo Detalhado

### 1. Acesse a Configuração do Serviço Backend

1. Entre no painel do Colify
2. Selecione o projeto
3. Selecione o ambiente
4. Clique no serviço **Backend**
5. Vá para a aba **"Advanced"** ou procure por **"Volumes"** ou **"Configuration"**

### 2. Adicionar Volume Mount

1. Procure pela seção **"Docker Volumes mounted to the container"**
2. Clique no botão **"Add Volume Mount"** ou **"Add"**

### 3. Preencher os Campos

Na modal que aparecer, preencha:

#### Campo: **Name**
```
uploads-storage
```
- Pode ser qualquer nome descritivo
- Exemplos: `uploads-data`, `media-storage`, `persistent-uploads`

#### Campo: **Source Path** (Caminho no Servidor Host)
```
/root/uploads
```
- Este é o caminho **no servidor host** onde os arquivos ficarão salvos
- Este caminho **persiste** mesmo após deploys
- Você pode escolher outro caminho se preferir:
  - `/var/data/uploads`
  - `/home/uploads`
  - `/data/uploads`

#### Campo: **Destination Path** (Caminho no Container) ⚠️ IMPORTANTE
```
/app/backend/uploads
```
- Este é o caminho **dentro do container Docker**
- Deve corresponder ao caminho onde o código salva os arquivos
- **Caminho padrão no Colify/Nixpacks**: `/app/backend/uploads`
- Se você usar Dockerfile customizado, verifique o `WORKDIR`

### 4. Salvar e Aplicar

1. Clique no botão **"Add"** na modal
2. O volume aparecerá na lista de volumes montados
3. **Faça um novo deploy** para aplicar as mudanças

## 🔍 Verificar Caminho Correto do Container

Se você não tiver certeza do caminho dentro do container:

### Opção 1: Via Terminal do Colify
1. Acesse o terminal do serviço Backend no Colify
2. Execute:
   ```bash
   pwd
   ls -la
   ```
3. Procure pelo diretório `uploads` ou verifique onde o código está rodando

### Opção 2: Via Logs
1. Verifique os logs do backend
2. Procure por mensagens que mostram o caminho de uploads
3. O código cria o diretório automaticamente em: `backend/uploads/`

### Opção 3: Caminhos Comuns

Dependendo da configuração, o caminho pode ser:
- `/app/backend/uploads` (Nixpacks padrão)
- `/app/uploads` (se base directory for `/`)
- `/usr/src/app/backend/uploads` (Dockerfile customizado)
- `/app/backend/uploads` (mais comum no Colify)

## ✅ Teste de Funcionamento

Após configurar o volume:

1. **Faça upload de uma logo ou banner** via admin
2. **Verifique se o arquivo foi criado**:
   - Acesse o terminal do Colify
   - Execute: `ls -la /root/uploads` (ou o Source Path que você configurou)
   - Você deve ver os arquivos lá
3. **Faça um novo deploy** (recrie o container)
4. **Verifique novamente**:
   - Os arquivos ainda devem estar em `/root/uploads`
   - A aplicação ainda deve conseguir acessá-los via `/app/backend/uploads`

## ⚠️ Problemas Comuns

### Arquivos não aparecem após deploy

**Causa**: Caminho de destino incorreto

**Solução**:
1. Verifique o caminho dentro do container (veja seção acima)
2. Ajuste o **Destination Path** na configuração do volume
3. Faça um novo deploy

### Erro de permissão

**Causa**: O diretório no host não tem permissões corretas

**Solução**:
1. Via terminal do Colify, execute:
   ```bash
   mkdir -p /root/uploads
   chmod 755 /root/uploads
   ```

### Volume não está montado

**Causa**: Deploy não foi feito após configurar o volume

**Solução**:
1. Certifique-se de fazer um **novo deploy** após adicionar o volume
2. Verifique se o volume aparece na lista de volumes montados

## 📋 Checklist Final

- [ ] Volume adicionado na configuração do Backend
- [ ] Name configurado (ex: `uploads-storage`)
- [ ] Source Path configurado (ex: `/root/uploads`)
- [ ] Destination Path configurado (ex: `/app/backend/uploads`)
- [ ] Novo deploy realizado após configurar o volume
- [ ] Teste de upload realizado
- [ ] Arquivos verificados no Source Path
- [ ] Teste de persistência após deploy realizado

## 🎉 Pronto!

Após seguir estes passos, seus logos e banners estarão seguros e não desaparecerão mais após deploys!
