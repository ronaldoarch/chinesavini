import React, { useEffect, useState } from 'react'
import api from '../../services/api'
import './AdminBanners.css'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
const getImageUrl = (imagePath) => {
  if (!imagePath) return ''
  const baseUrl = API_BASE_URL.replace(/\/api\/?$/, '')
  // If already a full URL, return as is
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath
  }
  // If starts with /uploads, use API base URL
  if (imagePath.startsWith('/uploads')) {
    return `${baseUrl}${imagePath}`
  }
  // Paths like ".domain.com/uploads/..." or "domain.com/uploads/..." (stored wrong) → use /uploads/... from API
  const uploadsIndex = imagePath.indexOf('/uploads/')
  if (uploadsIndex !== -1) {
    const pathFromUploads = imagePath.slice(uploadsIndex)
    return `${baseUrl}${pathFromUploads}`
  }
  return imagePath
}

function AdminBanners() {
  const [banners, setBanners] = useState([])
  const [logo, setLogo] = useState(null)
  const [loading, setLoading] = useState(false)
  const [showBannerModal, setShowBannerModal] = useState(false)
  const [showLogoModal, setShowLogoModal] = useState(false)
  const [editingBanner, setEditingBanner] = useState(null)
  const [bannerForm, setBannerForm] = useState({
    title: '',
    linkUrl: '',
    description: '',
    order: 0,
    isActive: true
  })
  const [bannerImage, setBannerImage] = useState(null)
  const [logoImage, setLogoImage] = useState(null)
  const [logoAltText, setLogoAltText] = useState('Logo')

  useEffect(() => {
    loadBanners()
    loadLogo()
  }, [])

  const loadBanners = async () => {
    try {
      setLoading(true)
      const response = await api.getBannersAdmin()
      if (response.success) {
        setBanners(response.data.banners || [])
      }
    } catch (error) {
      console.error('Error loading banners:', error)
      alert('Erro ao carregar banners')
    } finally {
      setLoading(false)
    }
  }

  const loadLogo = async () => {
    try {
      const response = await api.getLogoAdmin()
      if (response.success) {
        setLogo(response.data.logo)
        if (response.data.logo) {
          setLogoAltText(response.data.logo.altText || 'Logo')
        }
      }
    } catch (error) {
      console.error('Error loading logo:', error)
    }
  }

  const handleBannerSubmit = async (e) => {
    e.preventDefault()
    try {
      setLoading(true)
      const formData = new FormData()
      formData.append('title', bannerForm.title)
      formData.append('linkUrl', bannerForm.linkUrl || '')
      formData.append('description', bannerForm.description || '')
      formData.append('order', bannerForm.order.toString())
      formData.append('isActive', bannerForm.isActive.toString())
      
      if (bannerImage) {
        formData.append('image', bannerImage)
      }

      let response
      if (editingBanner) {
        response = await api.updateBanner(editingBanner._id, formData)
      } else {
        response = await api.createBanner(formData)
      }

      if (response.success) {
        await loadBanners()
        setShowBannerModal(false)
        setEditingBanner(null)
        setBannerForm({
          title: '',
          linkUrl: '',
          description: '',
          order: 0,
          isActive: true
        })
        setBannerImage(null)
        alert(editingBanner ? 'Banner atualizado com sucesso!' : 'Banner criado com sucesso!')
      } else {
        alert(response.message || 'Erro ao salvar banner')
      }
    } catch (error) {
      console.error('Error saving banner:', error)
      alert('Erro ao salvar banner. Verifique se a imagem é válida.')
    } finally {
      setLoading(false)
    }
  }

  const handleLogoSubmit = async (e) => {
    e.preventDefault()
    if (!logoImage) {
      alert('Selecione uma imagem para a logo')
      return
    }

    try {
      setLoading(true)
      const formData = new FormData()
      formData.append('logo', logoImage)
      formData.append('altText', logoAltText)

      const response = await api.uploadLogo(formData)
      if (response.success) {
        await loadLogo()
        setShowLogoModal(false)
        setLogoImage(null)
        alert('Logo atualizada com sucesso!')
        // Reload page to update header
        window.location.reload()
      } else {
        alert(response.message || 'Erro ao fazer upload da logo')
      }
    } catch (error) {
      console.error('Error uploading logo:', error)
      alert('Erro ao fazer upload da logo. Verifique se a imagem é válida.')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteBanner = async (id) => {
    if (!window.confirm('Tem certeza que deseja deletar este banner?')) {
      return
    }

    try {
      setLoading(true)
      const response = await api.deleteBanner(id)
      if (response.success) {
        await loadBanners()
        alert('Banner deletado com sucesso!')
      } else {
        alert(response.message || 'Erro ao deletar banner')
      }
    } catch (error) {
      console.error('Error deleting banner:', error)
      alert('Erro ao deletar banner')
    } finally {
      setLoading(false)
    }
  }

  const openEditBanner = (banner) => {
    setEditingBanner(banner)
    setBannerForm({
      title: banner.title,
      linkUrl: banner.linkUrl || '',
      description: banner.description || '',
      order: banner.order,
      isActive: banner.isActive
    })
    setBannerImage(null)
    setShowBannerModal(true)
  }

  const openNewBanner = () => {
    setEditingBanner(null)
    setBannerForm({
      title: '',
      linkUrl: '',
      description: '',
      order: banners.length,
      isActive: true
    })
    setBannerImage(null)
    setShowBannerModal(true)
  }

  return (
    <div className="admin-container">
      <div className="admin-header">
        <h1>Gerenciamento de Banners e Logo</h1>
      </div>

      <div className="admin-banners-content">
        {/* Logo Section */}
        <div className="banners-section">
          <div className="section-header">
            <h2>Logo</h2>
            <button className="btn-primary" onClick={() => setShowLogoModal(true)}>
              <i className="fa-solid fa-upload"></i>
              {logo ? 'Atualizar Logo' : 'Adicionar Logo'}
            </button>
          </div>
          {logo && (
            <div className="logo-preview">
              <img src={getImageUrl(logo.imageUrl)} alt={logo.altText} />
              <p>Logo atual</p>
            </div>
          )}
        </div>

        {/* Banners Section */}
        <div className="banners-section">
          <div className="section-header">
            <h2>Banners</h2>
            <button className="btn-primary" onClick={openNewBanner}>
              <i className="fa-solid fa-plus"></i>
              Adicionar Banner
            </button>
          </div>

          {loading && banners.length === 0 ? (
            <div className="loading-state">
              <i className="fa-solid fa-spinner fa-spin"></i>
              <span>Carregando banners...</span>
            </div>
          ) : banners.length === 0 ? (
            <div className="empty-state">
              <i className="fa-solid fa-image"></i>
              <p>Nenhum banner cadastrado</p>
            </div>
          ) : (
            <div className="banners-grid">
              {banners.map((banner) => (
                <div key={banner._id} className="banner-card">
                  <div className="banner-image">
                    <img src={getImageUrl(banner.imageUrl)} alt={banner.title} />
                    {!banner.isActive && (
                      <div className="banner-inactive-badge">Inativo</div>
                    )}
                  </div>
                  <div className="banner-info">
                    <h3>{banner.title}</h3>
                    {banner.linkUrl && (
                      <p className="banner-link">
                        <i className="fa-solid fa-link"></i>
                        {banner.linkUrl}
                      </p>
                    )}
                    <p className="banner-order">Ordem: {banner.order}</p>
                  </div>
                  <div className="banner-actions">
                    <button
                      className="btn-edit"
                      onClick={() => openEditBanner(banner)}
                    >
                      <i className="fa-solid fa-edit"></i>
                      Editar
                    </button>
                    <button
                      className="btn-delete"
                      onClick={() => handleDeleteBanner(banner._id)}
                    >
                      <i className="fa-solid fa-trash"></i>
                      Deletar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Logo Modal */}
      {showLogoModal && (
        <div className="modal-overlay" onClick={() => setShowLogoModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{logo ? 'Atualizar Logo' : 'Adicionar Logo'}</h2>
              <button onClick={() => setShowLogoModal(false)}>
                <i className="fa-solid fa-times"></i>
              </button>
            </div>
            <form onSubmit={handleLogoSubmit} className="modal-body">
              <div className="form-group">
                <label>Imagem da Logo *</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setLogoImage(e.target.files[0])}
                  required
                />
                {logoImage && (
                  <div className="image-preview">
                    <img src={URL.createObjectURL(logoImage)} alt="Preview" />
                  </div>
                )}
                {logo && !logoImage && (
                  <div className="image-preview">
                    <img src={getImageUrl(logo.imageUrl)} alt="Logo atual" />
                  </div>
                )}
              </div>
              <div className="form-group">
                <label>Texto Alternativo</label>
                <input
                  type="text"
                  value={logoAltText}
                  onChange={(e) => setLogoAltText(e.target.value)}
                  placeholder="Logo"
                />
              </div>
              <div className="modal-actions">
                <button type="button" onClick={() => setShowLogoModal(false)}>
                  Cancelar
                </button>
                <button type="submit" disabled={loading || !logoImage}>
                  {loading ? 'Salvando...' : 'Salvar Logo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Banner Modal */}
      {showBannerModal && (
        <div className="modal-overlay" onClick={() => setShowBannerModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingBanner ? 'Editar Banner' : 'Novo Banner'}</h2>
              <button onClick={() => setShowBannerModal(false)}>
                <i className="fa-solid fa-times"></i>
              </button>
            </div>
            <form onSubmit={handleBannerSubmit} className="modal-body">
              <div className="form-group">
                <label>Título *</label>
                <input
                  type="text"
                  value={bannerForm.title}
                  onChange={(e) => setBannerForm({ ...bannerForm, title: e.target.value })}
                  required
                  placeholder="Nome do banner"
                />
              </div>
              <div className="form-group">
                <label>Imagem {!editingBanner && '*'}</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setBannerImage(e.target.files[0])}
                  required={!editingBanner}
                />
                {bannerImage && (
                  <div className="image-preview">
                    <img src={URL.createObjectURL(bannerImage)} alt="Preview" />
                  </div>
                )}
                {editingBanner && !bannerImage && (
                  <div className="image-preview">
                    <img src={getImageUrl(editingBanner.imageUrl)} alt="Banner atual" />
                    <p className="image-note">Deixe em branco para manter a imagem atual</p>
                  </div>
                )}
              </div>
              <div className="form-group">
                <label>URL do Link (opcional)</label>
                <input
                  type="url"
                  value={bannerForm.linkUrl}
                  onChange={(e) => setBannerForm({ ...bannerForm, linkUrl: e.target.value })}
                  placeholder="https://exemplo.com"
                />
              </div>
              <div className="form-group">
                <label>Descrição</label>
                <textarea
                  value={bannerForm.description}
                  onChange={(e) => setBannerForm({ ...bannerForm, description: e.target.value })}
                  rows="3"
                  placeholder="Descrição do banner"
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Ordem</label>
                  <input
                    type="number"
                    value={bannerForm.order}
                    onChange={(e) => setBannerForm({ ...bannerForm, order: parseInt(e.target.value) || 0 })}
                    min="0"
                  />
                </div>
                <div className="form-group">
                  <label>
                    <input
                      type="checkbox"
                      checked={bannerForm.isActive}
                      onChange={(e) => setBannerForm({ ...bannerForm, isActive: e.target.checked })}
                    />
                    Ativo
                  </label>
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" onClick={() => setShowBannerModal(false)}>
                  Cancelar
                </button>
                <button type="submit" disabled={loading}>
                  {loading ? 'Salvando...' : editingBanner ? 'Atualizar' : 'Criar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminBanners
