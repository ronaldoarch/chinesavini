import React, { useEffect, useState } from 'react'
import api from '../../services/api'
import './AdminSupport.css'

function AdminSupport() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [form, setForm] = useState({
    whatsappUrl: '',
    telegramUrl: '',
    instagramUrl: ''
  })

  useEffect(() => {
    loadConfig()
  }, [])

  const loadConfig = async () => {
    try {
      setLoading(true)
      const res = await api.getSupportConfig()
      if (res.success && res.data) {
        setForm({
          whatsappUrl: res.data.whatsappUrl || '',
          telegramUrl: res.data.telegramUrl || '',
          instagramUrl: res.data.instagramUrl || ''
        })
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
      const res = await api.updateSupportConfig(form)
      if (res.success) {
        setSuccess('Configuração salva com sucesso!')
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
    <div className="admin-container admin-support">
      <div className="admin-header">
        <h1>
          <i className="fa-solid fa-headset"></i>
          Suporte
        </h1>
      </div>

      <p className="admin-support-desc">
        Configure os links de suporte que aparecem no botão Suporte, Telegram e Instagram do menu e rodapé.
      </p>

      {loading ? (
        <div className="admin-loading">
          <i className="fa-solid fa-spinner fa-spin"></i>
          <p>Carregando...</p>
        </div>
      ) : (
        <form className="admin-support-form" onSubmit={handleSave}>
          {error && <p className="admin-support-error">{error}</p>}
          {success && <p className="admin-support-success">{success}</p>}

          <div className="admin-support-field">
            <label htmlFor="whatsappUrl">
              <i className="fa-brands fa-whatsapp"></i>
              WhatsApp (Suporte)
            </label>
            <input
              id="whatsappUrl"
              type="url"
              placeholder="https://wa.me/5511999999999"
              value={form.whatsappUrl}
              onChange={(e) => setForm({ ...form, whatsappUrl: e.target.value })}
            />
            <span className="admin-support-hint">
              Link completo. Ex: https://wa.me/5511999999999
            </span>
          </div>

          <div className="admin-support-field">
            <label htmlFor="telegramUrl">
              <i className="fa-brands fa-telegram"></i>
              Grupo Telegram
            </label>
            <input
              id="telegramUrl"
              type="url"
              placeholder="https://t.me/grupo777win"
              value={form.telegramUrl}
              onChange={(e) => setForm({ ...form, telegramUrl: e.target.value })}
            />
            <span className="admin-support-hint">
              Link do grupo ou canal do Telegram
            </span>
          </div>

          <div className="admin-support-field">
            <label htmlFor="instagramUrl">
              <i className="fa-brands fa-instagram"></i>
              Instagram
            </label>
            <input
              id="instagramUrl"
              type="url"
              placeholder="https://www.instagram.com/seu_perfil"
              value={form.instagramUrl}
              onChange={(e) => setForm({ ...form, instagramUrl: e.target.value })}
            />
            <span className="admin-support-hint">
              Link do perfil do Instagram
            </span>
          </div>

          <button type="submit" className="admin-support-submit" disabled={saving}>
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

export default AdminSupport
