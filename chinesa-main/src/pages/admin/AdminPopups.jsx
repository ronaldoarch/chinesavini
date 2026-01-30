import React, { useEffect, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import api from '../../services/api'
import './AdminPopups.css'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
const getImageUrl = (url) => {
  if (!url) return ''
  const baseUrl = API_BASE_URL.replace(/\/api\/?$/, '')
  if (url.startsWith('http')) return url
  if (url.startsWith('/uploads')) return baseUrl + url
  const i = url.indexOf('/uploads/')
  if (i !== -1) return baseUrl + url.slice(i)
  return url
}

function AdminPopups() {
  const { isAdmin } = useAuth()
  const [popups, setPopups] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState({
    title: '',
    content: '',
    imageUrl: '',
    linkUrl: '',
    active: true,
    startDate: '',
    endDate: '',
    showOncePerSession: true,
    order: 0
  })

  useEffect(() => {
    if (!isAdmin) {
      setLoading(false)
      return
    }
    loadPopups()
  }, [isAdmin])

  const loadPopups = async () => {
    try {
      setLoading(true)
      const response = await api.getPopups()
      if (response.success) {
        setPopups(response.data.popups || [])
      }
    } catch (err) {
      console.error('Erro ao carregar popups:', err)
      alert('Erro ao carregar popups')
    } finally {
      setLoading(false)
    }
  }

  const openCreate = () => {
    setEditingId(null)
    setForm({
      title: '',
      content: '',
      imageUrl: '',
      linkUrl: '',
      active: true,
      startDate: '',
      endDate: '',
      showOncePerSession: true,
      order: popups.length
    })
    setShowModal(true)
  }

  const openEdit = (popup) => {
    setEditingId(popup._id)
    setForm({
      title: popup.title || '',
      content: popup.content || '',
      imageUrl: popup.imageUrl || '',
      linkUrl: popup.linkUrl || '',
      active: popup.active !== false,
      startDate: popup.startDate ? popup.startDate.slice(0, 16) : '',
      endDate: popup.endDate ? popup.endDate.slice(0, 16) : '',
      showOncePerSession: popup.showOncePerSession !== false,
      order: popup.order ?? 0
    })
    setShowModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      setSaving(true)
      const payload = {
        ...form,
        startDate: form.startDate ? new Date(form.startDate).toISOString() : null,
        endDate: form.endDate ? new Date(form.endDate).toISOString() : null
      }
      if (editingId) {
        await api.updatePopup(editingId, payload)
        alert('Popup atualizado com sucesso!')
      } else {
        await api.createPopup(payload)
        alert('Popup criado com sucesso!')
      }
      setShowModal(false)
      loadPopups()
    } catch (err) {
      alert(err.message || 'Erro ao salvar popup')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Remover este popup?')) return
    try {
      await api.deletePopup(id)
      loadPopups()
    } catch (err) {
      alert(err.message || 'Erro ao remover')
    }
  }

  const toggleActive = async (popup) => {
    try {
      await api.updatePopup(popup._id, { ...popup, active: !popup.active })
      loadPopups()
    } catch (err) {
      alert(err.message || 'Erro ao atualizar')
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
          <p>Carregando popups...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="admin-container admin-popups">
      <div className="admin-header">
        <h1>
          <i className="fa-solid fa-window-maximize"></i>
          Popups de Promoção
        </h1>
        <p className="section-description">
          Crie e gerencie popups exibidos na entrada do site. O popup ativo (com data válida) é exibido uma vez por sessão, se configurado.
        </p>
        <button type="button" className="btn-primary" onClick={openCreate}>
          <i className="fa-solid fa-plus"></i> Novo popup
        </button>
      </div>

      <div className="popups-list">
        {popups.length === 0 ? (
          <div className="empty-state">
            <i className="fa-solid fa-window-restore"></i>
            <p>Nenhum popup cadastrado. Clique em &quot;Novo popup&quot; para criar.</p>
          </div>
        ) : (
          <div className="popups-grid">
            {popups.map((popup) => (
              <div key={popup._id} className={`popup-card ${!popup.active ? 'inactive' : ''}`}>
                <div className="popup-card-header">
                  <span className="popup-title">{popup.title}</span>
                  <span className={`badge ${popup.active ? 'badge-success' : 'badge-secondary'}`}>
                    {popup.active ? 'Ativo' : 'Inativo'}
                  </span>
                </div>
                {popup.imageUrl && (
                  <div className="popup-card-image">
                    <img src={getImageUrl(popup.imageUrl)} alt={popup.title} />
                  </div>
                )}
                <div className="popup-card-meta">
                  {popup.startDate && <span>Início: {new Date(popup.startDate).toLocaleDateString('pt-BR')}</span>}
                  {popup.endDate && <span>Fim: {new Date(popup.endDate).toLocaleDateString('pt-BR')}</span>}
                  <span>Ordem: {popup.order}</span>
                </div>
                <div className="popup-card-actions">
                  <button type="button" className="btn-sm btn-toggle" onClick={() => toggleActive(popup)}>
                    {popup.active ? 'Desativar' : 'Ativar'}
                  </button>
                  <button type="button" className="btn-sm btn-edit" onClick={() => openEdit(popup)}>
                    <i className="fa-solid fa-pen"></i>
                  </button>
                  <button type="button" className="btn-sm btn-delete" onClick={() => handleDelete(popup._id)}>
                    <i className="fa-solid fa-trash"></i>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => !saving && setShowModal(false)}>
          <div className="modal-content popup-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingId ? 'Editar popup' : 'Novo popup'}</h2>
              <button type="button" className="modal-close" onClick={() => !saving && setShowModal(false)}>
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Título *</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm(prev => ({ ...prev, title: e.target.value }))}
                  required
                />
              </div>
              <div className="form-group">
                <label>Conteúdo (texto)</label>
                <textarea
                  rows={3}
                  value={form.content}
                  onChange={(e) => setForm(prev => ({ ...prev, content: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label>URL da imagem</label>
                <input
                  type="text"
                  placeholder="https://... ou /uploads/..."
                  value={form.imageUrl}
                  onChange={(e) => setForm(prev => ({ ...prev, imageUrl: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label>Link (ao clicar)</label>
                <input
                  type="text"
                  placeholder="https://..."
                  value={form.linkUrl}
                  onChange={(e) => setForm(prev => ({ ...prev, linkUrl: e.target.value }))}
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Início (opcional)</label>
                  <input
                    type="datetime-local"
                    value={form.startDate}
                    onChange={(e) => setForm(prev => ({ ...prev, startDate: e.target.value }))}
                  />
                </div>
                <div className="form-group">
                  <label>Fim (opcional)</label>
                  <input
                    type="datetime-local"
                    value={form.endDate}
                    onChange={(e) => setForm(prev => ({ ...prev, endDate: e.target.value }))}
                  />
                </div>
              </div>
              <div className="form-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={form.active}
                    onChange={(e) => setForm(prev => ({ ...prev, active: e.target.checked }))}
                  />
                  Ativo
                </label>
              </div>
              <div className="form-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={form.showOncePerSession}
                    onChange={(e) => setForm(prev => ({ ...prev, showOncePerSession: e.target.checked }))}
                  />
                  Mostrar uma vez por sessão
                </label>
              </div>
              <div className="form-group">
                <label>Ordem (0 = primeiro)</label>
                <input
                  type="number"
                  min="0"
                  value={form.order}
                  onChange={(e) => setForm(prev => ({ ...prev, order: Number(e.target.value) || 0 }))}
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)} disabled={saving}>
                  Cancelar
                </button>
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? 'Salvando...' : (editingId ? 'Atualizar' : 'Criar')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminPopups
