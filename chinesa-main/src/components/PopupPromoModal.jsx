import React from 'react'
import './PopupPromoModal.css'

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

function PopupPromoModal({ popup, onClose }) {
  if (!popup) return null

  const handleContentClick = (e) => {
    if (popup.linkUrl) {
      window.open(popup.linkUrl, '_blank')
    }
    onClose()
  }

  return (
    <div className="popup-promo-overlay" role="dialog" aria-modal="true" aria-label="Promoção">
      <div className="popup-promo-backdrop" onClick={onClose} />
      <div className="popup-promo-box">
        <button
          type="button"
          className="popup-promo-close"
          onClick={onClose}
          aria-label="Fechar"
        >
          <i className="fa-solid fa-xmark"></i>
        </button>
        <div
          className="popup-promo-content"
          onClick={popup.linkUrl ? handleContentClick : undefined}
          role={popup.linkUrl ? 'button' : undefined}
        >
          {popup.imageUrl && (
            <div className="popup-promo-image">
              <img src={getImageUrl(popup.imageUrl)} alt={popup.title} />
            </div>
          )}
          <h3 className="popup-promo-title">{popup.title}</h3>
          {popup.content && (
            <div className="popup-promo-text" dangerouslySetInnerHTML={{ __html: popup.content }} />
          )}
          {popup.linkUrl && (
            <span className="popup-promo-cta">Clique para saber mais</span>
          )}
        </div>
      </div>
    </div>
  )
}

export default PopupPromoModal
