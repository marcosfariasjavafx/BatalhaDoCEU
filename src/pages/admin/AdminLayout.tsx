import { useEffect, useState } from 'react'
import { useNavigate, useLocation, Outlet } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { useNoIndex } from './useNoIndex'

const menu = [
  { path: '/admin', icon: '◈', label: 'Dashboard', exact: true },
  { path: '/admin/mcs', icon: '🎤', label: 'MCs' },
  { path: '/admin/edicoes', icon: '📋', label: 'Edições / Eventos' },
  { path: '/admin/bracket', icon: '⚡', label: 'Bracket' },
  { path: '/admin/pontuacao', icon: '🏅', label: 'Pontuação' },
  { path: '/admin/galeria', icon: '🖼', label: 'Galeria' },
]

export default function AdminLayout() {
  useNoIndex()
  const { user, loading } = useAuth()
  const nav = useNavigate()
  const { pathname } = useLocation()
  // null = verificando · true/false = está (ou não) na lista de administradores
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null)

  useEffect(() => {
    if (!loading && !user) nav('/admin/login')
  }, [user, loading, nav])

  useEffect(() => {
    if (!user) { setIsAdmin(null); return }
    supabase.from('admins').select('user_id').eq('user_id', user.id).maybeSingle()
      .then(({ data }) => setIsAdmin(!!data))
  }, [user])

  async function logout() {
    await supabase.auth.signOut()
    nav('/admin/login')
  }

  if (loading) return <div style={{ minHeight: '100vh', background: 'var(--P)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--FC)', color: 'var(--MU)' }}>Carregando...</div>
  if (!user) return null
  if (isAdmin === null) return <div style={{ minHeight: '100vh', background: 'var(--P)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--FC)', color: 'var(--MU)' }}>Verificando acesso...</div>
  if (!isAdmin) return (
    <div style={{ minHeight: '100vh', background: 'var(--P)', display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center', justifyContent: 'center', padding: '2rem', textAlign: 'center', fontFamily: 'var(--FC)', color: 'var(--MU)' }}>
      <div style={{ fontSize: '1.1rem', color: 'var(--W)' }}>Esta conta não tem permissão de administrador.</div>
      <button className="btn btn-o btn-sm" onClick={logout}>Sair</button>
    </div>
  )

  const isActive = (path: string, exact?: boolean) =>
    exact ? pathname === path : pathname.startsWith(path)

  return (
    <div className="wrap">
      {/* Barra própria do painel (a Navbar pública não aparece aqui) */}
      <nav id="nav">
        <div className="nav-logo" onClick={() => nav('/admin')}>BATALHA<span>&nbsp;DO CÉU</span></div>
        <div style={{ fontFamily: 'var(--FC)', fontSize: '.7rem', fontWeight: 700, letterSpacing: '.18em', textTransform: 'uppercase', color: 'var(--MU)' }}>
          Painel Administrativo
        </div>
      </nav>
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
