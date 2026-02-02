import React, { useEffect, useState } from 'react'
import api from '../services/api'
import './PromotionsModal.css'

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

function PromotionsModal({ isOpen, onClose, onDepositClick, onWithdrawClick, onInviteClick }) {
  const [isClosing, setIsClosing] = useState(false)
  const [promotions, setPromotions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (isOpen) {
      setIsClosing(false)
      loadPromotions()
    }
  }, [isOpen])

  const loadPromotions = async () => {
    try {
      setLoading(true)
      const res = await api.getPromotions()
      if (res.success && res.data?.promotions) {
        setPromotions(res.data.promotions)
      } else {
        setPromotions([])
      }
    } catch (err) {
      setPromotions([])
    } finally {
      setLoading(false)
    }
  }

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

  const handlePromoClick = (promo) => {
    handleClose()
    setTimeout(() => {
      // Promoções com bônus (1º depósito, depósito por valor, etc.) levam para depósito
      const hasBonus = promo.bonusType && ['first-deposit', 'deposit-tier', 'affiliate', 'chest'].includes(promo.bonusType)
      if (hasBonus && onDepositClick) {
        onDepositClick()
        return
      }
      if (promo.actionType === 'deposit' && onDepositClick) onDepositClick()
      else if (promo.actionType === 'withdraw' && onWithdrawClick) onWithdrawClick()
      else if (promo.actionType === 'invite' && onInviteClick) onInviteClick()
      else if (onDepositClick) onDepositClick()
    }, 350)
  }

  if (!isOpen && !isClosing) return null

  return (
    <div className={`promotions-modal ${isClosing ? 'is-closing' : ''}`}>
      <div className="promotions-header">
        <button className="promotions-back" type="button" onClick={handleClose} aria-label="Voltar">
          <i className="fa-solid fa-arrow-left"></i>
        </button>
        <span className="promotions-title">Promoções</span>
      </div>
      <div className="promotions-content">
        {loading ? (
          <div className="promotions-loading">
            <i className="fa-solid fa-spinner fa-spin"></i>
            <span>Carregando promoções...</span>
          </div>
        ) : promotions.length === 0 ? (
          <div className="promotions-empty">
            <i className="fa-solid fa-gift"></i>
            <span>Nenhuma promoção disponível no momento.</span>
          </div>
        ) : (
          promotions.map((promo) => (
            <button
              key={promo._id}
              type="button"
              className="promotions-card"
              onClick={() => handlePromoClick(promo)}
            >
              <img src={getImageUrl(promo.imageUrl)} alt={promo.title} />
              {promo.title && <span className="promotions-card-title">{promo.title}</span>}
            </button>
          ))
        )}
      </div>
    </div>
  )
}

export default PromotionsModal
