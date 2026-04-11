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
        Telegram, Facebook) vem do HTML gerado no <strong>build</strong>: configure <code>VITE_API_URL</code> e{' '}
        <code>VITE_PUBLIC_SITE_URL</code>, rode <code>npm run build</code> e redeploy. A <strong>imagem do preview</strong>{' '}
        usa automaticamente a <strong>logo ativa</strong> (Admin → Banners &amp; Logo). A URL manual abaixo só vale se
        quiser <strong>substituir</strong> essa logo no compartilhamento. Se o WhatsApp ainda mostrar preview velho, use o{' '}
        <a href="https://developers.facebook.com/tools/debug/" target="_blank" rel="noopener noreferrer">
          Depurador de compartilhamento da Meta
        </a>{' '}
        na URL do site e clique em &quot;Buscar novamente&quot;.
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
              URL da imagem do preview (opcional — sobrescreve a logo do admin)
            </label>
            <input
              id="shareImageUrl"
              type="url"
              placeholder="Vazio = logo de Banners & Logo automaticamente"
              maxLength={500}
              value={shareImageUrl}
              onChange={(e) => setShareImageUrl(e.target.value)}
            />
            <span className="admin-site-config-hint">
              Vazio: o build usa a logo cadastrada (upload fica em <code>/uploads/…</code> na API; padrão{' '}
              <code>/logo_plataforma.png</code> no site).
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
