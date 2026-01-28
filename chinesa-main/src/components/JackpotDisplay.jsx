import React from 'react'
import './JackpotDisplay.css'

function JackpotDisplay() {
  return (
    <div className="jackpot-display">
      <div className="jackpot-image-wrapper">
        <img src="/jackpot-imagem.webp" alt="Jackpot" className="jackpot-img-full" loading="lazy" />
        <div className="jackpot-value-absolute">R$ 15.681.020,40</div>
      </div>
    </div>
  )
}

export default JackpotDisplay

