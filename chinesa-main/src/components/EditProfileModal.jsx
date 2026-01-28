import React, { useEffect, useState } from 'react'
import './EditProfileModal.css'

function EditProfileModal({ isOpen, onClose, onBack }) {
  const [isClosing, setIsClosing] = useState(false)
  const [whatsappValue, setWhatsappValue] = useState('')

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

  const handleWhatsappChange = (event) => {
    const digits = event.target.value.replace(/\D/g, '').slice(0, 11)
    const ddd = digits.slice(0, 2)
    const prefix = digits.slice(2, 7)
    const suffix = digits.slice(7, 11)
    let formatted = ''

    if (ddd) {
      formatted = `(${ddd}`
      if (ddd.length === 2) formatted += ') '
    }

    if (prefix) {
      formatted += prefix
    }

    if (suffix) {
      formatted += `-${suffix}`
    }

    setWhatsappValue(formatted)
  }

  if (!isOpen && !isClosing) return null

  return (
    <div className={`edit-profile-modal ${isClosing ? 'is-closing' : ''}`}>
      <div className="edit-profile-header">
        <button className="edit-profile-back" type="button" onClick={handleBack} aria-label="Voltar">
          <i className="fa-solid fa-arrow-left"></i>
        </button>
        <span className="edit-profile-title">Editar Dados</span>
        <button className="edit-profile-close" type="button" onClick={handleClose} aria-label="Fechar">
          <i className="fa-solid fa-xmark"></i>
        </button>
      </div>

      <div className="edit-profile-content">
        <div className="edit-profile-field">
          <div className="edit-profile-input">
            <i className="fa-solid fa-user"></i>
            <input type="text" placeholder="Digite seu nome completo" />
          </div>
        </div>

        <div className="edit-profile-field">
          <div className="edit-profile-input">
            <i className="fa-solid fa-calendar-days"></i>
            <input type="date" placeholder="dd/mm/aaaa" />
          </div>
        </div>

        <div className="edit-profile-field">
          <div className="edit-profile-input">
            <i className="fa-brands fa-instagram"></i>
            <input type="text" placeholder="@username ou URL completa" />
          </div>
        </div>

        <div className="edit-profile-field">
          <div className="edit-profile-input">
            <i className="fa-brands fa-facebook-f"></i>
            <input type="text" placeholder="username ou URL completa" />
          </div>
        </div>

        <div className="edit-profile-field">
          <div className="edit-profile-input">
            <i className="fa-brands fa-whatsapp"></i>
            <input
              type="tel"
              inputMode="numeric"
              placeholder="(00) 00000-0000"
              value={whatsappValue}
              onChange={handleWhatsappChange}
            />
          </div>
        </div>

        <div className="edit-profile-field">
          <div className="edit-profile-input">
            <i className="fa-brands fa-telegram"></i>
            <input type="text" placeholder="@username" />
          </div>
        </div>

        <button className="edit-profile-save" type="button">
          <i className="fa-solid fa-floppy-disk"></i>
          <span>Salvar Dados</span>
        </button>
      </div>
    </div>
  )
}

export default EditProfileModal
