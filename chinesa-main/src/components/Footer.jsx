import React from 'react'
import './Footer.css'

function Footer() {
  return (
    <footer className="footer">
      <div className="footer-container">
        <div className="footer-row footer-row-top">
          <div className="footer-col">
            <h5 className="footer-title">Cassino</h5>
            <ul className="footer-links">
              <li><a href="#bannersModal">Eventos</a></li>
              <li><a href="#bannersModal">Missão</a></li>
              <li><a href="#vipModal">VIP</a></li>
            </ul>
          </div>
          <div className="footer-col">
            <h5 className="footer-title">Jogos</h5>
            <ul className="footer-links">
              <li><a href="https://fortunebet.win/games">Todos</a></li>
              <li><a href="https://fortunebet.win/games">Slots</a></li>
              <li><a href="https://fortunebet.win/games?recents=true">Recentes</a></li>
              <li><a href="https://fortunebet.win/games?favorites=true">Favoritos</a></li>
            </ul>
          </div>
          <div className="footer-col">
            <h5 className="footer-title">Suporte</h5>
            <ul className="footer-links">
              <li><a href="https://t.me/grupo777win" target="_blank" rel="noreferrer">Suporte</a></li>
              <li><a href="https://t.me/grupo777win" target="_blank" rel="noreferrer">Central de Ajuda</a></li>
            </ul>
          </div>
        </div>

        <div className="footer-row footer-row-middle">
          <div className="footer-col-full">
            <h5 className="footer-title">Contacte-nos</h5>
            <div className="social-links">
              <a
                href="https://www.instagram.com/grupo.777win?igsh=cTZjaDhtZ244MDc1"
                className="social-link"
                target="_blank"
                rel="noreferrer"
              >
                <img src="/iconFooter/icon-ig.png" alt="Instagram" />
              </a>
              <a
                href="https://t.me/grupo777win"
                className="social-link"
                target="_blank"
                rel="noreferrer"
              >
                <img src="/iconFooter/icon-telegran.png" alt="Telegram" />
              </a>
              <a href="#" className="social-link" aria-label="18+">
                <img src="/iconFooter/icon-18.png" alt="18+" />
              </a>
            </div>
          </div>
        </div>

        <div className="footer-row footer-row-bottom">
          <div className="footer-col-full">
            <div className="footer-legal">
              <p>
                O ganho final não é garantida deste site é atualmente um dos detentores de licença de cassino no Brasil, é um dos operadores internacionais de cassino online mais conceituados do mundo, oferecendo os melhores slots online do mundo, uma variedade de jogos emocionantes, como jogos com crupiê ao vivo, pesca, loterias, esportes e muito mais. Somos autorizados e regulamentados pelo Governo de Curaçao e operamos sob a licença Antillone n° 8048/JAZ. O ganho final não é garantida.
              </p>
            </div>
          </div>
        </div>
      </div>

    </footer>
  )
}

export default Footer

