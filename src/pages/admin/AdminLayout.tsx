import { useEffect } from 'react'
import { useNavigate, useLocation, Outlet } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'

const menu = [
  { path: '/admin', icon: '◈', label: 'Dashboard', exact: true },
  { path: '/admin/mcs', icon: '🎤', label: 'MCs' },
  { path: '/admin/edicoes', icon: '📋', label: 'Edições / Eventos' },
  { path: '/admin/bracket', icon: '⚡', label: 'Bracket' },
  { path: '/admin/pontuacao', icon: '🏅', label: 'Pontuação' },
  { path: '/admin/galeria', icon: '🖼', label: 'Galeria' },
]

export default function AdminLayout() {
  const { user, loading } = useAuth()
  const nav = useNavigate()
  const { pathname } = useLocation()

  useEffect(() => {
    if (!loading && !user) nav('/admin/login')
  }, [user, loading, nav])

  async function logout() {
    await supabase.auth.signOut()
    nav('/admin/login')
  }

  if (loading) return <div style={{ minHeight: '100vh', background: 'var(--P)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--FC)', color: 'var(--MU)' }}>Carregando...</div>
  if (!user) return null

  const isActive = (path: string, exact?: boolean) =>
    exact ? pathname === path : pathname.startsWith(path)

  return (
    <div className="wrap">
      <div className="admin-wrap">
        {/* SIDEBAR */}
        <aside className="admin-sidebar">
          <div className="sb-label">Geral</div>
          {menu.slice(0, 1).map(item => (
            <button
              key={item.path}
              className={`sb-btn${isActive(item.path, item.exact) ? ' active' : ''}`}
              onClick={() => nav(item.path)}
            >
              <span className="sb-icon">{item.icon}</span>{item.label}
            </button>
          ))}

          <div className="sb-label">Conteúdo</div>
          {menu.slice(1).map(item => (
            <button
              key={item.path}
              className={`sb-btn${isActive(item.path) ? ' active' : ''}`}
              onClick={() => nav(item.path)}
            >
              <span className="sb-icon">{item.icon}</span>{item.label}
            </button>
          ))}

          <div style={{ marginTop: 'auto', borderTop: '1px solid var(--B)', paddingTop: '.5rem' }}>
            <button className="sb-btn" onClick={() => nav('/')} style={{ color: 'var(--MU2)' }}>
              <span className="sb-icon">🌐</span>Ver Site
            </button>
            <button className="sb-btn" onClick={logout} style={{ color: 'var(--R)' }}>
              <span className="sb-icon">→</span>Sair
            </button>
          </div>
        </aside>

        {/* CONTENT */}
        <main className="admin-content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
