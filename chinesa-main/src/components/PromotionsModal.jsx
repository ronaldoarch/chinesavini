import React, { useEffect, useState } from 'react'
import './PromotionsModal.css'

function PromotionsModal({ isOpen, onClose }) {
  const [isClosing, setIsClosing] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setIsClosing(false)
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        handleClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen])

  const handleClose = () => {
    setIsClosing(true)
    setTimeout(() => {
      setIsClosing(false)
      onClose()
    }, 600)
  }

  if (!isOpen && !isClosing) return null

  const banners = [
    { id: 1, src: '/bannerPromo/bp1.jpg', alt: 'Promoção 1' },
    { id: 2, src: '/bannerPromo/bp2.jpg', alt: 'Promoção 2' },
    { id: 3, src: '/bannerPromo/bp3.jpg', alt: 'Promoção 3' },
    { id: 4, src: '/bannerPromo/bp4.jpg', alt: 'Promoção 4' },
    { id: 5, src: '/bannerPromo/bp5.jpg', alt: 'Promoção 5' }
  ]

  return (
    <div className={`promotions-modal ${isClosing ? 'is-closing' : ''}`}>
      <div className="promotions-header">
        <button className="promotions-back" type="button" onClick={handleClose} aria-label="Voltar">
          <i className="fa-solid fa-arrow-left"></i>
        </button>
        <span className="promotions-title">Promoções</span>
      </div>
      <div className="promotions-content">
        {banners.map((banner) => (
          <div key={banner.id} className="promotions-card">
            <img src={banner.src} alt={banner.alt} />
          </div>
        ))}
      </div>
    </div>
  )
}

export default PromotionsModal

