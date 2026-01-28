import React, { useEffect, useState } from 'react'
import './PixPaymentModal.css'

function PixPaymentModal({ isOpen, onClose, onBack, amountValue = 0, transaction = null }) {
  const [isClosing, setIsClosing] = useState(false)
  const [isCopied, setIsCopied] = useState(false)
  const [remainingSeconds, setRemainingSeconds] = useState(0)
  const [initialSeconds, setInitialSeconds] = useState(0)
  
  // Get PIX data from transaction
  const pixCode = transaction?.pixCopyPaste || transaction?.qrCode || ''
  const qrCodeImage = transaction?.qrCodeImage || '/qr-code-temporario.png'
  const expiresAt = transaction?.expiresAt ? new Date(transaction.expiresAt) : null

  useEffect(() => {
    if (isOpen && transaction && expiresAt) {
      setIsClosing(false)
      const now = new Date()
      const diff = Math.max(0, Math.floor((expiresAt - now) / 1000))
      setInitialSeconds(diff)
      setRemainingSeconds(diff)
    } else if (isOpen) {
      // Fallback timer if no expiration date
      const fallbackSeconds = 30 * 60 // 30 minutes
      setInitialSeconds(fallbackSeconds)
      setRemainingSeconds(fallbackSeconds)
    }
  }, [isOpen, transaction, expiresAt])

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

  useEffect(() => {
    if (!isOpen) return
    if (remainingSeconds <= 0) return
    const timer = setInterval(() => {
      setRemainingSeconds((prev) => Math.max(prev - 1, 0))
    }, 1000)
    return () => clearInterval(timer)
  }, [isOpen, remainingSeconds])

  useEffect(() => {
    if (!isCopied) return
    const timer = setTimeout(() => setIsCopied(false), 2500)
    return () => clearTimeout(timer)
  }, [isCopied])

  const handleClose = () => {
    setIsClosing(true)
    setTimeout(() => {
      setIsClosing(false)
      onClose()
    }, 600)
  }

  if (!isOpen && !isClosing) return null

  const formatCurrency = (value) =>
    new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2
    }).format(value)

  const handleCopyPix = async () => {
    try {
      await navigator.clipboard.writeText(pixCode)
      setIsCopied(true)
    } catch (error) {
      // Silently ignore copy errors (e.g. permissions).
    }
  }

  const minutes = Math.floor(remainingSeconds / 60)
  const seconds = remainingSeconds % 60
  const timerLabel = `${minutes}:${String(seconds).padStart(2, '0')}`
  const progress = initialSeconds > 0 ? (remainingSeconds / initialSeconds) * 100 : 0

  return (
    <div className={`pix-modal ${isClosing ? 'is-closing' : ''}`}>
      <div className="pix-header">
        <button className="pix-back" type="button" onClick={onBack} aria-label="Voltar">
          <i className="fa-solid fa-arrow-left"></i>
        </button>
        <span className="pix-title">Pagamento PIX</span>
        <button className="pix-close" type="button" onClick={handleClose} aria-label="Fechar">
          <i className="fa-solid fa-xmark"></i>
        </button>
      </div>

      <div className="pix-content">
        <div className="pix-alert">
          <i className="fa-solid fa-circle-exclamation"></i>
          <span>Saldo creditado automaticamente após o pagamento</span>
        </div>

        <div className="pix-shell">
          <div className="pix-qr-card">
            <div className="pix-qr-wrapper">
              <span className="pix-qr-badge">
                <i className="fa-solid fa-qrcode"></i>
              </span>
              {qrCodeImage ? (
                <img src={qrCodeImage} alt="QR Code PIX" />
              ) : (
                <div className="pix-qr-placeholder">
                  <i className="fa-solid fa-qrcode"></i>
                  <span>Gerando QR Code...</span>
                </div>
              )}
            </div>

            <div className="pix-code-section">
              {pixCode ? (
                <>
                  <div className="pix-code">
                    {pixCode}
                  </div>
                  <button
                    className={`pix-copy${isCopied ? ' copied' : ''}`}
                    type="button"
                    onClick={handleCopyPix}
                  >
                    <i className={`fa-solid ${isCopied ? 'fa-check' : 'fa-copy'}`}></i>
                    {isCopied ? 'Código copiado' : 'Copiar Código PIX'}
                  </button>
                </>
              ) : (
                <div className="pix-code-loading">
                  <i className="fa-solid fa-spinner fa-spin"></i>
                  <span>Gerando código PIX...</span>
                </div>
              )}
              {isCopied && (
                <div className="pix-copy-popup" role="status">
                  <span className="pix-copy-icon">✓</span>
                  <span>Código PIX copiado!</span>
                  <span className="pix-copy-timer" />
                </div>
              )}
            </div>
          </div>

          <div className="pix-info-card">
            <div className="pix-info-row">
              <span className="pix-info-label">
                <i className="fa-solid fa-money-bill-wave"></i>
                Valor
              </span>
              <strong className="pix-info-value">{formatCurrency(amountValue)}</strong>
            </div>
            <div className="pix-info-row">
              <span className="pix-info-label">
                <i className="fa-solid fa-clock"></i>
                Status
              </span>
              <strong className="pix-info-value pix-status">Pendente</strong>
            </div>
            <div className="pix-info-row pix-info-row-timer">
              <div className="pix-info-timer">
                <span className="pix-info-label">
                  <i className="fa-solid fa-hourglass-half"></i>
                  Tempo restante
                </span>
                <strong className="pix-info-value pix-timer">{timerLabel}</strong>
              </div>
              <div className="pix-timer-bar">
                <span style={{ width: `${progress}%` }} />
              </div>
            </div>
          </div>
        </div>

        <button className="pix-back-btn" type="button" onClick={onBack}>
          <i className="fa-solid fa-arrow-left"></i>
          Voltar
        </button>
      </div>
    </div>
  )
}

export default PixPaymentModal
