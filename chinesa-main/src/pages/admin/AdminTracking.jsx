import React, { useEffect, useState } from 'react'
import api from '../../services/api'
import './AdminTracking.css'

const TAB_WEBHOOKS = 'webhooks'
const TAB_FACEBOOK = 'facebook'

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

  const limit = 30

  useEffect(() => {
    if (tab === TAB_WEBHOOKS) loadWebhooks()
    else loadFacebookEvents()
  }, [tab, page, filters])

  const loadWebhooks = async () => {
    try {
      setLoading(true)
      setError(null)
      const params = { page, limit }
      if (filters.source) params.source = filters.source
      if (filters.status) params.status = filters.status
      if (filters.from) params.from = filters.from
      if (filters.to) params.to = filters.to
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
                    <th>Status</th>
                    <th>Body (resumo)</th>
                  </tr>
                </thead>
                <tbody>
                  {webhooks.length === 0 ? (
                    <tr><td colSpan="6">Nenhum webhook registrado.</td></tr>
                  ) : (
                    webhooks.map((log) => (
                      <tr key={log._id}>
                        <td>{formatDate(log.createdAt)}</td>
                        <td><span className="badge source">{log.source}</span></td>
                        <td>{log.path}</td>
                        <td>{log.idTransaction || '-'}</td>
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
