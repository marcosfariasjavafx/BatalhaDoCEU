import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import type { Edicao } from '../../types'

export default function Dashboard() {
  const nav = useNavigate()
  const [stats, setStats] = useState({ mcs: 0, edicoes: 0, fotos: 0 })
  const [proxima, setProxima] = useState<Edicao | null>(null)

  useEffect(() => {
    Promise.all([
      supabase.from('mcs').select('*', { count: 'exact', head: true }),
      supabase.from('edicoes').select('*', { count: 'exact', head: true }),
      supabase.from('fotos').select('*', { count: 'exact', head: true }),
      supabase.from('edicoes').select('*').in('status', ['confirmada', 'em-breve']).order('data').limit(1),
    ]).then(([mcsR, edsR, fotosR, proxR]) => {
      setStats({ mcs: mcsR.count ?? 0, edicoes: edsR.count ?? 0, fotos: fotosR.count ?? 0 })
      setProxima(proxR.data?.[0] ?? null)
    })
  }, [])

  const atalhos = [
    { icon: '🎤', label: '+ Novo MC', path: '/admin/mcs' },
    { icon: '📋', label: '+ Nova Edição', path: '/admin/edicoes' },
    { icon: '⚡', label: 'Gerenciar Bracket', path: '/admin/bracket' },
    { icon: '🖼', label: 'Upload de Fotos', path: '/admin/galeria' },
  ]

  return (
    <div>
      <div className="admin-panel-title">Dashboard</div>

      {/* Stats */}
      <div className="grid-1px" style={{ gridTemplateColumns: 'repeat(3,1fr)', marginBottom: '2rem' }}>
        {[
          { lbl: 'MCs Cadastrados', val: stats.mcs },
          { lbl: 'Edições', val: stats.edicoes },
          { lbl: 'Fotos', val: stats.fotos },
        ].map(s => (
          <div key={s.lbl} className="stat-card">
            <div className="stat-label">{s.lbl}</div>
            <div className="stat-val">{s.val}</div>
          </div>
        ))}
      </div>

      {/* Próxima edição */}
      {proxima && (
        <div style={{ background: 'var(--P3)', border: '1px solid rgba(245,200,66,.2)', padding: '1.2rem 1.5rem', marginBottom: '2rem' }}>
          <div className="sec-label" style={{ marginBottom: '.3rem' }}>Próxima Edição</div>
          <div style={{ fontFamily: 'var(--FD)', fontSize: '1.4rem', textTransform: 'uppercase', marginBottom: '.75rem' }}>{proxima.titulo}</div>
          <div style={{ display: 'flex', gap: '.75rem', flexWrap: 'wrap' }}>
            <button className="btn btn-y btn-sm" onClick={() => nav('/admin/bracket')}>⚡ Gerenciar Bracket</button>
            <button className="btn btn-o btn-sm" onClick={() => nav('/admin/edicoes')}>Editar Edição</button>
          </div>
        </div>
      )}

      {/* Atalhos */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        {atalhos.map(a => (
          <button
            key={a.path}
            onClick={() => nav(a.path)}
            style={{
              background: 'var(--P3)', border: '1px solid var(--B)', padding: '1.2rem',
              display: 'flex', alignItems: 'center', gap: '.75rem',
              fontFamily: 'var(--FC)', fontSize: '.9rem', fontWeight: 700,
              letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--MU)',
              cursor: 'pointer', transition: 'border-color .2s, color .2s',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--Y)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--Y)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--B)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--MU)' }}
          >
            <span style={{ fontSize: '1.1rem' }}>{a.icon}</span>{a.label}
          </button>
        ))}
      </div>
    </div>
  )
}
