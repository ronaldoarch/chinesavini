import React, { createContext, useContext, useState, useEffect } from 'react'
import api from '../services/api'

const ThemeContext = createContext()

export const useTheme = () => {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme deve ser usado dentro de ThemeProvider')
  }
  return context
}

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadTheme()
    
    // Poll for theme updates every 5 seconds
    const interval = setInterval(() => {
      loadTheme()
    }, 5000)

    return () => clearInterval(interval)
  }, [])

  const loadTheme = async () => {
    try {
      const response = await api.getActiveTheme()
      if (response.success && response.data) {
        applyTheme(response.data)
        setTheme(response.data)
      }
    } catch (error) {
      console.error('Error loading theme:', error)
    } finally {
      setLoading(false)
    }
  }

  const applyTheme = (themeData) => {
    if (!themeData || !themeData.colors) return

    const colors = themeData.colors
    const root = document.documentElement

    // Apply CSS variables
    root.style.setProperty('--primary-purple', colors.primaryPurple || '#3f1453')
    root.style.setProperty('--secondary-purple', colors.secondaryPurple || '#561878')
    root.style.setProperty('--dark-purple', colors.darkPurple || '#43135d')
    root.style.setProperty('--light-purple', colors.lightPurple || '#7a2b9e')
    root.style.setProperty('--gold', colors.gold || '#c59728')
    root.style.setProperty('--yellow', colors.yellow || '#FFC107')
    root.style.setProperty('--green', colors.green || '#4CAF50')
    root.style.setProperty('--red', colors.red || '#FF0000')
    root.style.setProperty('--orange', colors.orange || '#FFA500')
    root.style.setProperty('--grey', colors.grey || '#9E9E9E')
    root.style.setProperty('--text-white', colors.textWhite || '#FFFFFF')
    root.style.setProperty('--text-grey', colors.textGrey || '#9E9E9E')
    root.style.setProperty('--bottom-nav-bg', colors.bottomNavBg || '#3F1453')
    root.style.setProperty('--bottom-nav-border', colors.bottomNavBorder || 'rgba(197, 151, 40, 0.2)')
    root.style.setProperty('--bottom-nav-icon', colors.bottomNavIcon || '#E1B54A')
    root.style.setProperty('--bottom-nav-text', colors.bottomNavText || '#E1B54A')
    root.style.setProperty('--header-bg', colors.headerBg || '#3F1453')
    root.style.setProperty('--header-border-color', colors.headerBorderColor || 'rgba(197, 151, 40, 0.2)')
    root.style.setProperty('--header-icon', colors.headerIcon || '#E1B54A')
    root.style.setProperty('--header-text', colors.headerText || '#FFFFFF')
    root.style.setProperty('--footer-bg', colors.footerBg || '#3F1453')
    root.style.setProperty('--footer-border', colors.footerBorder || 'rgba(197, 151, 40, 0.2)')
    root.style.setProperty('--footer-text', colors.footerText || '#FFFFFF')
    root.style.setProperty('--footer-muted', colors.footerMuted || 'rgba(255, 255, 255, 0.7)')
  }

  const refreshTheme = () => {
    loadTheme()
  }

  const value = {
    theme,
    loading,
    refreshTheme
  }

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}
