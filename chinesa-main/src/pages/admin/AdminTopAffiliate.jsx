import React, { useEffect, useState } from 'react'
import api from '../../services/api'
import './AdminTopAffiliate.css'

function AdminTopAffiliate() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [config, setConfig] = useState({
    startDate: '',
    endDate: '',
    prizes: [
      { position: 1, prizeValue: 500 },
      { position: 2, prizeValue: 300 },
      { position: 3, prizeValue: 200 },
      { position: 4, prizeValue: 100 },
      { position: 5, prizeValue: 50 }
    ]
  })
  const [ranking, setRanking] = useState([])
  const [rankingLoading, setRankingLoading] = useState(false)

  useEffect(() => {
    loadConfig()
    loadRanking()
  }, [])

  const toLocalDatetime = (isoStr) => {
    if (!isoStr) return ''
    const d = new Date(isoStr)
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    const h = String(d.getHours()).padStart(2, '0')
    const min = String(d.getMinutes()).padStart(2, '0')
    return `${y}-${m}-${day}T${h}:${min}`
  }

  const loadConfig = async () => {
    try {
      setLoading(true)
      const response = await api.getTopAffiliateConfig()
      if (response.success && response.data) {
        const d = response.data
        setConfig({
          startDate: toLocalDatetime(d.startDate),
          endDate: toLocalDatetime(d.endDate),
          prizes: (d.prizes || []).length > 0 ? d.prizes : [
            { position: 1, prizeValue: 500 },
            { position: 2, prizeValue: 300 },
            { position: 3, prizeValue: 200 },
            { position: 4, prizeValue: 100 },
            { position: 5, prizeValue: 50 }
          ]
        })
      }
    } catch (err) {
      setError(err.message || 'Erro ao carregar configuração')
    } finally {
      setLoading(false)
    }
  }

  const loadRanking = async () => {
    try {
      setRankingLoading(true)
      const response = await api.getTopAffiliateRanking()
      if (response.success && response.data) {
        setRanking(response.data.ranking || [])
      }
    } catch (err) {
      console.error('Erro ao carregar ranking:', err)
    } finally {
      setRankingLoading(false)
    }
  }

  const handleSave = async () => {
    const start = new Date(config.startDate)
    const end = new Date(config.endDate)
    if (isNaN(start.getTime())) {
      setError('Data de início inválida')
      return
    }
    if (isNaN(end.getTime())) {
      setError('Data de fim inválida')
      return
    }
    if (start >= end) {
      setError('Data de fim deve ser posterior à data de início')
      return
    }

    try {
      setSaving(true)
      setError(null)
      setSuccess(null)
      const response = await api.updateTopAffiliateConfig({
        startDate: config.startDate,
        endDate: config.endDate,
        prizes: config.prizes
      })
      if (response.success) {
        setSuccess('Configuração salva! Ranking atualizado.')
        setTimeout(() => setSuccess(null), 3000)
        loadRanking()
      } else {
        setError(response.message || 'Erro ao salvar')
      }
    } catch (err) {
      setError(err.message || 'Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  const addPrize = () => {
    const nextPos = Math.max(...config.prizes.map(p => p.position), 0) + 1
    setConfig({
      ...config,
      prizes: [...config.prizes, { position: nextPos, prizeValue: 0 }]
    })
  }

  const removePrize = (idx) => {
    const newPrizes = config.prizes.filter((_, i) => i !== idx)
    setConfig({ ...config, prizes: newPrizes })
  }

  const updatePrize = (idx, field, value) => {
    const newPrizes = [...config.prizes]
    newPrizes[idx] = { ...newPrizes[idx], [field]: field === 'position' ? parseInt(value, 10) || 1 : parseFloat(value) || 0 }
    setConfig({ ...config, prizes: newPrizes })
  }

  const formatCurrency = (v) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 }).format(v || 0)

  const formatDate = (d) => {
    if (!d) return '-'
    const x = new Date(d)
    return x.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="admin-container admin-top-affiliate">
      <div className="admin-header">
        <h1>
          <i className="fa-solid fa-trophy"></i>
          Top Afiliado
        </h1>
        <p className="section-description">
          Configure o período e a premiação do ranking. Apenas afiliados com 50% de comissão participam. O ranking é dinâmico até a data final — quem estiver em 1º lugar ao fim ganha. Premiação entregue por fora da plataforma.
        </p>
      </div>

      {error && (
        <div className="alert alert-error">
          <i className="fa-solid fa-circle-exclamation"></i>
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="alert alert-success">
          <i className="fa-solid fa-circle-check"></i>
          <span>{success}</span>
        </div>
      )}

      <div className="config-section">
        <h2><i className="fa-solid fa-calendar"></i> Período</h2>
        <div className="top-affiliate-dates">
          <div className="form-group">
            <label>Data de início</label>
            <input
              type="datetime-local"
              value={config.startDate}
              onChange={(e) => setConfig({ ...config, startDate: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label>Data de fim</label>
            <input
              type="datetime-local"
              value={config.endDate}
              onChange={(e) => setConfig({ ...config, endDate: e.target.value })}
            />
          </div>
        </div>
      </div>

      <div className="config-section">
        <h2><i className="fa-solid fa-gift"></i> Premiação (por posição)</h2>
        <p className="prizes-hint">Valores em R$. Premiação entregue por fora da plataforma.</p>
        <div className="prizes-list">
          {config.prizes.map((p, idx) => (
            <div key={idx} className="prize-row">
              <input
                type="number"
                min="1"
                value={p.position}
                onChange={(e) => updatePrize(idx, 'position', e.target.value)}
                placeholder="Pos"
              />
              <span className="prize-ordinal">{p.position}º</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={p.prizeValue}
                onChange={(e) => updatePrize(idx, 'prizeValue', e.target.value)}
                placeholder="R$"
              />
              <button type="button" className="btn-remove-prize" onClick={() => removePrize(idx)} title="Remover">
                <i className="fa-solid fa-trash"></i>
              </button>
            </div>
          ))}
        </div>
        <button type="button" className="btn-add-prize" onClick={addPrize}>
          <i className="fa-solid fa-plus"></i> Adicionar posição
        </button>
      </div>

      <div className="config-actions">
        <button type="button" className="save-btn" onClick={handleSave} disabled={saving || loading}>
          {saving ? <><i className="fa-solid fa-spinner fa-spin"></i> Salvando...</> : <><i className="fa-solid fa-save"></i> Salvar configuração</>}
        </button>
      </div>

      <div className="config-section ranking-section">
        <h2><i className="fa-solid fa-ranking-star"></i> Ranking (atual)</h2>
        <button type="button" className="btn-refresh" onClick={loadRanking} disabled={rankingLoading}>
          {rankingLoading ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-arrows-rotate"></i>}
          {' '}Atualizar
        </button>
        {rankingLoading ? (
          <div className="ranking-loading">
            <i className="fa-solid fa-spinner fa-spin"></i>
            <span>Carregando ranking...</span>
          </div>
        ) : ranking.length === 0 ? (
          <div className="ranking-empty">
            Nenhum afiliado 50% com depósitos no período.
          </div>
        ) : (
          <div className="ranking-table-wrapper">
            <table className="ranking-table">
              <thead>
                <tr>
                  <th>Posição</th>
                  <th>Username</th>
                  <th>Código</th>
                  <th>Depósitos (qtd)</th>
                  <th>Total (R$)</th>
                  <th>Prêmio</th>
                </tr>
              </thead>
              <tbody>
                {ranking.map((r) => (
                  <tr key={r.affiliateId}>
                    <td><span className="position-badge">{r.position}º</span></td>
                    <td>{r.username}</td>
                    <td><code>{r.referralCode}</code></td>
                    <td>{r.depositsCount}</td>
                    <td>{formatCurrency(r.totalDeposits)}</td>
                    <td className="prize-cell">{formatCurrency(r.prizeValue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

export default AdminTopAffiliate
