import React, { createContext, useContext, useEffect, useState } from 'react'
import api from '../services/api'

const SupportContext = createContext({
  whatsappUrl: '',
  telegramUrl: '',
  instagramUrl: '',
  loading: true
})

export function SupportProvider({ children }) {
  const [config, setConfig] = useState({
    whatsappUrl: '',
    telegramUrl: '',
    instagramUrl: '',
    loading: true
  })

  useEffect(() => {
    api
      .getSupportConfig()
      .then((res) => {
        if (res.success && res.data) {
          setConfig({
            whatsappUrl: res.data.whatsappUrl || '',
            telegramUrl: res.data.telegramUrl || '',
            instagramUrl: res.data.instagramUrl || '',
            loading: false
          })
        } else {
          setConfig((c) => ({ ...c, loading: false }))
        }
      })
      .catch(() => {
        setConfig((c) => ({ ...c, loading: false }))
      })
  }, [])

  const refreshSupportConfig = () => {
    setConfig((c) => ({ ...c, loading: true }))
    api
      .getSupportConfig()
      .then((res) => {
        if (res.success && res.data) {
          setConfig({
            whatsappUrl: res.data.whatsappUrl || '',
            telegramUrl: res.data.telegramUrl || '',
            instagramUrl: res.data.instagramUrl || '',
            loading: false
          })
        } else {
          setConfig((c) => ({ ...c, loading: false }))
        }
      })
      .catch(() => {
        setConfig((c) => ({ ...c, loading: false }))
      })
  }

  return (
    <SupportContext.Provider value={{ ...config, refreshSupportConfig }}>
      {children}
    </SupportContext.Provider>
  )
}

export function useSupport() {
  const context = useContext(SupportContext)
  if (!context) {
    throw new Error('useSupport must be used within SupportProvider')
  }
  return context
}
