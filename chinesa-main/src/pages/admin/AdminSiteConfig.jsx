import React, { useEffect, useState } from 'react'
import api from '../../services/api'
import './AdminSiteConfig.css'

function AdminSiteConfig() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [siteName, setSiteName] = useState('Plataforma')
  const [shareDescription, setShareDescription] = useState('')
  const [shareImageUrl, setShareImageUrl] = useState('')

  useEffect(() => {
    loadConfig()
  }, [])

  const loadConfig = async () => {
    try {
      setLoading(true)
      const res = await api.getSiteConfig()
      if (res.success && res.data) {
        setSiteName(res.data.siteName || 'Plataforma')
        setShareDescription(res.data.shareDescription || '')
        setShareImageUrl(res.data.shareImageUrl || '')
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
      const res = await api.updateSiteConfig({
        siteName: siteName.trim() || 'Plataforma',
        shareDescription: shareDescription.trim(),
        shareImageUrl: shareImageUrl.trim()
      })
      if (res.success) {
        setSuccess(
          'Salvo! O título da aba atualiza na hora. Preview de link (WhatsApp) atualiza após novo deploy do frontend com a API e URL pública configuradas no build.'
        )
        document.title = siteName.trim() || 'Plataforma'
        setTimeout(() => setSuccess(null), 6000)
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
          Nome do site e compartilhamento
        </h1>
      </div>

      <p className="admin-site-config-desc">
        O <strong>título da aba</strong> é aplicado pelo site em tempo real. O <strong>cartão de link</strong> (WhatsApp,
        Telegram, Facebook) vem do HTML gerado no <strong>build</strong>: configure o deploy para rodar{' '}
        <code>npm run build</code> com <code>VITE_API_URL</code> e <code>VITE_PUBLIC_SITE_URL</code>, e faça um redeploy
        depois de alterar os textos abaixo. Imagem padrão do preview:{' '}
        <code>/logo_plataforma.png</code> na raiz do site, se não informar URL abaixo.
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
              Nome do site (título da aba e título do link)
            </label>
            <input
              id="siteName"
              type="text"
              placeholder="Ex: BRAZINO77"
              maxLength={80}
              value={siteName}
              onChange={(e) => setSiteName(e.target.value)}
            />
          </div>

          <div className="admin-site-config-field">
            <label htmlFor="shareDescription">
              <i className="fa-solid fa-message"></i>
              Descrição no preview do link (WhatsApp / redes)
            </label>
            <textarea
              id="shareDescription"
              rows={4}
              maxLength={500}
              placeholder="Ex: A melhor experiência em jogos online. Cadastre-se e ganhe bônus!"
              value={shareDescription}
              onChange={(e) => setShareDescription(e.target.value)}
            />
            <span className="admin-site-config-hint">{shareDescription.length}/500</span>
          </div>

          <div className="admin-site-config-field">
            <label htmlFor="shareImageUrl">
              <i className="fa-solid fa-image"></i>
              URL da imagem do preview (https://… recomendado, ~1200×630 ou quadrada)
            </label>
            <input
              id="shareImageUrl"
              type="url"
              placeholder="https://seudominio.com/assets/og-banner.png"
              maxLength={500}
              value={shareImageUrl}
              onChange={(e) => setShareImageUrl(e.target.value)}
            />
            <span className="admin-site-config-hint">
              Deixe vazio para usar <code>https://SEU_DOMÍNIO/logo_plataforma.png</code> no build.
            </span>
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
