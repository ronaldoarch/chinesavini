import React from 'react'
import './ScrollToTopButton.css'

function ScrollToTopButton() {
  const [isVisible, setIsVisible] = React.useState(false)

  React.useEffect(() => {
    const scrollContainer = document.getElementById('root')

    const getScrollTop = () => (scrollContainer ? scrollContainer.scrollTop : window.scrollY)

    const handleScroll = () => {
      setIsVisible(getScrollTop() > 200)
    }

    handleScroll()
    const target = scrollContainer || window
    target.addEventListener('scroll', handleScroll, { passive: true })
    return () => target.removeEventListener('scroll', handleScroll)
  }, [])

  const handleClick = () => {
    const scrollContainer = document.getElementById('root')
    if (scrollContainer) {
      scrollContainer.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className={`topo-btn${isVisible ? ' show' : ''}`}>
      <button
        className="btn topo-button"
        type="button"
        aria-label="Voltar ao topo"
        onClick={handleClick}
      >
        <i className="fa-solid fa-arrow-up"></i>
      </button>
    </div>
  )
}

export default ScrollToTopButton
