import React, { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useSupport } from '../contexts/SupportContext'
import { useFacebookPixel } from '../hooks/useFacebookPixel'
import './AuthModal.css'

function AuthModal({ isOpen, initialTab = 'register', onClose, onAuthSuccess }) {
  const { register, login } = useAuth()
  const { whatsappUrl, telegramUrl } = useSupport()
  const { trackEvent } = useFacebookPixel()
  const supportUrl = whatsappUrl || telegramUrl
  const [activeTab, setActiveTab] = useState(initialTab)
  const [showRegisterPassword, setShowRegisterPassword] = useState(false)
  const [showRegisterConfirm, setShowRegisterConfirm] = useState(false)
  const [showLoginPassword, setShowLoginPassword] = useState(false)
  
  // Form states
  const [registerData, setRegisterData] = useState({
    username: '',
    phone: '',
    password: '',
    confirmPassword: '',
    termsAccepted: true
  })
  const [loginData, setLoginData] = useState({
    username: '',
    password: '',
    rememberMe: true
  })
  
  // UI states
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [fieldErrors, setFieldErrors] = useState({})

  useEffect(() => {
    setActiveTab(initialTab)
    // Reset form when modal opens/closes
    if (!isOpen) {
      setRegisterData({
        username: '',
        phone: '',
        password: '',
        confirmPassword: '',
        termsAccepted: true
      })
      setLoginData({
        username: '',
        password: '',
        rememberMe: true
      })
      setError(null)
      setFieldErrors({})
    }
  }, [initialTab, isOpen])

  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const formatPhone = (value) => {
    const digits = value.replace(/\D/g, '').slice(0, 11)
    if (!digits) return ''
    if (digits.length <= 2) return `(${digits}`
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
  }

  const validateRegister = () => {
    const errors = {}
    
    if (!registerData.username.trim()) {
      errors.username = 'Username é obrigatório'
    } else if (registerData.username.length < 3) {
      errors.username = 'Username deve ter no mínimo 3 caracteres'
    } else if (!/^[a-zA-Z0-9_]+$/.test(registerData.username)) {
      errors.username = 'Username pode conter apenas letras, números e underscore'
    }
    
    const phoneDigits = registerData.phone.replace(/\D/g, '')
    if (!phoneDigits) {
      errors.phone = 'Telefone é obrigatório'
    } else if (phoneDigits.length < 10 || phoneDigits.length > 11) {
      errors.phone = 'Telefone inválido'
    }
    
    if (!registerData.password) {
      errors.password = 'Senha é obrigatória'
    } else if (registerData.password.length < 6) {
      errors.password = 'Senha deve ter no mínimo 6 caracteres'
    }
    
    if (!registerData.confirmPassword) {
      errors.confirmPassword = 'Confirmação de senha é obrigatória'
    } else if (registerData.password !== registerData.confirmPassword) {
      errors.confirmPassword = 'As senhas não coincidem'
    }
    
    if (!registerData.termsAccepted) {
      errors.termsAccepted = 'Você deve aceitar os termos de uso'
    }
    
    return errors
  }

  const validateLogin = () => {
    const errors = {}
    
    if (!loginData.username.trim()) {
      errors.username = 'Username é obrigatório'
    }
    
    if (!loginData.password) {
      errors.password = 'Senha é obrigatória'
    }
    
    return errors
  }

  const handleRegister = async (e) => {
    e.preventDefault()
    setError(null)
    setFieldErrors({})
    
    const errors = validateRegister()
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      return
    }
    
    setLoading(true)
    
    try {
      const phoneDigits = registerData.phone.replace(/\D/g, '')
      const result = await register({
        username: registerData.username.trim(),
        phone: registerData.phone,
        password: registerData.password,
        confirmPassword: registerData.confirmPassword,
        termsAccepted: registerData.termsAccepted.toString()
      })
      
      if (result.success) {
        // Track Lead event (cadastro) - evento do pixel no frontend
        trackEvent('Lead', { content_name: 'Cadastro' })
        if (onAuthSuccess) {
          onAuthSuccess()
        }
        onClose()
      } else {
        setError(result.message || 'Erro ao realizar cadastro')
        if (result.errors) {
          const apiErrors = {}
          result.errors.forEach(err => {
            if (err.param) {
              apiErrors[err.param] = err.msg
            }
          })
          setFieldErrors(apiErrors)
        }
      }
    } catch (err) {
      setError(err.message || 'Erro ao realizar cadastro')
    } finally {
      setLoading(false)
    }
  }

  const handleLogin = async (e) => {
    e.preventDefault()
    setError(null)
    setFieldErrors({})
    
    const errors = validateLogin()
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      return
    }
    
    setLoading(true)
    
    try {
      const result = await login(loginData.username.trim(), loginData.password)
      
      if (result.success) {
        if (onAuthSuccess) {
          onAuthSuccess()
        }
        onClose()
      } else {
        setError(result.message || 'Erro ao fazer login')
      }
    } catch (err) {
      setError(err.message || 'Erro ao fazer login')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-modal-overlay" onClick={onClose}>
      <div className="auth-modal" onClick={(e) => e.stopPropagation()}>
        <div className="auth-tabs">
          <button
            className={`auth-tab ${activeTab === 'register' ? 'active' : ''}`}
            onClick={() => setActiveTab('register')}
            type="button"
          >
            <i className="fa-solid fa-user-plus"></i>
            Registro
          </button>
          <button
            className={`auth-tab ${activeTab === 'login' ? 'active' : ''}`}
            onClick={() => setActiveTab('login')}
            type="button"
          >
            <i className="fa-solid fa-right-to-bracket"></i>
            Login
          </button>
        </div>

        {error && (
          <div className="auth-error-message">
            <i className="fa-solid fa-circle-exclamation"></i>
            <span>{error}</span>
          </div>
        )}

        {activeTab === 'register' && (
          <form className="auth-content" onSubmit={handleRegister}>
            <div className={`auth-field ${fieldErrors.username ? 'has-error' : ''}`}>
              <i className="fa-solid fa-user"></i>
              <span className="required">*</span>
              <input
                type="text"
                placeholder="Digite o usuário"
                value={registerData.username}
                onChange={(e) => {
                  setRegisterData({ ...registerData, username: e.target.value })
                  if (fieldErrors.username) {
                    setFieldErrors({ ...fieldErrors, username: null })
                  }
                }}
                disabled={loading}
              />
              {fieldErrors.username && (
                <span className="field-error">{fieldErrors.username}</span>
              )}
            </div>
            <div className={`auth-field ${fieldErrors.phone ? 'has-error' : ''}`}>
              <span className="flag">
                <img src="/iconFooter/icon-brl.png" alt="Brasil" />
              </span>
              <span className="country-code">+55</span>
              <input
                type="tel"
                placeholder="(00) 00000-0000"
                value={registerData.phone}
                onChange={(e) => {
                  const formatted = formatPhone(e.target.value)
                  setRegisterData({ ...registerData, phone: formatted })
                  if (fieldErrors.phone) {
                    setFieldErrors({ ...fieldErrors, phone: null })
                  }
                }}
                inputMode="numeric"
                autoComplete="tel"
                disabled={loading}
              />
              {fieldErrors.phone && (
                <span className="field-error">{fieldErrors.phone}</span>
              )}
            </div>
            <div className={`auth-field ${fieldErrors.password ? 'has-error' : ''}`}>
              <i className="fa-solid fa-lock"></i>
              <span className="required">*</span>
              <input
                type={showRegisterPassword ? 'text' : 'password'}
                placeholder="Digite sua senha"
                value={registerData.password}
                onChange={(e) => {
                  setRegisterData({ ...registerData, password: e.target.value })
                  if (fieldErrors.password) {
                    setFieldErrors({ ...fieldErrors, password: null })
                  }
                }}
                disabled={loading}
              />
              <button
                className="eye-button"
                type="button"
                onClick={() => setShowRegisterPassword((prev) => !prev)}
                aria-label="Mostrar ou esconder senha"
                disabled={loading}
              >
                <i className={`fa-solid ${showRegisterPassword ? 'fa-eye' : 'fa-eye-slash'}`}></i>
              </button>
              {fieldErrors.password && (
                <span className="field-error">{fieldErrors.password}</span>
              )}
            </div>
            <div className={`auth-field ${fieldErrors.confirmPassword ? 'has-error' : ''}`}>
              <i className="fa-solid fa-lock"></i>
              <span className="required">*</span>
              <input
                type={showRegisterConfirm ? 'text' : 'password'}
                placeholder="Confirme sua senha"
                value={registerData.confirmPassword}
                onChange={(e) => {
                  setRegisterData({ ...registerData, confirmPassword: e.target.value })
                  if (fieldErrors.confirmPassword) {
                    setFieldErrors({ ...fieldErrors, confirmPassword: null })
                  }
                }}
                disabled={loading}
              />
              <button
                className="eye-button"
                type="button"
                onClick={() => setShowRegisterConfirm((prev) => !prev)}
                aria-label="Mostrar ou esconder senha"
                disabled={loading}
              >
                <i className={`fa-solid ${showRegisterConfirm ? 'fa-eye' : 'fa-eye-slash'}`}></i>
              </button>
              {fieldErrors.confirmPassword && (
                <span className="field-error">{fieldErrors.confirmPassword}</span>
              )}
            </div>
            <label className={`auth-checkbox ${fieldErrors.termsAccepted ? 'has-error' : ''}`}>
              <input
                type="checkbox"
                checked={registerData.termsAccepted}
                onChange={(e) => {
                  setRegisterData({ ...registerData, termsAccepted: e.target.checked })
                  if (fieldErrors.termsAccepted) {
                    setFieldErrors({ ...fieldErrors, termsAccepted: null })
                  }
                }}
                disabled={loading}
              />
              Tenho +18 anos, li e concordo com os Termos de Uso
              {fieldErrors.termsAccepted && (
                <span className="field-error">{fieldErrors.termsAccepted}</span>
              )}
            </label>
            <button
              className="auth-submit"
              type="submit"
              disabled={loading}
            >
              {loading ? (
                <>
                  <i className="fa-solid fa-spinner fa-spin"></i>
                  <span>Processando...</span>
                </>
              ) : (
                'Registro'
              )}
            </button>
            {supportUrl ? (
              <a className="auth-link" href={supportUrl} target="_blank" rel="noreferrer">Suporte ao cliente</a>
            ) : (
              <span className="auth-link auth-link-disabled">Suporte ao cliente</span>
            )}
          </form>
        )}

        {activeTab === 'login' && (
          <form className="auth-content" onSubmit={handleLogin}>
            <div className={`auth-field ${fieldErrors.username ? 'has-error' : ''}`}>
              <i className="fa-solid fa-user"></i>
              <span className="required">*</span>
              <input
                type="text"
                placeholder="Digite a Conta"
                value={loginData.username}
                onChange={(e) => {
                  setLoginData({ ...loginData, username: e.target.value })
                  if (fieldErrors.username) {
                    setFieldErrors({ ...fieldErrors, username: null })
                  }
                }}
                disabled={loading}
              />
              {fieldErrors.username && (
                <span className="field-error">{fieldErrors.username}</span>
              )}
            </div>
            <div className={`auth-field ${fieldErrors.password ? 'has-error' : ''}`}>
              <i className="fa-solid fa-lock"></i>
              <span className="required">*</span>
              <input
                type={showLoginPassword ? 'text' : 'password'}
                placeholder="Inserir Senha"
                value={loginData.password}
                onChange={(e) => {
                  setLoginData({ ...loginData, password: e.target.value })
                  if (fieldErrors.password) {
                    setFieldErrors({ ...fieldErrors, password: null })
                  }
                }}
                disabled={loading}
              />
              <button
                className="eye-button"
                type="button"
                onClick={() => setShowLoginPassword((prev) => !prev)}
                aria-label="Mostrar ou esconder senha"
                disabled={loading}
              >
                <i className={`fa-solid ${showLoginPassword ? 'fa-eye' : 'fa-eye-slash'}`}></i>
              </button>
              {fieldErrors.password && (
                <span className="field-error">{fieldErrors.password}</span>
              )}
            </div>
            <label className="auth-checkbox">
              <input
                type="checkbox"
                checked={loginData.rememberMe}
                onChange={(e) => setLoginData({ ...loginData, rememberMe: e.target.checked })}
                disabled={loading}
              />
              Lembrar da senha da conta
            </label>
            <button
              className="auth-submit"
              type="submit"
              disabled={loading}
            >
              {loading ? (
                <>
                  <i className="fa-solid fa-spinner fa-spin"></i>
                  <span>Entrando...</span>
                </>
              ) : (
                'Login'
              )}
            </button>
            <div className="auth-links">
              {supportUrl ? (
                <a className="auth-link" href={supportUrl} target="_blank" rel="noreferrer">Suporte ao cliente</a>
              ) : (
                <span className="auth-link auth-link-disabled">Suporte ao cliente</span>
              )}
              <a className="auth-link" href="#">Esquecer a senha</a>
            </div>
          </form>
        )}

        <button className="auth-close" type="button" onClick={onClose}>
          <i className="fa-solid fa-xmark"></i>
        </button>
      </div>
    </div>
  )
}

export default AuthModal

