import React, { useEffect, useState } from 'react'
import api from '../../services/api'
import './AdminSiteConfig.css'

function AdminSiteConfig() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [siteName, setSiteName] = useState('FORTUNEBET')

  useEffect(() => {
    loadConfig()
  }, [])

  const loadConfig = async () => {
    try {
      setLoading(true)
      const res = await api.getSiteConfig()
      if (res.success && res.data) {
        setSiteName(res.data.siteName || 'FORTUNEBET')
      }
    } catch (err) {
      setError(err.message || 'Erro ao carregar configuração')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (e) => {
    e.preventDefault()
    try {
      setSaving(true)
      setError(null)
      setSuccess(null)
      const res = await api.updateSiteConfig({ siteName: siteName.trim() || 'FORTUNEBET' })
      if (res.success) {
        setSuccess('Nome do site salvo! O título da aba do navegador será atualizado.')
        document.title = siteName.trim() || 'FORTUNEBET'
        setTimeout(() => setSuccess(null), 4000)
      } else {
        setError(res.message || 'Erro ao salvar')
      }
    } catch (err) {
      setError(err.message || 'Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="admin-container admin-site-config">
      <div className="admin-header">
        <h1>
          <i className="fa-solid fa-window-maximize"></i>
          Nome do site
        </h1>
      </div>

      <p className="admin-site-config-desc">
        Este nome aparece na barra da página (aba do navegador). Altere e salve para atualizar em todo o site.
      </p>

      {loading ? (
        <div className="admin-loading">
          <i className="fa-solid fa-spinner fa-spin"></i>
          <p>Carregando...</p>
        </div>
      ) : (
        <form className="admin-site-config-form" onSubmit={handleSave}>
          {error && <p className="admin-site-config-error">{error}</p>}
          {success && <p className="admin-site-config-success">{success}</p>}

          <div className="admin-site-config-field">
            <label htmlFor="siteName">
              <i className="fa-solid fa-heading"></i>
              Nome do site (título da aba)
            </label>
            <input
              id="siteName"
              type="text"
              placeholder="Ex: FORTUNEBET"
              maxLength={80}
              value={siteName}
              onChange={(e) => setSiteName(e.target.value)}
            />
          </div>

          <button type="submit" className="admin-site-config-submit" disabled={saving}>
            {saving ? (
              <>
                <i className="fa-solid fa-spinner fa-spin"></i>
                Salvando...
              </>
            ) : (
              <>
                <i className="fa-solid fa-save"></i>
                Salvar
              </>
            )}
          </button>
        </form>
      )}
    </div>
  )
}

export default AdminSiteConfig
