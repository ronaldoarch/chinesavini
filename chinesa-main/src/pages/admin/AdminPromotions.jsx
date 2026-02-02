import React, { useEffect, useState } from 'react'
import api from '../../services/api'
import './AdminPromotions.css'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
const getImageUrl = (imagePath) => {
  if (!imagePath) return ''
  const baseUrl = API_BASE_URL.replace(/\/api\/?$/, '')
  if (imagePath.startsWith('http')) return imagePath
  if (imagePath.startsWith('/uploads')) return `${baseUrl}${imagePath}`
  const i = imagePath.indexOf('/uploads/')
  if (i !== -1) return `${baseUrl}${imagePath.slice(i)}`
  return imagePath
}

const BONUS_OPTIONS = [
  { value: '', label: '— Nenhum —' },
  { value: 'first-deposit', label: 'Bônus 1º Depósito' },
  { value: 'deposit-tier', label: 'Bônus por valor de depósito' },
  { value: 'affiliate', label: 'Bônus Afiliados' },
  { value: 'chest', label: 'Baús (recompensas)' }
]

const ACTION_OPTIONS = [
  { value: 'deposit', label: 'Depósito' },
  { value: 'withdraw', label: 'Saque' },
  { value: 'invite', label: 'Convidar' }
]

function AdminPromotions() {
  const [promotions, setPromotions] = useState([])
  const [loading, setLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [editingPromo, setEditingPromo] = useState(null)
  const [form, setForm] = useState({
    title: '',
    description: '',
    actionType: 'deposit',
    bonusType: '',
    order: 0,
    isActive: true
  })
  const [bannerImage, setBannerImage] = useState(null)

  useEffect(() => {
    loadPromotions()
  }, [])

  const loadPromotions = async () => {
    try {
      setLoading(true)
      const res = await api.getPromotionsAdmin()
      if (res.success) setPromotions(res.data.promotions || [])
    } catch (err) {
      console.error(err)
      alert('Erro ao carregar promoções')
    } finally {
      setLoading(false)
    }
  }

  const openCreate = () => {
    setEditingPromo(null)
    setForm({
      title: '',
      description: '',
      actionType: 'deposit',
      bonusType: '',
      order: promotions.length,
      isActive: true
    })
    setBannerImage(null)
    setShowModal(true)
  }

  const openEdit = (promo) => {
    setEditingPromo(promo)
    setForm({
      title: promo.title || '',
      description: promo.description || '',
      actionType: promo.actionType || 'deposit',
      bonusType: promo.bonusType || '',
      order: promo.order || 0,
      isActive: promo.isActive !== false
    })
    setBannerImage(null)
    setShowModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.title.trim()) {
      alert('Título é obrigatório')
      return
    }
    if (!editingPromo && !bannerImage) {
      alert('Banner é obrigatório para nova promoção')
      return
    }
    try {
      setLoading(true)
      const formData = new FormData()
      formData.append('title', form.title.trim())
      formData.append('description', form.description || '')
      formData.append('actionType', form.actionType)
      formData.append('bonusType', form.bonusType || '')
      formData.append('order', String(form.order))
      formData.append('isActive', String(form.isActive))
      if (bannerImage) formData.append('image', bannerImage)

      if (editingPromo) {
        const res = await api.updatePromotion(editingPromo._id, formData)
        if (res.success) {
          loadPromotions()
          setShowModal(false)
          alert('Promoção atualizada!')
        } else alert(res.message || 'Erro ao atualizar')
      } else {
        const res = await api.createPromotion(formData)
        if (res.success) {
          loadPromotions()
          setShowModal(false)
          alert('Promoção criada!')
        } else alert(res.message || 'Erro ao criar')
      }
    } catch (err) {
      alert(err.message || 'Erro ao salvar')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Remover esta promoção?')) return
    try {
      const res = await api.deletePromotion(id)
      if (res.success) loadPromotions()
      else alert(res.message || 'Erro ao remover')
    } catch (err) {
      alert(err.message || 'Erro ao remover')
    }
  }

  const getBonusLabel = (v) => BONUS_OPTIONS.find((o) => o.value === v)?.label || v || '—'

  return (
    <div className="admin-container admin-promotions">
      <div className="admin-header">
        <h1>
          <i className="fa-solid fa-gift"></i>
          Promoções
        </h1>
        <button type="button" className="btn-primary" onClick={openCreate}>
          <i className="fa-solid fa-plus"></i>
          Nova Promoção
        </button>
      </div>

      <p className="admin-promotions-desc">
        As promoções aparecem na página de Promoções da home. Ao clicar, o usuário é levado à ação configurada (ex: depósito).
        Vincule ao bônus já configurado na plataforma.
      </p>

      {loading && !showModal ? (
        <div className="admin-loading">
          <i className="fa-solid fa-spinner fa-spin"></i>
          <p>Carregando...</p>
        </div>
      ) : (
        <div className="admin-promotions-grid">
          {promotions.length === 0 ? (
            <p className="admin-promotions-empty">Nenhuma promoção cadastrada. Clique em &quot;Nova Promoção&quot; para criar.</p>
          ) : (
            promotions.map((promo) => (
              <div key={promo._id} className="admin-promo-card">
                <div className="admin-promo-thumb">
                  <img src={getImageUrl(promo.imageUrl)} alt={promo.title} />
                </div>
                <div className="admin-promo-info">
                  <h3>{promo.title}</h3>
                  <span className="admin-promo-badge">{getBonusLabel(promo.bonusType)}</span>
                  <span className={`admin-promo-status ${promo.isActive ? 'active' : 'inactive'}`}>
                    {promo.isActive ? 'Ativa' : 'Inativa'}
                  </span>
                </div>
                <div className="admin-promo-actions">
                  <button type="button" className="btn-edit" onClick={() => openEdit(promo)}>
                    Editar
                  </button>
                  <button type="button" className="btn-delete" onClick={() => handleDelete(promo._id)}>
                    Deletar
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {showModal && (
        <div className="admin-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <h2>{editingPromo ? 'Editar Promoção' : 'Nova Promoção'}</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Título *</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Ex: Bônus 1º Depósito"
                  required
                />
              </div>
              <div className="form-group">
                <label>Descrição</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Descrição opcional"
                  rows={2}
                />
              </div>
              <div className="form-group">
                <label>Banner *</label>
                {editingPromo && form.title && (
                  <div className="form-current-img">
                    <img src={getImageUrl(editingPromo.imageUrl)} alt="Atual" />
                    <span>Atual (deixe em branco para manter)</span>
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setBannerImage(e.target.files?.[0] || null)}
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Ação ao clicar</label>
                  <select
                    value={form.actionType}
                    onChange={(e) => setForm({ ...form, actionType: e.target.value })}
                  >
                    {ACTION_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Bônus vinculado</label>
                  <select
                    value={form.bonusType}
                    onChange={(e) => setForm({ ...form, bonusType: e.target.value })}
                  >
                    {BONUS_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Ordem</label>
                  <input
                    type="number"
                    min={0}
                    value={form.order}
                    onChange={(e) => setForm({ ...form, order: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div className="form-group form-check">
                  <label>
                    <input
                      type="checkbox"
                      checked={form.isActive}
                      onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                    />
                    Ativa
                  </label>
                </div>
              </div>
              <div className="form-actions">
                <button type="button" onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" disabled={loading}>
                  {loading ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminPromotions
