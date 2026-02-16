import React, { useEffect, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import api from '../../services/api'
import './AdminBonusConfig.css'

function AdminBonusConfig() {
  const { isAdmin } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [config, setConfig] = useState({
    firstDepositBonusPercent: 20,
    depositTiers: [
      { amount: 10, bonusPercent: 0 },
      { amount: 20, bonusPercent: 2 },
      { amount: 30, bonusPercent: 2 },
      { amount: 40, bonusPercent: 2 },
      { amount: 50, bonusPercent: 5 },
      { amount: 75, bonusPercent: 5 },
      { amount: 100, bonusPercent: 10 }
    ],
    affiliateBonusPercent: 0,
    chestTiers: [
      { referralsRequired: 1, rewardAmount: 10 },
      { referralsRequired: 5, rewardAmount: 40 },
      { referralsRequired: 10, rewardAmount: 50 },
      { referralsRequired: 100, rewardAmount: 100 },
      { referralsRequired: 500, rewardAmount: 500 },
      { referralsRequired: 1000, rewardAmount: 1088 },
      { referralsRequired: 5000, rewardAmount: 5288 }
    ]
  })

  useEffect(() => {
    if (!isAdmin) {
      setError('Acesso negado.')
      setLoading(false)
      return
    }
    loadConfig()
  }, [isAdmin])

  const loadConfig = async () => {
    try {
      setLoading(true)
      const response = await api.getBonusConfigAdmin()
      if (response.success && response.data) {
        const c = response.data
        setConfig({
          firstDepositBonusPercent: c.firstDepositBonusPercent ?? 0,
          depositTiers: Array.isArray(c.depositTiers) && c.depositTiers.length > 0
            ? c.depositTiers
            : config.depositTiers,
          affiliateBonusPercent: c.affiliateBonusPercent ?? 0,
          chestTiers: Array.isArray(c.chestTiers) && c.chestTiers.length > 0
            ? c.chestTiers
            : config.chestTiers
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
      const response = await api.updateBonusConfig(config)
      if (response.success) {
        setSuccess('Configuração salva com sucesso!')
        setTimeout(() => setSuccess(null), 3000)
      } else {
        setError(response.message || 'Erro ao salvar')
      }
    } catch (err) {
      setError(err.message || 'Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  const updateDepositTier = (index, field, value) => {
    setConfig(prev => ({
      ...prev,
      depositTiers: prev.depositTiers.map((tier, i) =>
        i === index ? { ...tier, [field]: Number(value) || 0 } : tier
      )
    }))
  }

  const addDepositTier = () => {
    setConfig(prev => ({
      ...prev,
      depositTiers: [...prev.depositTiers, { amount: 0, bonusPercent: 0 }]
    }))
  }

  const removeDepositTier = (index) => {
    setConfig(prev => ({
      ...prev,
      depositTiers: prev.depositTiers.filter((_, i) => i !== index)
    }))
  }

  const updateChestTier = (index, field, value) => {
    setConfig(prev => ({
      ...prev,
      chestTiers: prev.chestTiers.map((tier, i) =>
        i === index ? { ...tier, [field]: Number(value) || 0 } : tier
      )
    }))
  }

  const addChestTier = () => {
    setConfig(prev => ({
      ...prev,
      chestTiers: [...prev.chestTiers, { referralsRequired: 1, rewardAmount: 0 }]
    }))
  }

  const removeChestTier = (index) => {
    setConfig(prev => ({
      ...prev,
      chestTiers: prev.chestTiers.filter((_, i) => i !== index)
    }))
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
          <p>Carregando configuração de bônus...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="admin-container admin-bonus-config">
      <div className="admin-header">
        <h1>
          <i className="fa-solid fa-gift"></i>
          Configuração de Bônus
        </h1>
        <p className="section-description">
          Configure bônus de primeiro depósito, faixas de depósito, bônus de afiliados e recompensas dos baús.
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
        <h2><i className="fa-solid fa-coins"></i> Primeiro depósito</h2>
        <p className="section-description">Percentual de bônus aplicado no primeiro depósito do usuário.</p>
        <div className="form-group">
          <label>Bônus 1º depósito (%)</label>
          <input
            type="number"
            min="0"
            max="100"
            step="0.5"
            value={config.firstDepositBonusPercent}
            onChange={(e) => setConfig(prev => ({ ...prev, firstDepositBonusPercent: Number(e.target.value) || 0 }))}
          />
        </div>
      </div>

      <div className="config-section">
        <h2><i className="fa-solid fa-money-bill-wave"></i> Bônus por valor de depósito</h2>
        <p className="section-description">Faixas de valor (R$) e percentual de bônus exibidos no modal de depósito.</p>
        <div className="tiers-table-wrap">
          <table className="tiers-table">
            <thead>
              <tr>
                <th>Valor (R$)</th>
                <th>Bônus (%)</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {config.depositTiers.map((tier, index) => (
                <tr key={index}>
                  <td>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={tier.amount}
                      onChange={(e) => updateDepositTier(index, 'amount', e.target.value)}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.5"
                      value={tier.bonusPercent}
                      onChange={(e) => updateDepositTier(index, 'bonusPercent', e.target.value)}
                    />
                  </td>
                  <td>
                    <button
                      type="button"
                      className="btn-icon btn-remove"
                      onClick={() => removeDepositTier(index)}
                      title="Remover"
                    >
                      <i className="fa-solid fa-trash"></i>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <button type="button" className="btn-add-tier" onClick={addDepositTier}>
            <i className="fa-solid fa-plus"></i> Adicionar faixa
          </button>
        </div>
      </div>

      <div className="config-section">
        <h2><i className="fa-solid fa-users-line"></i> Bônus afiliados</h2>
        <p className="section-description">O bônus % sobre depósito dos afiliados é configurado individualmente em <strong>Afiliados</strong> → Ver Detalhes de cada afiliado.</p>
      </div>

      <div className="config-section">
        <h2><i className="fa-solid fa-box-open"></i> Recompensas dos baús</h2>
        <p className="section-description">Número de indicados qualificados e valor da recompensa (R$) por baú.</p>
        <div className="tiers-table-wrap">
          <table className="tiers-table">
            <thead>
              <tr>
                <th>Indicados qualificados</th>
                <th>Recompensa (R$)</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {config.chestTiers.map((tier, index) => (
                <tr key={index}>
                  <td>
                    <input
                      type="number"
                      min="1"
                      value={tier.referralsRequired}
                      onChange={(e) => updateChestTier(index, 'referralsRequired', e.target.value)}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={tier.rewardAmount}
                      onChange={(e) => updateChestTier(index, 'rewardAmount', e.target.value)}
                    />
                  </td>
                  <td>
                    <button
                      type="button"
                      className="btn-icon btn-remove"
                      onClick={() => removeChestTier(index)}
                      title="Remover"
                    >
                      <i className="fa-solid fa-trash"></i>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <button type="button" className="btn-add-tier" onClick={addChestTier}>
            <i className="fa-solid fa-plus"></i> Adicionar nível
          </button>
        </div>
      </div>

      <div className="config-actions">
        <button
          type="button"
          className="save-btn"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? <><i className="fa-solid fa-spinner fa-spin"></i> Salvando...</> : <><i className="fa-solid fa-save"></i> Salvar configuração</>}
        </button>
      </div>
    </div>
  )
}

export default AdminBonusConfig
