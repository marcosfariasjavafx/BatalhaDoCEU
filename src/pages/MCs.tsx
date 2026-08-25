import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { MCAvatar } from '../components/ui/MCAvatar'
import { Footer } from '../components/ui/Footer'
import type { MC } from '../types'

export default function MCs() {
  const nav = useNavigate()
  const [mcs, setMCs] = useState<MC[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('mcs').select('*').order('pontos', { ascending: false })
      .then(({ data }) => { setMCs(data ?? []); setLoading(false) })
  }, [])

  const go = (id: string) => { nav(`/mcs/${id}`); window.scrollTo(0, 0) }

  return (
    <div className="wrap">
      <section className="section">
        <div className="container">
          <div className="sec-label">Os Guerreiros</div>
          <div className="sec-title">MCs</div>
          {loading
            ? <div className="aviso">Carregando...</div>
            : (
              <div className="grid-1px" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(190px,1fr))' }}>
                {mcs.map((mc, i) => (
                  <div key={mc.id} className="mc-card" onClick={() => go(mc.id)}>
                    <div className="mc-pts-bg">{mc.pontos}</div>
                    <MCAvatar id={mc.id} nome={mc.nome} fotoUrl={mc.foto_url} />
                    <div className="mc-rank-badge">#{i + 1} no ranking</div>
                    <div className="mc-nome">{mc.nome}</div>
                    <div className="mc-cidade">{mc.cidade ?? '—'}</div>
                  </div>
                ))}
                {!mcs.length && <div className="aviso" style={{ gridColumn: '1/-1' }}>Nenhum MC cadastrado ainda.</div>}
              </div>
            )}
        </div>
      </section>
      <Footer />
    </div>
  )
}
