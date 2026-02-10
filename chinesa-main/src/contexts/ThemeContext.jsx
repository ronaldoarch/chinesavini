import React, { createContext, useContext, useState, useEffect, useLayoutEffect } from 'react'
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

  useLayoutEffect(() => {
    try {
      const cached = localStorage.getItem('app-theme-css')
      if (cached) {
        const root = document.documentElement
        const inner = cached.replace(/^:root\{|\}$/g, '').trim()
        inner.split(';').forEach((pair) => {
          const i = pair.indexOf(':')
          if (i === -1) return
          const key = pair.slice(0, i).trim()
          const value = pair.slice(i + 1).trim()
          if (key && value) root.style.setProperty(key, value)
        })
      }
    } catch (_) {}
  }, [])

  useEffect(() => {
    loadTheme()
    const interval = setInterval(() => loadTheme(), 5000)
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

    const vars = {
      '--primary-purple': colors.primaryPurple || '#3f1453',
      '--secondary-purple': colors.secondaryPurple || '#561878',
      '--dark-purple': colors.darkPurple || '#43135d',
      '--light-purple': colors.lightPurple || '#7a2b9e',
      '--gold': colors.gold || '#c59728',
      '--yellow': colors.yellow || '#FFC107',
      '--green': colors.green || '#4CAF50',
      '--red': colors.red || '#FF0000',
      '--orange': colors.orange || '#FFA500',
      '--grey': colors.grey || '#9E9E9E',
      '--text-white': colors.textWhite || '#FFFFFF',
      '--text-grey': colors.textGrey || '#9E9E9E',
      '--bottom-nav-bg': colors.bottomNavBg || '#3F1453',
      '--bottom-nav-border': colors.bottomNavBorder || 'rgba(197, 151, 40, 0.2)',
      '--bottom-nav-icon': colors.bottomNavIcon || '#E1B54A',
      '--bottom-nav-text': colors.bottomNavText || '#E1B54A',
      '--header-bg': colors.headerBg || '#3F1453',
      '--header-border-color': colors.headerBorderColor || 'rgba(197, 151, 40, 0.2)',
      '--header-icon': colors.headerIcon || '#E1B54A',
      '--header-text': colors.headerText || '#FFFFFF',
      '--footer-bg': colors.footerBg || '#3F1453',
      '--footer-border': colors.footerBorder || 'rgba(197, 151, 40, 0.2)',
      '--footer-text': colors.footerText || '#FFFFFF',
      '--footer-muted': colors.footerMuted || 'rgba(255, 255, 255, 0.7)'
    }

    Object.entries(vars).forEach(([key, value]) => root.style.setProperty(key, value))

    try {
      const css = ':root{' + Object.entries(vars).map(([k, v]) => k + ':' + v).join(';') + '}'
      localStorage.setItem('app-theme-css', css)
    } catch (_) {}
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
