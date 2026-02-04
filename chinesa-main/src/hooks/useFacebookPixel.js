import { useEffect, useState } from 'react'
import api from '../services/api'

/**
 * Hook para carregar e inicializar o Facebook Pixel dinamicamente
 * Busca a configuração do admin e carrega o pixel apenas se configurado
 */
export function useFacebookPixel() {
  const [pixelId, setPixelId] = useState(null)
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    // Buscar configuração do pixel do admin
    const loadPixelConfig = async () => {
      try {
        const response = await api.getTrackingConfigPublic()
        if (response.success && response.data?.facebookPixelId) {
          setPixelId(response.data.facebookPixelId)
        }
      } catch (error) {
        console.error('Error loading Facebook Pixel config:', error)
      }
    }

    loadPixelConfig()
  }, [])

  useEffect(() => {
    if (!pixelId || isLoaded) return

    // Verificar se o pixel já foi carregado
    if (window.fbq) {
      setIsLoaded(true)
      return
    }

    // Carregar script do Facebook Pixel
    const script = document.createElement('script')
    script.innerHTML = `
      !function(f,b,e,v,n,t,s)
      {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
      n.callMethod.apply(n,arguments):n.queue.push(arguments)};
      if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
      n.queue=[];t=b.createElement(e);t.async=!0;
      t.src=v;s=b.getElementsByTagName(e)[0];
      s.parentNode.insertBefore(t,s)}(window, document,'script',
      'https://connect.facebook.net/en_US/fbevents.js');
      fbq('init', '${pixelId}');
      fbq('track', 'PageView');
    `
    script.id = 'facebook-pixel-script'
    document.head.appendChild(script)

    setIsLoaded(true)
  }, [pixelId, isLoaded])

  // Função para rastrear eventos
  const trackEvent = (eventName, params = {}) => {
    if (window.fbq && pixelId) {
      window.fbq('track', eventName, params)
    }
  }

  return {
    pixelId,
    isLoaded,
    trackEvent
  }
}
