import React, { useEffect, useState } from 'react'
import api from '../../services/api'
import './AdminTracking.css'

const TAB_WEBHOOKS = 'webhooks'
const TAB_FACEBOOK = 'facebook'
const TAB_CONFIG = 'config'

const FACEBOOK_EVENTS = [
  { value: 'Lead', label: 'Lead (cadastro)' },
  { value: 'CompleteRegistration', label: 'CompleteRegistration' },
  { value: 'Purchase', label: 'Purchase (primeiro depósito)' },
  { value: 'AddToCart', label: 'AddToCart' },
  { value: 'InitiateCheckout', label: 'InitiateCheckout' },
  { value: 'ViewContent', label: 'ViewContent' }
]

function AdminTracking() {
  const [tab, setTab] = useState(TAB_WEBHOOKS)
  const [webhooks, setWebhooks] = useState([])
  const [facebookEvents, setFacebookEvents] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [filters, setFilters] = useState({
    source: '',
    status: '',
    eventName: '',
    from: '',
    to: ''
  })
  const [configLoading, setConfigLoading] = useState(false)
  const [configSaving, setConfigSaving] = useState(false)
  const [configError, setConfigError] = useState(null)
  const [configSuccess, setConfigSuccess] = useState(null)
  const [config, setConfig] = useState({
    facebookPixelId: '',
    facebookAccessToken: '',
    webhookBaseUrl: '',
    activeFacebookEvents: ['Lead', 'CompleteRegistration', 'Purchase']
  })
  /** Busca em idTransaction, E2E, chave PIX mascarada (debounce) */
  const [webhookSearchInput, setWebhookSearchInput] = useState('')
  const [webhookSearchDebounced, setWebhookSearchDebounced] = useState('')

  const limit = 30

  useEffect(() => {
    const t = setTimeout(() => setWebhookSearchDebounced(webhookSearchInput.trim()), 450)
    return () => clearTimeout(t)
  }, [webhookSearchInput])

  useEffect(() => {
    if (tab !== TAB_WEBHOOKS) return
    setPage(1)
  }, [tab, webhookSearchDebounced])

  useEffect(() => {
    if (tab === TAB_WEBHOOKS) loadWebhooks()
    else if (tab === TAB_FACEBOOK) loadFacebookEvents()
    else if (tab === TAB_CONFIG) loadConfig()
  }, [tab, page, filters, webhookSearchDebounced])

  useEffect(() => {
    if (tab === TAB_CONFIG) loadConfig()
  }, [tab])

  const loadWebhooks = async () => {
    try {
      setLoading(true)
      setError(null)
      const params = { page, limit }
      if (filters.source) params.source = filters.source
      if (filters.status) params.status = filters.status
      if (filters.from) params.from = filters.from
      if (filters.to) params.to = filters.to
      if (webhookSearchDebounced) params.search = webhookSearchDebounced
      const res = await api.getTrackingWebhooks(params)
      if (res.success) {
        setWebhooks(res.data.logs)
        setTotalPages(res.data.pages)
        setTotal(res.data.total)
      } else setError(res.message || 'Erro ao carregar webhooks')
    } catch (err) {
      setError(err.message || 'Erro ao carregar webhooks')
    } finally {
      setLoading(false)
    }
  }

  const loadFacebookEvents = async () => {
    try {
      setLoading(true)
      setError(null)
      const params = { page, limit }
      if (filters.eventName) params.eventName = filters.eventName
      if (filters.status) params.status = filters.status
      if (filters.from) params.from = filters.from
      if (filters.to) params.to = filters.to
      const res = await api.getTrackingFacebookEvents(params)
      if (res.success) {
        setFacebookEvents(res.data.logs)
        setTotalPages(res.data.pages)
        setTotal(res.data.total)
      } else setError(res.message || 'Erro ao carregar eventos Facebook')
    } catch (err) {
      setError(err.message || 'Erro ao carregar eventos Facebook')
    } finally {
      setLoading(false)
    }
  }

  const loadConfig = async () => {
    try {
      setConfigLoading(true)
      setConfigError(null)
      const res = await api.getTrackingConfig()
      if (res.success && res.data) {
        setConfig({
          facebookPixelId: res.data.facebookPixelId || '',
          facebookAccessToken: res.data.facebookAccessToken || '',
          webhookBaseUrl: res.data.webhookBaseUrl || '',
          activeFacebookEvents: Array.isArray(res.data.activeFacebookEvents) 
            ? res.data.activeFacebookEvents 
            : ['Lead', 'CompleteRegistration', 'Purchase']
        })
      } else setConfigError(res.message || 'Erro ao carregar configuração')
    } catch (err) {
      setConfigError(err.message || 'Erro ao carregar configuração')
    } finally {
      setConfigLoading(false)
    }
  }

  const handleSaveConfig = async () => {
    try {
      setConfigSaving(true)
      setConfigError(null)
      setConfigSuccess(null)
      const res = await api.updateTrackingConfig(config)
      if (res.success) {
        setConfigSuccess('Configuração salva com sucesso!')
        setTimeout(() => setConfigSuccess(null), 3000)
      } else {
        setConfigError(res.message || 'Erro ao salvar configuração')
      }
    } catch (err) {
      setConfigError(err.message || 'Erro ao salvar configuração')
    } finally {
      setConfigSaving(false)
    }
  }

  const toggleFacebookEvent = (eventValue) => {
    setConfig(prev => {
      const events = prev.activeFacebookEvents || []
      const newEvents = events.includes(eventValue)
        ? events.filter(e => e !== eventValue)
        : [...events, eventValue]
      return { ...prev, activeFacebookEvents: newEvents }
    })
  }

  const formatDate = (d) => {
    if (!d) return '-'
    const date = new Date(d)
    return date.toLocaleString('pt-BR', {
      dateStyle: 'short',
      timeStyle: 'medium'
    })
  }

  return (
    <div className="admin-container admin-tracking">
      <div className="admin-header">
        <h1>
          <i className="fa-solid fa-chart-line"></i>
          Rastreamento (Webhooks e Facebook)
        </h1>
        <p className="section-description" style={{ marginTop: '0.5rem' }}>
          Webhooks PIX registram id da transação, <strong>end-to-end (BACEN)</strong> e <strong>chave PIX mascarada</strong> quando o gateway envia esses campos.
        </p>
      </div>

      <div className="tracking-tabs">
        <button
          type="button"
          className={tab === TAB_WEBHOOKS ? 'active' : ''}
          onClick={() => { setTab(TAB_WEBHOOKS); setPage(1) }}
        >
          <i className="fa-solid fa-webhook"></i>
          Webhooks
        </button>
        <button
          type="button"
          className={tab === TAB_FACEBOOK ? 'active' : ''}
          onClick={() => { setTab(TAB_FACEBOOK); setPage(1) }}
        >
          <i className="fa-brands fa-facebook"></i>
          Eventos Facebook / Meta
        </button>
        <button
          type="button"
          className={tab === TAB_CONFIG ? 'active' : ''}
          onClick={() => { setTab(TAB_CONFIG); setPage(1) }}
        >
          <i className="fa-solid fa-gear"></i>
          Configuração
        </button>
      </div>

      {tab === TAB_WEBHOOKS && (
        <>
          <div className="tracking-filters">
            <select
              value={filters.source}
              onChange={(e) => { setFilters({ ...filters, source: e.target.value }); setPage(1) }}
            >
              <option value="">Todos os sources</option>
              <option value="pix">PIX (depósito)</option>
              <option value="pix-withdraw">PIX Saque</option>
              <option value="gatebox">Gatebox</option>
              <option value="sarrixpay">SarrixPay</option>
              <option value="escalecyber">Escale Cyber</option>
            </select>
            <select
              value={filters.status}
              onChange={(e) => { setFilters({ ...filters, status: e.target.value }); setPage(1) }}
            >
              <option value="">Todos os status</option>
              <option value="received">Recebido</option>
              <option value="processed">Processado</option>
              <option value="error">Erro</option>
            </select>
            <input
              type="date"
              value={filters.from}
              onChange={(e) => { setFilters({ ...filters, from: e.target.value }); setPage(1) }}
              placeholder="De"
            />
            <input
              type="date"
              value={filters.to}
              onChange={(e) => { setFilters({ ...filters, to: e.target.value }); setPage(1) }}
              placeholder="Até"
            />
            <input
              type="search"
              className="tracking-search-input"
              value={webhookSearchInput}
              onChange={(e) => setWebhookSearchInput(e.target.value)}
              placeholder="Buscar ID, E2E, chave mascarada…"
              aria-label="Buscar webhooks"
            />
          </div>
          <div className="tracking-table-wrap">
            <p className="tracking-total">
              Total: <strong>{total}</strong> webhook(s)
            </p>
            {error && <p className="tracking-error">{error}</p>}
            {loading ? (
              <p className="tracking-loading"><i className="fa-solid fa-spinner fa-spin"></i> Carregando...</p>
            ) : (
              <table className="tracking-table">
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Source</th>
                    <th>Path</th>
                    <th>idTransaction</th>
                    <th>E2E (BACEN)</th>
                    <th>Chave PIX</th>
                    <th>Tipo chave</th>
                    <th>Status</th>
                    <th>Body (resumo)</th>
                  </tr>
                </thead>
                <tbody>
                  {webhooks.length === 0 ? (
                    <tr><td colSpan="9">Nenhum webhook registrado.</td></tr>
                  ) : (
                    webhooks.map((log) => (
                      <tr key={log._id}>
                        <td>{formatDate(log.createdAt)}</td>
                        <td><span className="badge source">{log.source}</span></td>
                        <td>{log.path}</td>
                        <td>{log.idTransaction || '-'}</td>
                        <td className="body-cell mono">{log.endToEndId || '-'}</td>
                        <td className="body-cell mono">{log.pixKeyMasked || '-'}</td>
                        <td>{log.pixKeyType || '-'}</td>
                        <td><span className={`badge status ${log.status}`}>{log.status}</span></td>
                        <td className="body-cell">{log.bodySummary ? String(log.bodySummary).slice(0, 120) + (log.bodySummary.length > 120 ? '...' : '') : '-'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
            {totalPages > 1 && (
              <div className="tracking-pagination">
                <button type="button" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                  Anterior
                </button>
                <span>Página {page} de {totalPages}</span>
                <button type="button" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                  Próxima
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {tab === TAB_FACEBOOK && (
        <>
          <div className="tracking-filters">
            <select
              value={filters.eventName}
              onChange={(e) => { setFilters({ ...filters, eventName: e.target.value }); setPage(1) }}
            >
              <option value="">Todos os eventos</option>
              <option value="Lead">Lead (cadastro)</option>
              <option value="CompleteRegistration">CompleteRegistration</option>
              <option value="Purchase">Purchase (ex.: primeiro depósito)</option>
            </select>
            <select
              value={filters.status}
              onChange={(e) => { setFilters({ ...filters, status: e.target.value }); setPage(1) }}
            >
              <option value="">Todos os status</option>
              <option value="success">Sucesso</option>
              <option value="sent">Enviado</option>
              <option value="error">Erro</option>
            </select>
            <input
              type="date"
              value={filters.from}
              onChange={(e) => { setFilters({ ...filters, from: e.target.value }); setPage(1) }}
              placeholder="De"
            />
            <input
              type="date"
              value={filters.to}
              onChange={(e) => { setFilters({ ...filters, to: e.target.value }); setPage(1) }}
              placeholder="Até"
            />
          </div>
          <div className="tracking-table-wrap">
            <p className="tracking-total">
              Total: <strong>{total}</strong> evento(s) Facebook
            </p>
            {error && <p className="tracking-error">{error}</p>}
            {loading ? (
              <p className="tracking-loading"><i className="fa-solid fa-spinner fa-spin"></i> Carregando...</p>
            ) : (
              <table className="tracking-table">
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Evento</th>
                    <th>Usuário</th>
                    <th>Status</th>
                    <th>Erro / Resposta</th>
                  </tr>
                </thead>
                <tbody>
                  {facebookEvents.length === 0 ? (
                    <tr><td colSpan="5">Nenhum evento Facebook registrado.</td></tr>
                  ) : (
                    facebookEvents.map((log) => (
                      <tr key={log._id}>
                        <td>{formatDate(log.sentAt)}</td>
                        <td><span className="badge event">{log.eventName}</span></td>
                        <td>{log.userId ? (log.userId.username || log.userId.phone || log.userId._id) : '-'}</td>
                        <td><span className={`badge status ${log.status}`}>{log.status}</span></td>
                        <td className="body-cell">{log.errorMessage || (log.response && log.response.events_received ? 'OK' : JSON.stringify(log.response || {}).slice(0, 80))}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
            {totalPages > 1 && (
              <div className="tracking-pagination">
                <button type="button" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                  Anterior
                </button>
                <span>Página {page} de {totalPages}</span>
                <button type="button" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                  Próxima
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {tab === TAB_CONFIG && (
        <>
          {configLoading ? (
            <div className="tracking-loading">
              <i className="fa-solid fa-spinner fa-spin"></i> Carregando configuração...
            </div>
          ) : (
            <div className="tracking-config-section">
              {configError && (
                <div className="tracking-config-error">
                  <i className="fa-solid fa-circle-exclamation"></i>
                  <span>{configError}</span>
                </div>
              )}
              {configSuccess && (
                <div className="tracking-config-success">
                  <i className="fa-solid fa-circle-check"></i>
                  <span>{configSuccess}</span>
                </div>
              )}

              <div className="config-form-section">
                <h2><i className="fa-brands fa-facebook"></i> Facebook / Meta</h2>
                <div className="config-form-group">
                  <label>Pixel ID</label>
                  <input
                    type="text"
                    value={config.facebookPixelId}
                    onChange={(e) => setConfig({ ...config, facebookPixelId: e.target.value })}
                    placeholder="Ex: 123456789012345"
                  />
                  <small>ID do Pixel do Facebook para rastreamento de conversões</small>
                </div>
                <div className="config-form-group">
                  <label>Access Token</label>
                  <input
                    type="password"
                    value={config.facebookAccessToken}
                    onChange={(e) => setConfig({ ...config, facebookAccessToken: e.target.value })}
                    placeholder="Token de acesso do Facebook"
                  />
                  <small>Token de acesso para enviar eventos via Conversions API</small>
                </div>
                <div className="config-form-group">
                  <label>Eventos Ativos</label>
                  <div className="config-events-grid">
                    {FACEBOOK_EVENTS.map(event => (
                      <label key={event.value} className="config-event-checkbox">
                        <input
                          type="checkbox"
                          checked={config.activeFacebookEvents.includes(event.value)}
                          onChange={() => toggleFacebookEvent(event.value)}
                        />
                        <span>{event.label}</span>
                      </label>
                    ))}
                  </div>
                  <small>Selecione quais eventos do Facebook devem ser enviados</small>
                </div>
              </div>

              <div className="config-form-section">
                <h2><i className="fa-solid fa-webhook"></i> Webhook</h2>
                <div className="config-form-group">
                  <label>URL Base do Webhook</label>
                  <input
                    type="url"
                    value={config.webhookBaseUrl}
                    onChange={(e) => setConfig({ ...config, webhookBaseUrl: e.target.value })}
                    placeholder="https://seu-backend.com"
                  />
                  <small>URL base onde os webhooks serão recebidos (ex: https://backend.com - sem barra no final)</small>
                  <div className="config-webhook-info">
                    <p><strong>URLs esperadas:</strong></p>
                    <ul>
                      <li>Depósitos: <code>{config.webhookBaseUrl || 'https://seu-backend.com'}/api/webhooks/pix</code></li>
                      <li>Saques: <code>{config.webhookBaseUrl || 'https://seu-backend.com'}/api/webhooks/pix-withdraw</code></li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="config-form-actions">
                <button
                  type="button"
                  className="config-save-btn"
                  onClick={handleSaveConfig}
                  disabled={configSaving}
                >
                  {configSaving ? (
                    <><i className="fa-solid fa-spinner fa-spin"></i> Salvando...</>
                  ) : (
                    <><i className="fa-solid fa-save"></i> Salvar Configuração</>
                  )}
                </button>
              </div>
            </div>
          )}
        </>
      )}

      <div className="tracking-info">
        <p>
          <strong>Webhooks:</strong> chamadas recebidas em <code>/api/webhooks/pix</code> e <code>/api/webhooks/pix-withdraw</code> (gateway PIX).
        </p>
        <p>
          <strong>Facebook / Meta:</strong> eventos enviados à Conversions API (Lead = cadastro, Purchase = primeiro depósito). Configure <code>FACEBOOK_PIXEL_ID</code> e <code>FACEBOOK_ACCESS_TOKEN</code> no backend.
        </p>
      </div>
    </div>
  )
}

export default AdminTracking
