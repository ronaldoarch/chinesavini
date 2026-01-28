import React from 'react'
import './NavigationIcons.css'

function NavigationIcons({ onVipClick, onPromotionsClick, onInviteClick }) {
  const icons = [
    { id: 1, label: 'Promoção', image: '/bottom/icon_promocao.png', badgeColor: '#dc3545' },
    { id: 2, label: 'Convide', image: '/bottom/icon_convide.png', badgeColor: '#dc3545' },
    { id: 3, label: 'Bônus', image: '/bottom/icon bonus.png', badgeColor: '#fd7e14' },
    { id: 4, label: 'Check-in', image: '/bottom/icon_check-in.png', badgeColor: '#28a745' },
    { id: 5, label: 'VIP', image: '/bottom/icon_vip.png', badgeColor: '#dc3545' }
  ]

  return (
    <div className="navigation-icons container">
      <div className="icon-group-1-wrapper">
        {icons.map((item) => (
          <div key={item.id} className="icon-group-1-item-wrapper">
            <a
              href="#bannersModal"
              className="icon-group-1-item"
              onClick={
                item.label === 'VIP'
                  ? onVipClick
                  : item.label === 'Convide'
                  ? onInviteClick
                  : item.label === 'Promoção' || item.label === 'Bônus' || item.label === 'Check-in'
                  ? onPromotionsClick
                  : undefined
              }
            >
              <div className="icon-group-1-image">
                <img src={item.image} alt={item.label} />
              </div>
              <div className="icon-group-1-badge" style={{ backgroundColor: item.badgeColor }}>
                {item.label}
              </div>
            </a>
          </div>
        ))}
      </div>
    </div>
  )
}

export default NavigationIcons

