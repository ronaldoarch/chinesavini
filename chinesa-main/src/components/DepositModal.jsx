import React, { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import api from '../services/api'
import './DepositModal.css'

function DepositModal({ isOpen, onClose, showCpfField = true, onConfirmDeposit, onOpenHistory }) {
  const { updateUser } = useAuth()
  const [isClosing, setIsClosing] = useState(false)
  const [selectedAmountId, setSelectedAmountId] = useState(null)
  const [depositAmount, setDepositAmount] = useState('')
  const [cpfValue, setCpfValue] = useState('')
  const [showCpfError, setShowCpfError] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

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

  useEffect(() => {
    if (!showCpfError) return
    const timer = setTimeout(() => setShowCpfError(false), 2500)
    return () => clearTimeout(timer)
  }, [showCpfError])

  const handleClose = () => {
    setIsClosing(true)
    setTimeout(() => {
      setIsClosing(false)
      onClose()
    }, 600)
  }

  if (!isOpen && !isClosing) return null

  const quickAmounts = [
    { id: 1, value: 'R$ 10', amount: 10, bonusPercent: 0 },
    { id: 2, value: 'R$ 20', amount: 20, bonusPercent: 2 },
    { id: 3, value: 'R$ 30', amount: 30, bonusPercent: 2 },
    { id: 4, value: 'R$ 40', amount: 40, bonusPercent: 2 },
    { id: 5, value: 'R$ 50', amount: 50, bonusPercent: 5 },
    { id: 6, value: 'R$ 75', amount: 75, bonusPercent: 5 },
    { id: 7, value: 'R$ 100', amount: 100, bonusPercent: 10, full: true }
  ]

  const handleQuickAmountClick = (amountId, amount) => {
    setSelectedAmountId(amountId)
    setDepositAmount(String(amount))
  }

  const handleDepositInputChange = (event) => {
    const rawValue = event.target.value
    let hasSeparator = false
    let sanitized = ''
    let decimalDigits = 0

    for (const char of rawValue) {
      if (/\d/.test(char)) {
        if (!hasSeparator || decimalDigits < 2) {
          sanitized += char
          if (hasSeparator) {
            decimalDigits += 1
          }
        }
        continue
      }
      if ((char === '.' || char === ',') && !hasSeparator) {
        sanitized += char
        hasSeparator = true
      }
    }

    const normalized = sanitized.replace(',', '.')
    const numericValue = Number.parseFloat(normalized || '0')
    if (!Number.isNaN(numericValue) && numericValue > 10000) {
      setDepositAmount('10000')
    } else {
      setDepositAmount(sanitized)
    }
    setSelectedAmountId(null)
  }

  const formatCpf = (value) => {
    const digits = value.replace(/\D/g, '').slice(0, 11)
    if (digits.length <= 3) return digits
    if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`
    if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`
  }

  const handleCpfChange = (event) => {
    setCpfValue(formatCpf(event.target.value))
    if (showCpfError) {
      setShowCpfError(false)
    }
  }

  const normalizedAmount = depositAmount.replace(',', '.')
  const parsedAmount = Number.parseFloat(normalizedAmount || '0') || 0
  const amountValue = Math.min(parsedAmount, 10000)
  const selectedAmount = quickAmounts.find((amount) => amount.id === selectedAmountId)
  const matchedAmount = quickAmounts.find((amount) => amount.amount === amountValue)
  const bonusPercent = selectedAmount
    ? selectedAmount.bonusPercent
    : (amountValue > 100 ? 10 : (matchedAmount ? matchedAmount.bonusPercent : 0))
  const bonusAmount = amountValue * (bonusPercent / 100)
  const totalAmount = amountValue + bonusAmount

  const formatCurrency = (value) =>
    new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2
    }).format(value)

  const handleConfirmDeposit = async () => {
    if (amountValue < 10 || amountValue > 10000) {
      setError('Valor deve estar entre R$ 10,00 e R$ 10.000,00')
      return
    }
    
    const cpfDigits = cpfValue.replace(/\D/g, '')
    if (showCpfField && cpfDigits.length < 11) {
      setShowCpfError(true)
      return
    }
    
    setShowCpfError(false)
    setError(null)
    setLoading(true)
    
    try {
      const response = await api.createDeposit({
        amount: amountValue,
        cpf: cpfValue
      })
      
      if (response.success && onConfirmDeposit) {
        // Pass transaction data to parent
        onConfirmDeposit({
          amountValue,
          cpfValue,
          transaction: response.data.transaction
        })
      } else {
        setError(response.message || 'Erro ao criar depósito')
      }
    } catch (err) {
      setError(err.message || 'Erro ao criar depósito')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={`deposit-modal ${isClosing ? 'is-closing' : ''}`}>
      <div className="deposit-header">
        <button
          className="deposit-history"
          type="button"
          aria-label="Ver histórico de depósitos"
          onClick={onOpenHistory}
        >
          <i className="fa-solid fa-rotate-left"></i>
        </button>
        <span className="deposit-title">Depósito</span>
        <button className="deposit-close" type="button" onClick={handleClose} aria-label="Fechar">
          <i className="fa-solid fa-xmark"></i>
        </button>
      </div>

      <div className="deposit-content">
        <div className="deposit-methods">
          <button className="deposit-method active" type="button">
            <img src="/pix.png" alt="PIX" className="deposit-method-icon" />
            <span>PIX-A</span>
          </button>
        </div>

        <hr className="deposit-divider" />

        <div className="deposit-box">
          <div className="quick-amounts">
            {quickAmounts.map((amount) => (
              <div key={amount.id} className={`quick-amount-wrapper${amount.full ? ' full' : ''}`}>
                {amount.bonusPercent > 0 && <span className="bonus-badge">+{amount.bonusPercent}%</span>}
                <button
                  type="button"
                  className={`quick-amount-btn${selectedAmountId === amount.id ? ' selected' : ''}`}
                  onClick={() => handleQuickAmountClick(amount.id, amount.amount)}
                >
                  {amount.value}
                </button>
              </div>
            ))}
          </div>

          <div className="deposit-input-container">
            <span className="currency-symbol">R$</span>
            <input
              type="text"
              className="deposit-input"
              placeholder="0,00"
              inputMode="numeric"
              value={depositAmount}
              onChange={handleDepositInputChange}
            />
          </div>

          <div className="deposit-limits">
            Min: R$ 10,00 - Max: R$ 10.000,00
          </div>

          {amountValue > 0 && showCpfField && (
            <div className="cpf-container">
              <label htmlFor="userCpf" className="cpf-label">
                CPF <span className="cpf-required">*</span>
              </label>
              <input
                type="text"
                className="cpf-input form-control bg-surface-deep text-white border-theme"
                id="userCpf"
                name="userCpf"
                placeholder="000.000.000-00"
                maxLength={14}
                inputMode="numeric"
                value={cpfValue}
                onChange={handleCpfChange}
              />
              <small className="cpf-hint">
                <i className="fa-solid fa-shield-halved"></i>
                <span>O CPF é obrigatório e utilizado exclusivamente para processar o pagamento.</span>
              </small>
              {showCpfError && (
                <button
                  type="button"
                  className="cpf-error"
                  role="alert"
                  onClick={() => setShowCpfError(false)}
                >
                  <span className="cpf-error-icon">×</span>
                  <span>Por favor, informe um CPF válido.</span>
                  <span className="cpf-error-timer" />
                </button>
              )}
            </div>
          )}

          {amountValue > 0 && bonusPercent > 0 && (
            <div className="bonus-info">
              <div className="bonus-details">
                <div className="bonus-line">
                  <span>Depósito:</span>
                  <strong>{formatCurrency(amountValue)}</strong>
                </div>
                {bonusPercent > 0 && (
                  <>
                    <div className="bonus-line bonus-row">
                      <span className="bonus-label">
                        <i className="fa-solid fa-plus-circle"></i>
                        Bônus: <span>{bonusPercent}%</span>
                      </span>
                      <strong>{formatCurrency(bonusAmount)}</strong>
                    </div>
                    <div className="bonus-divider" />
                  </>
                )}
                <div className="bonus-line total-row">
                  <span>Total a receber:</span>
                  <strong>{formatCurrency(totalAmount)}</strong>
                </div>
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className="deposit-error-message">
            <i className="fa-solid fa-circle-exclamation"></i>
            <span>{error}</span>
          </div>
        )}
        
        <button
          type="button"
          className="confirm-deposit"
          onClick={handleConfirmDeposit}
          disabled={loading}
        >
          {loading ? (
            <>
              <i className="fa-solid fa-spinner fa-spin"></i>
              <span>Processando...</span>
            </>
          ) : (
            'Confirmar Depósito'
          )}
        </button>
      </div>
    </div>
  )
}

export default DepositModal
