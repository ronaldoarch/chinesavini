import React, { useEffect, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useTheme } from '../../contexts/ThemeContext'
import api from '../../services/api'
import './AdminTheme.css'

function AdminTheme() {
  const { isAdmin } = useAuth()
  const { refreshTheme } = useTheme()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [themes, setThemes] = useState([])
  const [activeTheme, setActiveTheme] = useState(null)
  const [editingTheme, setEditingTheme] = useState(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  
  const [themeForm, setThemeForm] = useState({
    name: '',
    colors: {
      primaryPurple: '#3f1453',
      secondaryPurple: '#561878',
      darkPurple: '#43135d',
      lightPurple: '#7a2b9e',
      gold: '#c59728',
      yellow: '#FFC107',
      green: '#4CAF50',
      red: '#FF0000',
      orange: '#FFA500',
      grey: '#9E9E9E',
      textWhite: '#FFFFFF',
      textGrey: '#9E9E9E',
      bottomNavBg: '#3F1453',
      bottomNavBorder: 'rgba(197, 151, 40, 0.2)',
      bottomNavIcon: '#E1B54A',
      bottomNavText: '#E1B54A',
      headerBg: '#3F1453',
      headerBorderColor: 'rgba(197, 151, 40, 0.2)',
      headerIcon: '#E1B54A',
      headerText: '#FFFFFF',
      footerBg: '#3F1453',
      footerBorder: 'rgba(197, 151, 40, 0.2)',
      footerText: '#FFFFFF',
      footerMuted: 'rgba(255, 255, 255, 0.7)'
    },
    icons: {},
    isActive: false
  })

  useEffect(() => {
    if (!isAdmin) {
      setError('Acesso negado. Apenas administradores podem acessar esta página.')
      setLoading(false)
      return
    }

    loadThemes()
  }, [isAdmin])

  const loadThemes = async () => {
    try {
      setLoading(true)
      const response = await api.getThemes()
      if (response.success) {
        setThemes(response.data || [])
        const active = response.data.find(t => t.isActive)
        setActiveTheme(active)
      }
    } catch (err) {
      setError(err.message || 'Erro ao carregar temas')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateNew = () => {
    setThemeForm({
      name: '',
      colors: {
        primaryPurple: '#3f1453',
        secondaryPurple: '#561878',
        darkPurple: '#43135d',
        lightPurple: '#7a2b9e',
        gold: '#c59728',
        yellow: '#FFC107',
        green: '#4CAF50',
        red: '#FF0000',
        orange: '#FFA500',
        grey: '#9E9E9E',
        textWhite: '#FFFFFF',
        textGrey: '#9E9E9E',
        bottomNavBg: '#3F1453',
        bottomNavBorder: 'rgba(197, 151, 40, 0.2)',
        bottomNavIcon: '#E1B54A',
        bottomNavText: '#E1B54A',
        headerBg: '#3F1453',
        headerBorderColor: 'rgba(197, 151, 40, 0.2)',
        headerIcon: '#E1B54A',
        headerText: '#FFFFFF',
        footerBg: '#3F1453',
        footerBorder: 'rgba(197, 151, 40, 0.2)',
        footerText: '#FFFFFF',
        footerMuted: 'rgba(255, 255, 255, 0.7)'
      },
      icons: {},
      isActive: false
    })
    setEditingTheme(null)
    setShowCreateModal(true)
  }

  const handleEdit = (theme) => {
    setThemeForm({
      name: theme.name,
      colors: { ...theme.colors },
      icons: { ...theme.icons },
      isActive: theme.isActive
    })
    setEditingTheme(theme)
    setShowCreateModal(true)
  }

  const handleDuplicate = async (theme) => {
    try {
      setSaving(true)
      const response = await api.duplicateTheme(theme._id)
      if (response.success) {
        setSuccess('Tema duplicado com sucesso!')
        setTimeout(() => setSuccess(null), 3000)
        await loadThemes()
      } else {
        setError(response.message || 'Erro ao duplicar tema')
      }
    } catch (err) {
      setError(err.message || 'Erro ao duplicar tema')
    } finally {
      setSaving(false)
    }
  }

  const handleUseCurrentTheme = () => {
    if (activeTheme) {
      setThemeForm({
        name: `${activeTheme.name} (Novo)`,
        colors: { ...activeTheme.colors },
        icons: { ...activeTheme.icons },
        isActive: false
      })
      setEditingTheme(null)
      setShowCreateModal(true)
    }
  }

  const handleColorChange = (colorKey, value) => {
    const newColors = {
      ...themeForm.colors,
      [colorKey]: value
    }
    
    setThemeForm(prev => ({
      ...prev,
      colors: newColors
    }))
    
    // Apply preview in real-time if editing active theme
    if (editingTheme && editingTheme.isActive) {
      applyThemePreview({
        ...themeForm,
        colors: newColors
      })
    }
  }

  const applyThemePreview = (themeData) => {
    if (!themeData || !themeData.colors) return
    const colors = themeData.colors
    const root = document.documentElement
    
    // Map color keys to CSS variable names
    const colorMap = {
      primaryPurple: 'primary-purple',
      secondaryPurple: 'secondary-purple',
      darkPurple: 'dark-purple',
      lightPurple: 'light-purple',
      gold: 'gold',
      yellow: 'yellow',
      green: 'green',
      red: 'red',
      orange: 'orange',
      grey: 'grey',
      textWhite: 'text-white',
      textGrey: 'text-grey',
      bottomNavBg: 'bottom-nav-bg',
      bottomNavBorder: 'bottom-nav-border',
      bottomNavIcon: 'bottom-nav-icon',
      bottomNavText: 'bottom-nav-text',
      headerBg: 'header-bg',
      headerBorderColor: 'header-border-color',
      headerIcon: 'header-icon',
      headerText: 'header-text',
      footerBg: 'footer-bg',
      footerBorder: 'footer-border',
      footerText: 'footer-text',
      footerMuted: 'footer-muted'
    }
    
    Object.keys(colors).forEach(key => {
      if (colorMap[key]) {
        root.style.setProperty(`--${colorMap[key]}`, colors[key])
      }
    })
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      setError(null)
      setSuccess(null)
      
      if (!themeForm.name.trim()) {
        setError('Nome do tema é obrigatório')
        setSaving(false)
        return
      }

      let response
      if (editingTheme) {
        response = await api.updateTheme(editingTheme._id, themeForm)
      } else {
        response = await api.createTheme(themeForm)
      }
      
      if (response.success) {
        setSuccess(editingTheme ? 'Tema atualizado com sucesso!' : 'Tema criado com sucesso!')
        setTimeout(() => setSuccess(null), 3000)
        setShowCreateModal(false)
        await loadThemes()
        
        // Refresh theme if active theme was updated
        if (themeForm.isActive || (editingTheme && editingTheme.isActive)) {
          refreshTheme()
        }
      } else {
        setError(response.message || 'Erro ao salvar tema')
      }
    } catch (err) {
      setError(err.message || 'Erro ao salvar tema')
    } finally {
      setSaving(false)
    }
  }

  const handleActivate = async (theme) => {
    try {
      setSaving(true)
      const response = await api.updateTheme(theme._id, { ...theme, isActive: true })
      if (response.success) {
        setSuccess('Tema ativado com sucesso!')
        setTimeout(() => setSuccess(null), 3000)
        await loadThemes()
        refreshTheme()
      } else {
        setError(response.message || 'Erro ao ativar tema')
      }
    } catch (err) {
      setError(err.message || 'Erro ao ativar tema')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (theme) => {
    if (!window.confirm(`Tem certeza que deseja deletar o tema "${theme.name}"?`)) {
      return
    }

    try {
      setSaving(true)
      const response = await api.deleteTheme(theme._id)
      if (response.success) {
        setSuccess('Tema deletado com sucesso!')
        setTimeout(() => setSuccess(null), 3000)
        await loadThemes()
      } else {
        setError(response.message || 'Erro ao deletar tema')
      }
    } catch (err) {
      setError(err.message || 'Erro ao deletar tema')
    } finally {
      setSaving(false)
    }
  }

  if (!isAdmin) {
    return (
      <div className="admin-container">
        <div className="admin-error">
          <i className="fa-solid fa-lock"></i>
          <h2>Acesso Negado</h2>
          <p>Você não tem permissão para acessar esta página.</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="admin-container">
        <div className="admin-loading">
          <i className="fa-solid fa-spinner fa-spin"></i>
          <p>Carregando temas...</p>
        </div>
      </div>
    )
  }

  const colorGroups = [
    {
      title: 'Cores Principais',
      colors: [
        { key: 'primaryPurple', label: 'Roxo Principal' },
        { key: 'secondaryPurple', label: 'Roxo Secundário' },
        { key: 'darkPurple', label: 'Roxo Escuro' },
        { key: 'lightPurple', label: 'Roxo Claro' }
      ]
    },
    {
      title: 'Cores de Destaque',
      colors: [
        { key: 'gold', label: 'Dourado' },
        { key: 'yellow', label: 'Amarelo' },
        { key: 'green', label: 'Verde' },
        { key: 'red', label: 'Vermelho' },
        { key: 'orange', label: 'Laranja' },
        { key: 'grey', label: 'Cinza' }
      ]
    },
    {
      title: 'Cores de Texto',
      colors: [
        { key: 'textWhite', label: 'Texto Branco' },
        { key: 'textGrey', label: 'Texto Cinza' }
      ]
    },
    {
      title: 'Navegação Inferior',
      colors: [
        { key: 'bottomNavBg', label: 'Fundo' },
        { key: 'bottomNavBorder', label: 'Borda' },
        { key: 'bottomNavIcon', label: 'Ícone' },
        { key: 'bottomNavText', label: 'Texto' }
      ]
    },
    {
      title: 'Cabeçalho',
      colors: [
        { key: 'headerBg', label: 'Fundo' },
        { key: 'headerBorderColor', label: 'Borda' },
        { key: 'headerIcon', label: 'Ícone' },
        { key: 'headerText', label: 'Texto' }
      ]
    },
    {
      title: 'Rodapé',
      colors: [
        { key: 'footerBg', label: 'Fundo' },
        { key: 'footerBorder', label: 'Borda' },
        { key: 'footerText', label: 'Texto' },
        { key: 'footerMuted', label: 'Texto Muted' }
      ]
    }
  ]

  return (
    <div className="admin-container">
      <div className="admin-header">
        <h1>
          <i className="fa-solid fa-palette"></i>
          Gerenciar Temas
        </h1>
        <div className="theme-actions">
          <button onClick={handleUseCurrentTheme} className="btn-use-current" disabled={!activeTheme}>
            <i className="fa-solid fa-copy"></i>
            Usar Tema Atual
          </button>
          <button onClick={handleCreateNew} className="btn-create">
            <i className="fa-solid fa-plus"></i>
            Novo Tema
          </button>
        </div>
      </div>

      {error && (
        <div className="alert alert-error">
          <i className="fa-solid fa-circle-exclamation"></i>
          {error}
        </div>
      )}

      {success && (
        <div className="alert alert-success">
          <i className="fa-solid fa-circle-check"></i>
          {success}
        </div>
      )}

      <div className="themes-grid">
        {themes.map((theme) => (
          <div key={theme._id} className={`theme-card ${theme.isActive ? 'active' : ''}`}>
            <div className="theme-card-header">
              <h3>{theme.name}</h3>
              {theme.isActive && (
                <span className="theme-badge">
                  <i className="fa-solid fa-check-circle"></i>
                  Ativo
                </span>
              )}
            </div>
            <div className="theme-preview">
              <div className="preview-colors">
                <div 
                  className="preview-color" 
                  style={{ backgroundColor: theme.colors?.primaryPurple || '#3f1453' }}
                ></div>
                <div 
                  className="preview-color" 
                  style={{ backgroundColor: theme.colors?.gold || '#c59728' }}
                ></div>
                <div 
                  className="preview-color" 
                  style={{ backgroundColor: theme.colors?.secondaryPurple || '#561878' }}
                ></div>
              </div>
            </div>
            <div className="theme-card-actions">
              {!theme.isActive && (
                <button 
                  onClick={() => handleActivate(theme)} 
                  className="btn-activate"
                  disabled={saving}
                >
                  <i className="fa-solid fa-check"></i>
                  Ativar
                </button>
              )}
              <button 
                onClick={() => handleEdit(theme)} 
                className="btn-edit"
              >
                <i className="fa-solid fa-edit"></i>
                Editar
              </button>
              <button 
                onClick={() => handleDuplicate(theme)} 
                className="btn-duplicate"
                disabled={saving}
              >
                <i className="fa-solid fa-copy"></i>
                Duplicar
              </button>
              {!theme.isActive && (
                <button 
                  onClick={() => handleDelete(theme)} 
                  className="btn-delete"
                  disabled={saving}
                >
                  <i className="fa-solid fa-trash"></i>
                  Deletar
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {showCreateModal && (
        <div className="theme-modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="theme-modal" onClick={(e) => e.stopPropagation()}>
            <div className="theme-modal-header">
              <h2>
                <i className="fa-solid fa-palette"></i>
                {editingTheme ? 'Editar Tema' : 'Criar Novo Tema'}
              </h2>
              <button onClick={() => setShowCreateModal(false)} className="btn-close">
                <i className="fa-solid fa-times"></i>
              </button>
            </div>

            <div className="theme-modal-content">
              <div className="form-group">
                <label>Nome do Tema *</label>
                <input
                  type="text"
                  value={themeForm.name}
                  onChange={(e) => setThemeForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Ex: Tema Escuro, Tema Claro..."
                />
              </div>

              <div className="form-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={themeForm.isActive}
                    onChange={(e) => setThemeForm(prev => ({ ...prev, isActive: e.target.checked }))}
                  />
                  <span>Ativar este tema</span>
                </label>
              </div>

              <div className="color-editor">
                {colorGroups.map((group, groupIndex) => (
                  <div key={groupIndex} className="color-group">
                    <h3>{group.title}</h3>
                    <div className="color-inputs">
                      {group.colors.map((color) => (
                        <div key={color.key} className="color-input">
                          <label>{color.label}</label>
                          <div className="color-picker-wrapper">
                            <input
                              type="color"
                              value={themeForm.colors[color.key] || '#000000'}
                              onChange={(e) => handleColorChange(color.key, e.target.value)}
                              className="color-picker"
                            />
                            <input
                              type="text"
                              value={themeForm.colors[color.key] || ''}
                              onChange={(e) => handleColorChange(color.key, e.target.value)}
                              className="color-text"
                              placeholder="#000000"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="theme-modal-footer">
              <button onClick={() => setShowCreateModal(false)} className="btn-cancel">
                Cancelar
              </button>
              <button onClick={handleSave} className="btn-save" disabled={saving}>
                {saving ? (
                  <>
                    <i className="fa-solid fa-spinner fa-spin"></i>
                    Salvando...
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-save"></i>
                    Salvar
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminTheme
