import React, { useEffect, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import api from '../../services/api'
import './AdminGatewayConfig.css'

function defaultGatewayApiUrl(provider) {
  if (provider === 'nxgate') return 'https://api.nxgate.com.br'
  if (provider === 'escalecyber') return 'https://api.escalecyber.com/v1'
  if (provider === 'sarrixpay') return 'https://apiv1.sarrixpay.com'
  return 'https://api.gatebox.com.br'
}

function AdminGatewayConfig() {
  const { isAdmin } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testingReal, setTestingReal] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [testResult, setTestResult] = useState(null)
  
  const [config, setConfig] = useState({
    provider: 'gatebox',
    username: '',
    password: '',
    clientId: '',
    apiKey: '',
    hmacSecret: '',
    webhookBaseUrl: '',
    apiUrl: 'https://api.gatebox.com.br',
    isActive: true
  })

  useEffect(() => {
    if (!isAdmin) {
      setError('Acesso negado. Apenas administradores podem acessar esta página.')
      setLoading(false)
      return
    }

    loadConfig()
  }, [isAdmin])

  const loadConfig = async () => {
    try {
      setLoading(true)
      const response = await api.getGatewayConfig()
      if (response.success) {
        const provider = response.data.provider || 'gatebox'
        setConfig({
          provider,
          username: response.data.username || '',
          password: response.data.password && response.data.password !== '***' ? response.data.password : '',
          clientId: response.data.clientId || '',
          apiKey: response.data.apiKey || '',
          hmacSecret: response.data.hmacSecret && response.data.hmacSecret !== '***' ? response.data.hmacSecret : '***',
          webhookBaseUrl: response.data.webhookBaseUrl || '',
          apiUrl: response.data.apiUrl || defaultGatewayApiUrl(provider),
          isActive: response.data.isActive !== undefined ? response.data.isActive : true
        })
      }
    } catch (err) {
      setError(err.message || 'Erro ao carregar configuração')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      setError(null)
      setSuccess(null)
      
      const configToSend = { ...config }

      if (config.provider === 'gatebox') {
        if (!config.username || config.username.trim() === '') {
          setError('Username é obrigatório para GATEBOX')
          setSaving(false)
          return
        }
        if (configToSend.password === '***' || configToSend.password.trim() === '') {
          const currentConfig = await api.getGatewayConfig().catch(() => null)
          if (!currentConfig?.data?.password || currentConfig.data.password === '***') {
            setError('Password é obrigatório para GATEBOX')
            setSaving(false)
            return
          }
          delete configToSend.password
        }
      } else if (config.provider === 'nxgate') {
        if (!config.clientId || config.clientId.trim() === '') {
          setError('Client ID é obrigatório para NxGate')
          setSaving(false)
          return
        }
        if (!config.apiKey || config.apiKey.trim() === '') {
          setError('Client Secret é obrigatório para NxGate')
          setSaving(false)
          return
        }
        if (configToSend.hmacSecret === '***') delete configToSend.hmacSecret
      } else if (config.provider === 'escalecyber') {
        if (!config.apiKey || config.apiKey.trim() === '') {
          setError('API Key é obrigatória para Escale Cyber')
          setSaving(false)
          return
        }
      } else if (config.provider === 'sarrixpay') {
        if (!config.clientId || config.clientId.trim() === '') {
          setError('Client ID é obrigatório para SarrixPay')
          setSaving(false)
          return
        }
        if (!config.apiKey || config.apiKey.trim() === '') {
          setError('Client Secret é obrigatório para SarrixPay')
          setSaving(false)
          return
        }
      }

      if (!config.webhookBaseUrl || config.webhookBaseUrl.trim() === '') {
        setError('URL do Webhook é obrigatória')
        setSaving(false)
        return
      }

      const response = await api.updateGatewayConfig(configToSend)
      
      if (response.success) {
        setSuccess('Configuração salva com sucesso!')
        setTimeout(() => setSuccess(null), 3000)
      } else {
        setError(response.message || 'Erro ao salvar configuração')
      }
    } catch (err) {
      setError(err.message || 'Erro ao salvar configuração')
    } finally {
      setSaving(false)
    }
  }

  const handleTest = async (realTest = false) => {
    try {
      if (realTest) setTestingReal(true)
      else setTesting(true)
      setError(null)
      setTestResult(null)

      const response = await api.testGateway(realTest)

      if (response.success) {
        setTestResult({
          success: true,
          message: response.message,
          data: response.data
        })
      } else {
        setTestResult({
          success: false,
          message: response.message || 'Erro ao testar gateway',
          data: response.data
        })
      }
    } catch (err) {
      setTestResult({
        success: false,
        message: err.response?.data?.message || err.message || 'Erro ao testar gateway',
        data: err.response?.data
      })
    } finally {
      setTesting(false)
      setTestingReal(false)
    }
  }

  if (!isAdmin) {
    return (
      <div className="admin-container">
        <div className="admin-error">
          <i className="fa-solid fa-lock"></i>
          <h2>Acesso Negado</h2>
          <p>Você não tem permissão para acessar esta página.</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="admin-container">
        <div className="admin-loading">
          <i className="fa-solid fa-spinner fa-spin"></i>
          <p>Carregando configuração...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="admin-container">
      <div className="admin-header">
        <h1>
          <i className="fa-solid fa-credit-card"></i>
          Configuração do Gateway de Pagamento
        </h1>
      </div>

      {error && (
        <div className="alert alert-error">
          <i className="fa-solid fa-circle-exclamation"></i>
          {error}
        </div>
      )}

      {success && (
        <div className="alert alert-success">
          <i className="fa-solid fa-circle-check"></i>
          {success}
        </div>
      )}

      <div className="config-section">
        <h2>
          <i className="fa-solid fa-key"></i>
          Provedor e Credenciais
        </h2>
        <p className="section-description">
          Escolha o gateway de pagamento para processar depósitos e saques via PIX.
        </p>
        
        <div className="config-form">
          <div className="form-group full-width">
            <label>
              Provedor do Gateway <span className="required">*</span>
            </label>
            <select
              value={config.provider}
              onChange={(e) => setConfig(prev => ({
                ...prev,
                provider: e.target.value,
                apiUrl: defaultGatewayApiUrl(e.target.value)
              }))}
            >
              <option value="gatebox">GATEBOX</option>
              <option value="nxgate">NxGate</option>
              <option value="escalecyber">Escale Cyber</option>
              <option value="sarrixpay">SarrixPay</option>
            </select>
            <small className="form-hint">
              Selecione qual gateway utilizar para PIX
            </small>
          </div>

          {config.provider === 'gatebox' && (
            <>
              <div className="form-group full-width">
                <label>
                  Username (GATEBOX) <span className="required">*</span>
                </label>
                <input
                  type="text"
                  value={config.username}
                  onChange={(e) => setConfig(prev => ({ ...prev, username: e.target.value }))}
                  placeholder="Digite o username da GATEBOX"
                />
                <small className="form-hint">
                  Username fornecido pela GATEBOX
                </small>
              </div>

              <div className="form-group full-width">
                <label>
                  Password (GATEBOX) <span className="required">*</span>
                </label>
                <input
                  type="password"
                  value={config.password}
                  onChange={(e) => setConfig(prev => ({ ...prev, password: e.target.value }))}
                  placeholder="Digite a password da GATEBOX"
                />
                <small className="form-hint">
                  Password fornecido pela GATEBOX
                </small>
              </div>
            </>
          )}

          {config.provider === 'nxgate' && (
            <>
              <div className="form-group full-width">
                <label>
                  Client ID (NxGate) <span className="required">*</span>
                </label>
                <input
                  type="text"
                  value={config.clientId}
                  onChange={(e) => setConfig(prev => ({ ...prev, clientId: e.target.value }))}
                  placeholder="Digite o Client ID do NxGate"
                />
                <small className="form-hint">
                  Client ID obtido no painel do NxGate
                </small>
              </div>
              <div className="form-group full-width">
                <label>
                  Client Secret (NxGate) <span className="required">*</span>
                </label>
                <input
                  type="password"
                  value={config.apiKey}
                  onChange={(e) => setConfig(prev => ({ ...prev, apiKey: e.target.value }))}
                  placeholder="Digite o Client Secret do NxGate"
                />
                <small className="form-hint">
                  Client Secret obtido no painel do NxGate (OAuth2)
                </small>
              </div>
              <div className="form-group full-width">
                <label>
                  HMAC Secret (NxGate)
                </label>
                <input
                  type="password"
                  value={config.hmacSecret}
                  onChange={(e) => setConfig(prev => ({ ...prev, hmacSecret: e.target.value }))}
                  placeholder="Obrigatório se sua conta exige validação HMAC"
                />
                <small className="form-hint">
                  Se aparecer erro &quot;This client requires HMAC validation&quot;, preencha o HMAC Secret do painel NxGate
                </small>
              </div>
            </>
          )}

          {config.provider === 'escalecyber' && (
            <div className="form-group full-width">
              <label>
                API Key (Escale Cyber) <span className="required">*</span>
              </label>
              <input
                type="password"
                value={config.apiKey}
                onChange={(e) => setConfig(prev => ({ ...prev, apiKey: e.target.value }))}
                placeholder="Digite a API Key do Escale Cyber"
              />
              <small className="form-hint">
                API Key obtida no painel do Escale Cyber (header X-API-Key)
              </small>
            </div>
          )}

          {config.provider === 'sarrixpay' && (
            <>
              <div className="form-group full-width">
                <label>
                  Client ID (SarrixPay) <span className="required">*</span>
                </label>
                <input
                  type="text"
                  value={config.clientId}
                  onChange={(e) => setConfig(prev => ({ ...prev, clientId: e.target.value }))}
                  placeholder="UUID do client (integration)"
                />
                <small className="form-hint">
                  Public integration identifier no painel SarrixPay
                </small>
              </div>
              <div className="form-group full-width">
                <label>
                  Client Secret (SarrixPay) <span className="required">*</span>
                </label>
                <input
                  type="password"
                  value={config.apiKey}
                  onChange={(e) => setConfig(prev => ({ ...prev, apiKey: e.target.value }))}
                  placeholder="cs_live_..."
                />
                <small className="form-hint">
                  Secret usado em POST /auth/integrations/token (não envie Bearer nas credenciais)
                </small>
              </div>
            </>
          )}

          <div className="form-group full-width">
            <label>
              URL Base do Webhook <span className="required">*</span>
            </label>
            <input
              type="text"
              value={config.webhookBaseUrl}
              onChange={(e) => setConfig(prev => ({ ...prev, webhookBaseUrl: e.target.value }))}
              placeholder="https://seu-dominio.com"
            />
            <small className="form-hint">
              URL base onde os webhooks serão recebidos (ex: https://seu-backend.colify.app)
            </small>
          </div>

          <div className="form-group full-width">
            <label>URL da API</label>
            <input
              type="text"
              value={config.apiUrl}
              onChange={(e) => setConfig(prev => ({ ...prev, apiUrl: e.target.value }))}
              placeholder={defaultGatewayApiUrl(config.provider)}
            />
            <small className="form-hint">
              URL base da API (geralmente não precisa ser alterada)
            </small>
          </div>

          <div className="form-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={config.isActive}
                onChange={(e) => setConfig(prev => ({ ...prev, isActive: e.target.checked }))}
              />
              <span>Gateway Ativo</span>
            </label>
            <small className="form-hint">
              Desative para interromper temporariamente o processamento de pagamentos
            </small>
          </div>
        </div>
      </div>

      {testResult && (
        <div className={`alert ${testResult.success ? 'alert-success' : 'alert-error'}`}>
          <i className={`fa-solid ${testResult.success ? 'fa-circle-check' : 'fa-circle-exclamation'}`}></i>
          <div>
            <strong>{testResult.success ? 'Teste bem-sucedido!' : 'Erro no teste'}</strong>
            <p>{testResult.message}</p>
            {testResult.data && (
              <div className="test-details">
                <p><strong>Credenciais configuradas:</strong> {testResult.data.credentialsConfigured || testResult.data.apiKeyConfigured || 'N/A'}</p>
                <p><strong>Webhook URL:</strong> {testResult.data.webhookBaseUrl}</p>
                <p><strong>API URL:</strong> {testResult.data.apiUrl}</p>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="config-actions">
        <button
          onClick={() => handleTest(false)}
          disabled={testing || testingReal || saving}
          className="test-btn"
          title="Só valida se API Key e URLs estão preenchidos"
        >
          {testing ? (
            <>
              <i className="fa-solid fa-spinner fa-spin"></i>
              Testando...
            </>
          ) : (
            <>
              <i className="fa-solid fa-vial"></i>
              Teste rápido
            </>
          )}
        </button>
        <button
          onClick={() => handleTest(true)}
          disabled={testing || testingReal || saving}
          className="test-btn test-btn-real"
          title="Chama a API e gera um PIX de teste (R$ 10)"
        >
          {testingReal ? (
            <>
              <i className="fa-solid fa-spinner fa-spin"></i>
              Gerando PIX...
            </>
          ) : (
            <>
              <i className="fa-solid fa-bolt"></i>
              Teste real (PIX)
            </>
          )}
        </button>
        <button
          onClick={handleSave}
          disabled={saving || testing}
          className="save-btn"
        >
          {saving ? (
            <>
              <i className="fa-solid fa-spinner fa-spin"></i>
              Salvando...
            </>
          ) : (
            <>
              <i className="fa-solid fa-save"></i>
              Salvar Configuração
            </>
          )}
        </button>
      </div>

      <div className="info-section">
        <h3>
          <i className="fa-solid fa-info-circle"></i>
          Informações Importantes
        </h3>
        <ul>
          {config.provider === 'gatebox' && (
            <li>
              <strong>Username e Password:</strong> Obtenha suas credenciais no painel da GATEBOX
            </li>
          )}
          {config.provider === 'nxgate' && (
            <li>
              <strong>Client ID e Client Secret:</strong> Obtenha no painel do NxGate (OAuth2)
            </li>
          )}
          {config.provider === 'escalecyber' && (
            <li>
              <strong>API Key:</strong> Obtenha no painel do Escale Cyber. Configure o webhook em <code>POST /webhooks</code> apontando para <code>{config.webhookBaseUrl || 'SEU_URL'}/api/webhooks/escalecyber</code>
            </li>
          )}
          {config.provider === 'sarrixpay' && (
            <li>
              <strong>SarrixPay:</strong> OAuth2 (Client ID + Client Secret). Webhooks são cadastrados no painel SarrixPay — use a URL abaixo para receber <code>pix_in.*</code> e <code>pix_out.*</code>.
            </li>
          )}
          <li>
            <strong>Webhook URL:</strong> Deve ser uma URL pública acessível (HTTPS em produção)
          </li>
          <li>
            <strong>Endpoints de Webhook:</strong>
            <ul>
              {config.provider === 'escalecyber' ? (
                <li>Escale Cyber (único): <code>{config.webhookBaseUrl || 'SEU_URL'}/api/webhooks/escalecyber</code></li>
              ) : config.provider === 'sarrixpay' ? (
                <li>SarrixPay (único): <code>{config.webhookBaseUrl || 'SEU_URL'}/api/webhooks/sarrixpay</code></li>
              ) : (
                <>
                  <li>Depósitos: <code>{config.webhookBaseUrl || 'SEU_URL'}/api/webhooks/pix</code></li>
                  <li>Saques: <code>{config.webhookBaseUrl || 'SEU_URL'}/api/webhooks/pix-withdraw</code></li>
                </>
              )}
            </ul>
          </li>
          <li>
            Configure esses endpoints no painel do {config.provider === 'nxgate' ? 'NxGate' : config.provider === 'escalecyber' ? 'Escale Cyber' : config.provider === 'sarrixpay' ? 'SarrixPay' : 'GATEBOX'} para receber notificações de pagamento
          </li>
        </ul>
      </div>
    </div>
  )
}

export default AdminGatewayConfig
