import React from 'react'
import './GamesSection.css'

function GamesSection({ onViewAll }) {
  const games = [
    { id: 1, title: 'Dragon Hatch', emoji: '🐉', playing: 1538 },
    { id: 2, title: 'Gem Saviour', emoji: '⚔️', playing: 2172 },
    { id: 3, title: 'Mahjong Ways', emoji: '🀄', playing: 2046 },
    { id: 4, title: 'Leprechaun', emoji: '🍀', playing: 1333 },
    { id: 5, title: 'Dragon Tiger', emoji: '🐲', playing: 2087 },
    { id: 6, title: 'Bounty', emoji: '🏴‍☠️', playing: 2418 }
  ]

  return (
    <div className="games-section">
      <div className="provider-banner">
        <div className="provider-left">
          <span className="title-gradient">PG SOFT</span>
        </div>
        <div className="provider-right">
          <div
            className="swiper-nav-prev pgsoft-prev me-2"
            tabIndex="0"
            role="button"
            aria-label="Previous slide"
            aria-controls="swiper-wrapper-pgsoft"
          >
            <i className="fa-solid fa-chevron-left"></i>
          </div>
          <button className="provider-view-all" type="button" onClick={onViewAll}>
            Ver todos
          </button>
          <div
            className="swiper-nav-next pgsoft-next ms-2"
            tabIndex="0"
            role="button"
            aria-label="Next slide"
            aria-controls="swiper-wrapper-pgsoft"
          >
            <i className="fa-solid fa-chevron-right"></i>
          </div>
        </div>
      </div>

      <div className="games-swiper">
        <div className="games-grid">
          {games.map((game) => (
            <div key={game.id} className="game-card">
              <a href="#" className="game-link">
                <div className="game-thumbnail">{game.emoji}</div>
              </a>
              <div className="online-indicator">
                <span className="pulse" />
                <span className="online-text">
                  <strong>{game.playing}</strong> Jogando
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default GamesSection

