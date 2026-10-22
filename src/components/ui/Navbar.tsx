import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'

const links = [
  { path: '/', label: 'Início' },
  { path: '/sobre', label: 'Sobre' },
  { path: '/mcs', label: 'MCs' },
  { path: '/ranking', label: 'Ranking' },
  { path: '/edicoes', label: 'Edições' },
  { path: '/calendario', label: 'Calendário' },
  { path: '/galeria', label: 'Galeria' },
  { path: '/contato', label: 'Contato' },
]

export function Navbar() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [open, setOpen] = useState(false)

  const go = (path: string) => { navigate(path); setOpen(false); window.scrollTo(0, 0) }

  return (
    <>
      <nav id="nav">
        <div className="nav-logo" onClick={() => go('/')}>
          <img src="/assets/logo-branco.png" alt="Batalha do Céu" style={{ height: 34, width: 'auto', objectFit: 'contain' }} />
        </div>
        <ul className="nav-links">
          {links.map(l => (
            <li key={l.path}>
              <button className={pathname === l.path ? 'active' : ''} onClick={() => go(l.path)}>
                {l.label}
              </button>
            </li>
          ))}
        </ul>
        <div className="nav-right">
          <button id="nav-admin-btn" onClick={() => go('/admin')}>⚙ Admin</button>
          <button
            className="nav-hamburger"
            onClick={() => setOpen(!open)}
            aria-label={open ? 'Fechar menu' : 'Abrir menu'}
            aria-expanded={open}
          >
            {open ? '✕' : '☰'}
          </button>
        </div>
      </nav>

      <div className={`nav-mobile-menu${open ? ' open' : ''}`}>
        {links.map(l => (
          <button key={l.path} className="nav-mobile-link" onClick={() => go(l.path)}>{l.label}</button>
        ))}
        <button className="nav-mobile-link" onClick={() => go('/admin')}>⚙ Admin</button>
      </div>
    </>
  )
}
