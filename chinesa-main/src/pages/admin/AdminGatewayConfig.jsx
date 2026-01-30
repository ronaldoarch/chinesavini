import React, { useEffect, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import api from '../../services/api'
import './AdminGatewayConfig.css'

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
    apiKey: '',
    webhookBaseUrl: '',
    apiUrl: 'https://api.nxgate.com.br',
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
        setConfig({
          apiKey: response.data.apiKey || '',
          webhookBaseUrl: response.data.webhookBaseUrl || '',
          apiUrl: response.data.apiUrl || 'https://api.nxgate.com.br',
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
      
      if (!config.apiKey || config.apiKey.trim() === '') {
        setError('API Key é obrigatória')
        setSaving(false)
        return
      }

      if (!config.webhookBaseUrl || config.webhookBaseUrl.trim() === '') {
        setError('URL do Webhook é obrigatória')
        setSaving(false)
        return
      }

      const response = await api.updateGatewayConfig(config)
      
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
          Credenciais NXGATE
        </h2>
        <p className="section-description">
          Configure as credenciais do gateway de pagamento NXGATE para processar depósitos e saques via PIX.
        </p>
        
        <div className="config-form">
          <div className="form-group full-width">
            <label>
              API Key <span className="required">*</span>
            </label>
            <input
              type="password"
              value={config.apiKey}
              onChange={(e) => setConfig(prev => ({ ...prev, apiKey: e.target.value }))}
              placeholder="Digite a API Key do NXGATE"
            />
            <small className="form-hint">
              Chave de API fornecida pelo NXGATE
            </small>
          </div>

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
              placeholder="https://api.nxgate.com.br"
            />
            <small className="form-hint">
              URL base da API do NXGATE (geralmente não precisa ser alterada)
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
                <p><strong>API Key configurada:</strong> {testResult.data.apiKeyConfigured}</p>
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
          title="Chama a API NXGATE e gera um PIX de teste (R$ 10)"
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
          <li>
            <strong>API Key:</strong> Obtenha sua chave de API no painel do NXGATE
          </li>
          <li>
            <strong>Webhook URL:</strong> Deve ser uma URL pública acessível (HTTPS em produção)
          </li>
          <li>
            <strong>Endpoints de Webhook:</strong>
            <ul>
              <li>Depósitos: <code>{config.webhookBaseUrl || 'SEU_URL'}/api/webhooks/pix</code></li>
              <li>Saques: <code>{config.webhookBaseUrl || 'SEU_URL'}/api/webhooks/pix-withdraw</code></li>
            </ul>
          </li>
          <li>
            Configure esses endpoints no painel do NXGATE para receber notificações de pagamento
          </li>
        </ul>
      </div>
    </div>
  )
}

export default AdminGatewayConfig
