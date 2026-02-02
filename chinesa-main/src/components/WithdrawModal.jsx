import React, { useEffect, useRef, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import './WithdrawModal.css'

function WithdrawModal({ isOpen, onClose, onBack, initialTab = 'saque' }) {
  const { user } = useAuth()
  const [isClosing, setIsClosing] = useState(false)
  const [activeTab, setActiveTab] = useState(initialTab)
  const [showAccountForm, setShowAccountForm] = useState(false)
  const [pixKeyType, setPixKeyType] = useState('CPF')
  const [withdrawAmount, setWithdrawAmount] = useState('')
  const [showWithdrawPassword, setShowWithdrawPassword] = useState(false)
  const [showPinValue, setShowPinValue] = useState(false)
  const [pixAccounts, setPixAccounts] = useState([])
  const pinRefs = useRef([])
  const formatWithdrawAmount = (value) => {
    const trimmed = value.trim()
    if (trimmed === '') return ''
    if (trimmed.includes(',')) {
      const [whole, fraction = ''] = trimmed.split(',')
      const normalizedFraction = fraction.padEnd(2, '0').slice(0, 2)
      return `${whole},${normalizedFraction}`
    }
    return `${trimmed},00`
  }
  const formattedWithdrawAmount = withdrawAmount.trim() === '' ? 'R$ 0,00' : `R$ ${formatWithdrawAmount(withdrawAmount)}`

  useEffect(() => {
    if (isOpen) {
      setIsClosing(false)
      setActiveTab(initialTab)
      setShowAccountForm(false)
      setPixKeyType('CPF')
      setWithdrawAmount('')
      setShowWithdrawPassword(false)
      setShowPinValue(false)
      pinRefs.current = []
    }
  }, [isOpen, initialTab])

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
    <div className={`withdraw-modal ${isClosing ? 'is-closing' : ''}`}>
      <div className="withdraw-header">
        <button className="withdraw-back" type="button" onClick={handleBack} aria-label="Voltar">
          <i className="fa-solid fa-arrow-left"></i>
        </button>
        <div className="withdraw-tabs">
          <button
            type="button"
            className={`withdraw-tab ${activeTab === 'saque' ? 'active' : ''}`}
            onClick={() => setActiveTab('saque')}
          >
            <i className="fa-solid fa-wallet"></i>
            <span>Saque</span>
          </button>
          <button
            type="button"
            className={`withdraw-tab ${activeTab === 'contas' ? 'active' : ''}`}
            onClick={() => setActiveTab('contas')}
          >
            <i className="fa-solid fa-user"></i>
            <span>Contas</span>
          </button>
          <button
            type="button"
            className={`withdraw-tab ${activeTab === 'historico' ? 'active' : ''}`}
            onClick={() => setActiveTab('historico')}
          >
            <i className="fa-solid fa-clock-rotate-left"></i>
            <span>Histórico</span>
          </button>
        </div>
        <button className="withdraw-close" type="button" onClick={handleClose} aria-label="Fechar">
          <i className="fa-solid fa-xmark"></i>
        </button>
      </div>

      <div className="withdraw-content">
        {activeTab === 'saque' && !showWithdrawPassword && (
          <>
            <div className="withdraw-alert">
              <i className="fa-solid fa-circle-exclamation"></i>
              <span>
                Você precisa cadastrar uma conta PIX para receber seus saques.{' '}
                <button type="button" onClick={() => setActiveTab('contas')}>
                  Cadastrar agora
                </button>
              </span>
            </div>

            <div className="withdraw-card">
              <div className="withdraw-balance">
                <span>Saldo para saque</span>
                <strong>
                  {(user?.withdrawableBalance ?? user?.balance ?? 0) >= 0
                    ? new Intl.NumberFormat('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                        minimumFractionDigits: 2
                      }).format(user?.withdrawableBalance ?? user?.balance ?? 0)
                    : 'R$ 0,00'}
                </strong>
                {(user?.bonusBalance ?? 0) > 0 && (
                  <small className="withdraw-bonus-note">
                    Bônus ({new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(user.bonusBalance || 0)}) é para jogar, não pode ser sacado.
                  </small>
                )}
              </div>

              <div className="withdraw-field-withdraw">
                <label>Valor do Saque</label>
                <div className="withdraw-input">
                  <span className="withdraw-currency">R$</span>
                  <input
                    type="text"
                    placeholder="0,00"
                    value={withdrawAmount}
                    onChange={(event) => setWithdrawAmount(event.target.value)}
                    onBlur={() => {
                      if (withdrawAmount.trim() !== '') {
                        setWithdrawAmount((prev) => formatWithdrawAmount(prev))
                      }
                    }}
                  />
                </div>
                <small>Min: R$ 10,00 - Max: R$ 5.000,00</small>
              </div>

              {withdrawAmount.trim() !== '' && (
                <div className="withdraw-summary">
                  <div className="withdraw-summary-card">
                    <div className="withdraw-summary-header">
                      <span>Conta para recebimento:</span>
                      <button
                        type="button"
                        className="withdraw-summary-edit"
                        onClick={() => setActiveTab('contas')}
                      >
                        <i className="fa-solid fa-pen-to-square"></i>
                        <span>Alterar</span>
                      </button>
                    </div>
                    <div className="withdraw-summary-row">
                      <span>Nome:</span>
                      <strong>{pixAccounts.length > 0 ? (pixAccounts[0].name || pixAccounts[0].holderName || 'Conta PIX') : 'Cadastre uma conta na aba Contas'}</strong>
                    </div>
                    <div className="withdraw-summary-row">
                      <span>Chave {pixAccounts.length > 0 ? (pixAccounts[0].pixKeyType || pixAccounts[0].type || '') : ''}:</span>
                      <strong>{pixAccounts.length > 0 ? (pixAccounts[0].pixKey || pixAccounts[0].key || '—') : '—'}</strong>
                    </div>
                  </div>

                  <div className="withdraw-summary-card">
                    <div className="withdraw-summary-row">
                      <span>Valor solicitado:</span>
                        <strong>{formattedWithdrawAmount}</strong>
                    </div>
                    <div className="withdraw-summary-row">
                      <span style={{ fontWeight: '600' }}>Total a receber:</span>
                        <strong>{formattedWithdrawAmount}</strong>
                    </div>
                  </div>
                </div>
              )}

              <button
                type="button"
                className={`withdraw-request${withdrawAmount.trim() !== '' ? ' is-active' : ''}`}
                onClick={() => setShowWithdrawPassword(true)}
              >
                <i className="fa-solid fa-wallet"></i>
                <span>Solicitar Saque</span>
              </button>

              <div className="withdraw-form-actions">
                <button type="button" className="withdraw-back-btn">
                  <i className="fa-solid fa-arrow-left"></i>
                  <span>Voltar</span>
                </button>
                <button type="button" className="withdraw-save-btn">
                  <i className="fa-solid fa-check"></i>
                  <span>Confirmar Saque</span>
                </button>
              </div>
            </div>
          </>
        )}

        {activeTab === 'saque' && showWithdrawPassword && (
          <div className="withdraw-password">
            <div className="withdraw-password-alert">
              <i className="fa-solid fa-shield-halved"></i>
              <span>Digite sua senha de saque para confirmar a transação.</span>
            </div>

            <div className="withdraw-summary-card">
              <div className="withdraw-summary-row">
                <span>Valor solicitado:</span>
                <strong>{formattedWithdrawAmount}</strong>
              </div>
              <div className="withdraw-summary-row">
                <span>Taxa:</span>
                <strong style={{ color: '#fb010b', fontWeight: '500' }}>R$ 0,00</strong>
              </div>
              <div className="withdraw-summary-row">
                <span style={{ fontWeight: '600' }}>Valor a receber:</span>
                <strong>{formattedWithdrawAmount}</strong>
              </div>
            </div>

            <div className="withdraw-field">
              <label>Senha de Saque</label>
              <button
                type="button"
                className="withdraw-pin-toggle"
                aria-label={showPinValue ? 'Ocultar senha' : 'Mostrar senha'}
                onClick={() => setShowPinValue((prev) => !prev)}
              >
                <i className={showPinValue ? 'fa-solid fa-eye' : 'fa-solid fa-eye-slash'}></i>
              </button>
            </div>
              <div className="withdraw-pin-row">
                {Array.from({ length: 6 }).map((_, index) => (
                  <input
                    key={`pin-${index}`}
                    type={showPinValue ? 'text' : 'password'}
                    inputMode="numeric"
                    maxLength={1}
                    ref={(el) => {
                      pinRefs.current[index] = el
                    }}
                    onChange={(event) => {
                      if (event.target.value && index < 5) {
                        pinRefs.current[index + 1]?.focus()
                      }
                    }}
                    onKeyDown={(event) => {
                      if (event.key === 'Backspace' && !event.currentTarget.value && index > 0) {
                        pinRefs.current[index - 1]?.focus()
                      }
                    }}
                  />
                ))}
                
              
            </div>

            <div className="withdraw-form-actions">
              <button type="button" className="withdraw-back-btn" onClick={() => setShowWithdrawPassword(false)}>
                <i className="fa-solid fa-arrow-left"></i>
                <span>Voltar</span>
              </button>
              <button type="button" className="withdraw-save-btn">
                <i className="fa-solid fa-check"></i>
                <span>Confirmar Saque</span>
              </button>
            </div>
          </div>
        )}

        {activeTab === 'contas' && (
          <div className="withdraw-accounts">
            <div className="withdraw-accounts-header">
              <span>Contas PIX Cadastradas</span>
              {!showAccountForm && (
                <button
                  type="button"
                  className="withdraw-add-account"
                  onClick={() => setShowAccountForm(true)}
                >
                  <i className="fa-solid fa-plus"></i>
                  <span>Nova Conta PIX</span>
                </button>
              )}
            </div>

            {!showAccountForm && (
              <>
                {pixAccounts.length > 0 ? (
                  pixAccounts.map((account) => (
                    <div key={account.id || account._id} className="withdraw-accounts-card">
                      <div className="withdraw-accounts-card-header">
                        <span className="withdraw-account-name">{account.name || account.holderName || 'Conta PIX'}</span>
                        <span className="withdraw-account-status">{account.active !== false ? 'Ativa' : 'Inativa'}</span>
                        <button type="button" className="withdraw-account-trash" aria-label="Remover conta">
                          <i className="fa-solid fa-trash"></i>
                        </button>
                      </div>
                      <div className="withdraw-accounts-card-row">
                        <span>Tipo:</span>
                        <strong>{account.pixKeyType || account.type || '—'}</strong>
                      </div>
                      <div className="withdraw-accounts-card-row">
                        <span>Chave:</span>
                        <strong>{account.pixKey || account.key || '—'}</strong>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="withdraw-empty-card">
                    <i className="fa-solid fa-circle-info"></i>
                    <span>Você ainda não possui contas PIX cadastradas.</span>
                  </div>
                )}
              </>
            )}

            {showAccountForm && (
              <div className="withdraw-form">
                <div className="withdraw-field">
                  <label>Nome Completo</label>
                  <div className="withdraw-input">
                    <i className="fa-solid fa-user"></i>
                    <input type="text" placeholder="Nome do titular da conta" />
                  </div>
                  <small>Digite o nome exatamente como consta no seu banco.</small>
                </div>

                <div className="withdraw-field">
                  <label>Tipo de Chave PIX</label>
                  <div className="withdraw-select">
                    <select value={pixKeyType} onChange={(event) => setPixKeyType(event.target.value)}>
                      <option>CPF</option>
                      <option>Email</option>
                      <option>Telefone</option>
                      <option>Chave aleatória</option>
                    </select>
                    <i className="fa-solid fa-chevron-down"></i>
                  </div>
                </div>

                <div className="withdraw-field">
                  <label>Chave PIX</label>
                  <div className="withdraw-input">
                    <i className="fa-solid fa-key"></i>
                    <input type="text" placeholder="Digite sua chave PIX" />
                  </div>
                  <small>
                    {pixKeyType === 'CPF' && 'Digite apenas os números do CPF (11 dígitos).'}
                    {pixKeyType === 'Email' && 'Digite o e-mail completo (deve ser válido).'}
                    {pixKeyType === 'Telefone' && 'Digite o número com DDD, sem espaços ou símbolos (11 dígitos).'}
                    {pixKeyType === 'Chave aleatória' && 'Digite a chave aleatória completa.'}
                  </small>
                </div>

                <div className="withdraw-form-actions">
                  <button type="button" className="withdraw-back-btn" onClick={() => setShowAccountForm(false)}>
                    <i className="fa-solid fa-arrow-left"></i>
                    <span>Voltar</span>
                  </button>
                  <button type="button" className="withdraw-save-btn">
                    <i className="fa-solid fa-floppy-disk"></i>
                    <span>Salvar Conta PIX</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'historico' && (
          <div className="withdraw-history-empty">
            <i className="fa-solid fa-wallet"></i>
            <span>Você ainda não possui saques registrados.</span>
          </div>
        )}
      </div>
    </div>
  )
}

export default WithdrawModal
