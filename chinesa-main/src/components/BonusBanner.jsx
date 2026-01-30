import React, { useEffect, useMemo, useRef, useState } from 'react'
import api from '../services/api'
import './BonusBanner.css'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
const getImageUrl = (imagePath) => {
  if (!imagePath) return ''
  const baseUrl = API_BASE_URL.replace(/\/api\/?$/, '')
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) return imagePath
  if (imagePath.startsWith('/uploads')) return `${baseUrl}${imagePath}`
  const uploadsIndex = imagePath.indexOf('/uploads/')
  if (uploadsIndex !== -1) return `${baseUrl}${imagePath.slice(uploadsIndex)}`
  return imagePath
}

function BonusBanner() {
  const [banners, setBanners] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadBanners()
  }, [])

  const loadBanners = async () => {
    try {
      const response = await api.getBanners()
      if (response.success && response.data.banners) {
        setBanners(response.data.banners)
      } else {
        // Fallback to default banners
        setBanners([
          { id: 1, imageUrl: '/banner/banner-01.png', title: 'Banner 1' },
          { id: 2, imageUrl: '/banner/banner-02.png', title: 'Banner 2' }
        ])
      }
    } catch (error) {
      console.error('Error loading banners:', error)
      // Fallback to default banners
      setBanners([
        { id: 1, imageUrl: '/banner/banner-01.png', title: 'Banner 1' },
        { id: 2, imageUrl: '/banner/banner-02.png', title: 'Banner 2' }
      ])
    } finally {
      setLoading(false)
    }
  }

  const slides = useMemo(
    () => banners.map((banner, index) => ({
      id: banner._id || banner.id || index + 1,
      src: banner.imageUrl,
      alt: banner.title || `Banner ${index + 1}`,
      linkUrl: banner.linkUrl
    })),
    [banners]
  )
  const repeatCount = 5
  const startIndex = slides.length * 2
  const [currentIndex, setCurrentIndex] = useState(startIndex)
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState(0)
  const [isAnimating, setIsAnimating] = useState(true)
  const startXRef = useRef(0)
  const lastXRef = useRef(0)
  const autoplayRef = useRef(null)
  const swiperRef = useRef(null)

  const loopedSlides = useMemo(
    () => Array.from({ length: slides.length * repeatCount }, (_, i) => slides[i % slides.length]),
    [slides]
  )

  const stopAutoplay = () => {
    if (autoplayRef.current) clearInterval(autoplayRef.current)
  }

  const startAutoplay = () => {
    stopAutoplay()
    autoplayRef.current = setInterval(() => {
      setIsAnimating(true)
      setCurrentIndex((prev) => prev + 1)
    }, 4000)
  }

  useEffect(() => {
    startAutoplay()
    return () => stopAutoplay()
  }, [slides.length])

  const goTo = (index) => {
    setIsAnimating(true)
    setCurrentIndex(startIndex + index)
  }

  const handlePointerDown = (e) => {
    stopAutoplay()
    setIsAnimating(false)
    setIsDragging(true)
    const clientX = e.touches ? e.touches[0].clientX : e.clientX
    startXRef.current = clientX
    lastXRef.current = clientX
  }

  const handlePointerMove = (e) => {
    if (!isDragging) return
    const clientX = e.touches ? e.touches[0].clientX : e.clientX
    const delta = clientX - startXRef.current
    const width = swiperRef.current?.offsetWidth || 0
    let nextDelta = delta

    if (width > 0) {
      if (delta > width) {
        const steps = Math.floor(delta / width)
        setCurrentIndex((prev) => prev - steps)
        startXRef.current += steps * width
        nextDelta = clientX - startXRef.current
      } else if (delta < -width) {
        const steps = Math.floor(Math.abs(delta) / width)
        setCurrentIndex((prev) => prev + steps)
        startXRef.current -= steps * width
        nextDelta = clientX - startXRef.current
      }
    }
    lastXRef.current = clientX
    setDragOffset(nextDelta)
  }

  const handlePointerUp = () => {
    if (!isDragging) return
    const delta = lastXRef.current - startXRef.current
    const threshold = 60
    let nextIndex = currentIndex
    if (delta > threshold) {
      nextIndex = currentIndex - 1
    } else if (delta < -threshold) {
      nextIndex = currentIndex + 1
    }
    setIsDragging(false)
    setDragOffset(0)
    setIsAnimating(true)
    setCurrentIndex(nextIndex)
    startAutoplay()
  }

  const handleTransitionEnd = () => {
    if (currentIndex <= slides.length || currentIndex >= slides.length * (repeatCount - 1)) {
      setIsAnimating(false)
      setCurrentIndex(startIndex + (currentIndex % slides.length))
      requestAnimationFrame(() => setIsAnimating(true))
    }
  }

  useEffect(() => {
    if (currentIndex < 0 || currentIndex >= loopedSlides.length) {
      setIsAnimating(false)
      setCurrentIndex(startIndex)
      requestAnimationFrame(() => setIsAnimating(true))
    }
  }, [currentIndex, loopedSlides.length, startIndex])

  const activeIndex = ((currentIndex % slides.length) + slides.length) % slides.length

  if (loading || slides.length === 0) {
    return null
  }

  return (
    <div className="banner-checkin">
      <div
        ref={swiperRef}
        className="banner-swiper swiper-horizontal"
        onMouseDown={handlePointerDown}
        onMouseMove={handlePointerMove}
        onMouseUp={handlePointerUp}
        onMouseLeave={handlePointerUp}
        onTouchStart={handlePointerDown}
        onTouchMove={handlePointerMove}
        onTouchEnd={handlePointerUp}
      >
        <div
          className={`swiper-wrapper ${isAnimating ? 'is-animating' : ''}`}
          style={{
            transform: `translate3d(calc(-${currentIndex * (100 / loopedSlides.length)}% + ${dragOffset}px), 0, 0)`,
            ['--slides-count']: loopedSlides.length
          }}
          onTransitionEnd={handleTransitionEnd}
        >
          {loopedSlides.map((slide, index) => (
            <div
              key={`${slide.id}-${index}`}
              className="swiper-slide"
              style={{ ['--slides-count']: loopedSlides.length }}
            >
              {slide.linkUrl ? (
                <a href={slide.linkUrl} target="_blank" rel="noopener noreferrer">
                  <img src={getImageUrl(slide.src)} alt={slide.alt} className="banner-img-full" loading="lazy" />
                </a>
              ) : (
                <img src={getImageUrl(slide.src)} alt={slide.alt} className="banner-img-full" loading="lazy" />
              )}
            </div>
          ))}
        </div>
        <div className="swiper-pagination">
          {slides.map((slide, index) => (
            <button
              key={slide.id}
              type="button"
              className={`swiper-bullet ${index === activeIndex ? 'active' : ''}`}
              onClick={() => goTo(index)}
              aria-label={`Ir para o slide ${index + 1}`}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

export default BonusBanner


