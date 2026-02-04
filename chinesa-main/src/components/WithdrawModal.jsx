import React, { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import api from '../services/api'
import './WithdrawModal.css'

function WithdrawModal({ isOpen, onClose, onBack, initialTab = 'saque', onWithdrawSuccess }) {
  const { user } = useAuth()
  const [isClosing, setIsClosing] = useState(false)
  const [activeTab, setActiveTab] = useState(initialTab)
  const [showAccountForm, setShowAccountForm] = useState(false)
  const [pixKeyType, setPixKeyType] = useState('CPF')
  
  // Função para mapear tipo de chave para exibição
  const getPixKeyTypeLabel = (type) => {
    const labels = {
      'CPF': 'CPF',
      'CNPJ': 'CNPJ',
      'PHONE': 'Telefone',
      'EMAIL': 'Email',
      'RANDOM': 'Chave aleatória'
    }
    return labels[type] || type
  }
  const [withdrawAmount, setWithdrawAmount] = useState('')
  const [pixAccounts, setPixAccounts] = useState([])
  const [holderName, setHolderName] = useState('')
  const [pixKey, setPixKey] = useState('')
  const [loadingAccounts, setLoadingAccounts] = useState(false)
  const [savingAccount, setSavingAccount] = useState(false)
  const [accountError, setAccountError] = useState('')
  const [accountSuccess, setAccountSuccess] = useState('')
  const [processingWithdraw, setProcessingWithdraw] = useState(false)
  const [withdrawError, setWithdrawError] = useState('')
  const [withdrawSuccess, setWithdrawSuccess] = useState('')
  const [minWithdraw, setMinWithdraw] = useState(20)
  const [maxWithdraw, setMaxWithdraw] = useState(5000)
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
      setHolderName('')
      setPixKey('')
      setAccountError('')
      setAccountSuccess('')
      setWithdrawError('')
      setWithdrawSuccess('')
    }
  }, [isOpen, initialTab])

  const loadPixAccounts = async () => {
    try {
      setLoadingAccounts(true)
      const response = await api.getPixAccounts()
      if (response.success) {
        setPixAccounts(response.data || [])
      }
    } catch (error) {
      console.error('Error loading PIX accounts:', error)
    } finally {
      setLoadingAccounts(false)
    }
  }

  // Carregar contas PIX e limites sempre que o modal abrir ou quando mudar de aba
  useEffect(() => {
    if (isOpen) {
      loadPixAccounts()
      loadWithdrawLimits()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, activeTab])

  const loadWithdrawLimits = async () => {
    try {
      const response = await api.getBonusConfig()
      if (response.success && response.data) {
        const config = response.data
        if (config.minWithdraw != null) setMinWithdraw(Number(config.minWithdraw) || 20)
        if (config.maxWithdraw != null) setMaxWithdraw(Number(config.maxWithdraw) || 5000)
      }
    } catch (error) {
      console.error('Error loading withdraw limits:', error)
    }
  }

  const handleSaveAccount = async () => {
    // Validação básica
    if (!holderName.trim()) {
      setAccountError('Nome do titular é obrigatório')
      return
    }
    if (!pixKey.trim()) {
      setAccountError('Chave PIX é obrigatória')
      return
    }

    // Validação específica por tipo
    if (pixKeyType === 'CPF') {
      const digits = pixKey.replace(/\D/g, '')
      if (digits.length !== 11) {
        setAccountError('CPF deve ter 11 dígitos')
        return
      }
    } else if (pixKeyType === 'CNPJ') {
      const digits = pixKey.replace(/\D/g, '')
      if (digits.length !== 14) {
        setAccountError('CNPJ deve ter 14 dígitos')
        return
      }
    } else if (pixKeyType === 'EMAIL') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(pixKey)) {
        setAccountError('Email inválido')
        return
      }
    } else if (pixKeyType === 'PHONE') {
      const digits = pixKey.replace(/\D/g, '')
      if (digits.length !== 11) {
        setAccountError('Telefone deve ter 11 dígitos (com DDD)')
        return
      }
    } else if (pixKeyType === 'RANDOM') {
      if (pixKey.length < 32 || pixKey.length > 77) {
        setAccountError('Chave aleatória deve ter entre 32 e 77 caracteres')
        return
      }
    }

    try {
      setSavingAccount(true)
      setAccountError('')
      setAccountSuccess('')

      const response = await api.createPixAccount({
        holderName: holderName.trim(),
        pixKeyType,
        pixKey: pixKey.trim()
      })

      if (response.success) {
        setAccountSuccess('Conta PIX cadastrada com sucesso!')
        setHolderName('')
        setPixKey('')
        setPixKeyType('CPF')
        // Recarregar contas
        await loadPixAccounts()
        // Fechar formulário após 1 segundo
        setTimeout(() => {
          setShowAccountForm(false)
          setAccountSuccess('')
        }, 1500)
      }
    } catch (error) {
      console.error('Error saving PIX account:', error)
      setAccountError(error.message || 'Erro ao cadastrar conta PIX')
    } finally {
      setSavingAccount(false)
    }
  }

  const handleDeleteAccount = async (accountId) => {
    if (!window.confirm('Tem certeza que deseja remover esta conta PIX?')) {
      return
    }

    try {
      const response = await api.deletePixAccount(accountId)
      if (response.success) {
        // Recarregar contas
        await loadPixAccounts()
      }
    } catch (error) {
      console.error('Error deleting PIX account:', error)
      alert(error.message || 'Erro ao remover conta PIX')
    }
  }

  const handleWithdraw = async () => {
    // Validações
    if (!withdrawAmount.trim()) {
      setWithdrawError('Digite o valor do saque')
      return
    }

    if (pixAccounts.length === 0) {
      setWithdrawError('Você precisa cadastrar uma conta PIX primeiro')
      return
    }

    const amount = parseFloat(withdrawAmount.replace(',', '.'))
    if (isNaN(amount) || amount < minWithdraw || amount > maxWithdraw) {
      setWithdrawError(`Valor deve estar entre R$ ${minWithdraw.toFixed(2)} e R$ ${maxWithdraw.toFixed(2)}`)
      return
    }

    const selectedAccount = pixAccounts[0]
    if (!selectedAccount) {
      setWithdrawError('Selecione uma conta PIX')
      return
    }

    // CPF será usado apenas se disponível, caso contrário o backend usará CPF genérico
    let cpf = null
    
    // Se o tipo de chave for CPF, usar a própria chave como CPF
    if (selectedAccount.pixKeyType === 'CPF') {
      const digits = selectedAccount.pixKey.replace(/\D/g, '')
      if (digits.length === 11) {
        cpf = `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`
      }
    }
    
    // Se não conseguiu CPF da chave, tentar obter do usuário (opcional)
    if (!cpf) {
      if (user?.cpf) {
        cpf = user.cpf
      } else if (user?.document) {
        cpf = user.document
      }
      // Se não tiver CPF, o backend usará o CPF genérico configurado
    }

    try {
      setProcessingWithdraw(true)
      setWithdrawError('')
      setWithdrawSuccess('')

      const response = await api.createWithdraw({
        amount: amount.toFixed(2),
        pixKey: selectedAccount.pixKey,
        pixKeyType: selectedAccount.pixKeyType,
        cpf: cpf,
        holderName: selectedAccount.holderName || user?.username || 'Usuário'
      })

      if (response.success) {
        setWithdrawSuccess('Saque solicitado com sucesso!')
        setWithdrawAmount('')
        // Chamar callback de sucesso se fornecido
        if (onWithdrawSuccess) {
          setTimeout(() => {
            onWithdrawSuccess(amount)
          }, 500)
        } else {
          // Fallback: fechar modal após 2 segundos
          setTimeout(() => {
            handleClose()
          }, 2000)
        }
      }
    } catch (error) {
      console.error('Error processing withdrawal:', error)
      setWithdrawError(error.message || 'Erro ao processar saque')
    } finally {
      setProcessingWithdraw(false)
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
        {activeTab === 'saque' && (
          <>
            {withdrawError && (
              <div style={{ 
                padding: '12px', 
                backgroundColor: '#ff4444', 
                color: 'white', 
                borderRadius: '8px', 
                marginBottom: '16px',
                fontSize: '14px'
              }}>
                {withdrawError}
              </div>
            )}
            {withdrawSuccess && (
              <div style={{ 
                padding: '12px', 
                backgroundColor: '#4caf50', 
                color: 'white', 
                borderRadius: '8px', 
                marginBottom: '16px',
                fontSize: '14px'
              }}>
                {withdrawSuccess}
              </div>
            )}

            {pixAccounts.length === 0 && (
              <div className="withdraw-alert">
                <i className="fa-solid fa-circle-exclamation"></i>
                <span>
                  Você precisa cadastrar uma conta PIX para receber seus saques.{' '}
                  <button type="button" onClick={() => setActiveTab('contas')}>
                    Cadastrar agora
                  </button>
                </span>
              </div>
            )}

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
                <small>Min: R$ {minWithdraw.toFixed(2)} - Max: R$ {maxWithdraw.toFixed(2)}</small>
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
                      <span>Chave {pixAccounts.length > 0 ? getPixKeyTypeLabel(pixAccounts[0].pixKeyType || pixAccounts[0].type) : ''}:</span>
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
                className={`withdraw-request${withdrawAmount.trim() !== '' && pixAccounts.length > 0 ? ' is-active' : ''}`}
                onClick={handleWithdraw}
                disabled={processingWithdraw || withdrawAmount.trim() === '' || pixAccounts.length === 0}
              >
                <i className="fa-solid fa-wallet"></i>
                <span>{processingWithdraw ? 'Processando...' : 'Solicitar Saque'}</span>
              </button>
            </div>
          </>
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
                {loadingAccounts ? (
                  <div className="withdraw-empty-card">
                    <i className="fa-solid fa-spinner fa-spin"></i>
                    <span>Carregando contas PIX...</span>
                  </div>
                ) : pixAccounts.length > 0 ? (
                  pixAccounts.map((account) => (
                    <div key={account.id || account._id} className="withdraw-accounts-card">
                      <div className="withdraw-accounts-card-header">
                        <span className="withdraw-account-name">{account.name || account.holderName || 'Conta PIX'}</span>
                        <span className="withdraw-account-status">{account.active !== false ? 'Ativa' : 'Inativa'}</span>
                        <button 
                          type="button" 
                          className="withdraw-account-trash" 
                          aria-label="Remover conta"
                          onClick={() => handleDeleteAccount(account._id || account.id)}
                        >
                          <i className="fa-solid fa-trash"></i>
                        </button>
                      </div>
                      <div className="withdraw-accounts-card-row">
                        <span>Tipo:</span>
                        <strong>{getPixKeyTypeLabel(account.pixKeyType || account.type) || '—'}</strong>
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
                {accountError && (
                  <div style={{ 
                    padding: '12px', 
                    backgroundColor: '#ff4444', 
                    color: 'white', 
                    borderRadius: '8px', 
                    marginBottom: '16px',
                    fontSize: '14px'
                  }}>
                    {accountError}
                  </div>
                )}
                {accountSuccess && (
                  <div style={{ 
                    padding: '12px', 
                    backgroundColor: '#4caf50', 
                    color: 'white', 
                    borderRadius: '8px', 
                    marginBottom: '16px',
                    fontSize: '14px'
                  }}>
                    {accountSuccess}
                  </div>
                )}
                <div className="withdraw-field">
                  <label>Nome Completo</label>
                  <div className="withdraw-input">
                    <i className="fa-solid fa-user"></i>
                    <input 
                      type="text" 
                      placeholder="Nome do titular da conta" 
                      value={holderName}
                      onChange={(e) => setHolderName(e.target.value)}
                    />
                  </div>
                  <small>Digite o nome exatamente como consta no seu banco.</small>
                </div>

                <div className="withdraw-field">
                  <label>Tipo de Chave PIX</label>
                  <div className="withdraw-select">
                    <select value={pixKeyType} onChange={(event) => {
                      setPixKeyType(event.target.value)
                      setPixKey('') // Limpar chave ao mudar tipo
                    }}>
                      <option value="CPF">CPF</option>
                      <option value="CNPJ">CNPJ</option>
                      <option value="PHONE">Telefone</option>
                      <option value="EMAIL">Email</option>
                      <option value="RANDOM">Chave aleatória</option>
                    </select>
                    <i className="fa-solid fa-chevron-down"></i>
                  </div>
                </div>

                <div className="withdraw-field">
                  <label>Chave PIX</label>
                  <div className="withdraw-input">
                    <i className="fa-solid fa-key"></i>
                    <input 
                      type="text" 
                      placeholder="Digite sua chave PIX" 
                      value={pixKey}
                      onChange={(e) => setPixKey(e.target.value)}
                    />
                  </div>
                  <small>
                    {pixKeyType === 'CPF' && 'Digite apenas os números do CPF (11 dígitos).'}
                    {pixKeyType === 'CNPJ' && 'Digite apenas os números do CNPJ (14 dígitos).'}
                    {pixKeyType === 'EMAIL' && 'Digite o e-mail completo (deve ser válido).'}
                    {pixKeyType === 'PHONE' && 'Digite o número com DDD, sem espaços ou símbolos (11 dígitos).'}
                    {pixKeyType === 'RANDOM' && 'Digite a chave aleatória completa.'}
                  </small>
                </div>

                <div className="withdraw-form-actions">
                  <button 
                    type="button" 
                    className="withdraw-back-btn" 
                    onClick={() => {
                      setShowAccountForm(false)
                      setHolderName('')
                      setPixKey('')
                      setPixKeyType('CPF')
                      setAccountError('')
                      setAccountSuccess('')
                    }}
                    disabled={savingAccount}
                  >
                    <i className="fa-solid fa-arrow-left"></i>
                    <span>Voltar</span>
                  </button>
                  <button 
                    type="button" 
                    className="withdraw-save-btn"
                    onClick={handleSaveAccount}
                    disabled={savingAccount}
                  >
                    <i className="fa-solid fa-floppy-disk"></i>
                    <span>{savingAccount ? 'Salvando...' : 'Salvar Conta PIX'}</span>
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
