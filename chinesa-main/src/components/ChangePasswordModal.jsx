import React, { useEffect, useState } from 'react'
import './ChangePasswordModal.css'

function ChangePasswordModal({ isOpen, onClose, onBack }) {
  const [isClosing, setIsClosing] = useState(false)
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  useEffect(() => {
    if (isOpen) setIsClosing(false)
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
      if (onClose) onClose()
    }, 600)
  }

  const handleBack = () => {
    setIsClosing(true)
    setTimeout(() => {
      setIsClosing(false)
      if (onBack) onBack()
    }, 600)
  }

  if (!isOpen && !isClosing) return null

  return (
    <div className={`change-password-modal ${isClosing ? 'is-closing' : ''}`}>
      <div className="change-password-header">
        <button className="change-password-back" type="button" onClick={handleBack} aria-label="Voltar">
          <i className="fa-solid fa-arrow-left"></i>
        </button>
        <span className="change-password-title">Alterar Senha</span>
        <button className="change-password-close" type="button" onClick={handleClose} aria-label="Fechar">
          <i className="fa-solid fa-xmark"></i>
        </button>
      </div>

      <div className="change-password-content">
        <div className="change-password-field">
          <label>Senha Atual</label>
          <div className="change-password-input">
            <input type={showCurrent ? 'text' : 'password'} />
            <button
              type="button"
              className="change-password-eye"
              aria-label={showCurrent ? 'Ocultar senha' : 'Mostrar senha'}
              onClick={() => setShowCurrent((prev) => !prev)}
            >
              <i className={showCurrent ? 'fa-solid fa-eye' : 'fa-solid fa-eye-slash'}></i>
            </button>
          </div>
        </div>

        <div className="change-password-field">
          <label>Nova Senha</label>
          <div className="change-password-input">
            <input type={showNew ? 'text' : 'password'} />
            <button
              type="button"
              className="change-password-eye"
              aria-label={showNew ? 'Ocultar senha' : 'Mostrar senha'}
              onClick={() => setShowNew((prev) => !prev)}
            >
              <i className={showNew ? 'fa-solid fa-eye' : 'fa-solid fa-eye-slash'}></i>
            </button>
          </div>
          <small>Sua nova senha deve ter pelo menos 8 caracteres.</small>
        </div>

        <div className="change-password-field">
          <label>Confirmar Nova Senha</label>
          <div className="change-password-input">
            <input type={showConfirm ? 'text' : 'password'} />
            <button
              type="button"
              className="change-password-eye"
              aria-label={showConfirm ? 'Ocultar senha' : 'Mostrar senha'}
              onClick={() => setShowConfirm((prev) => !prev)}
            >
              <i className={showConfirm ? 'fa-solid fa-eye' : 'fa-solid fa-eye-slash'}></i>
            </button>
          </div>
        </div>

        <button className="change-password-save" type="button">
          <span>Salvar Alterações</span>
        </button>
      </div>
    </div>
  )
}

export default ChangePasswordModal
