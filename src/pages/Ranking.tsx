import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { MCAvatar } from '../components/ui/MCAvatar'
import { Footer } from '../components/ui/Footer'
import type { MC } from '../types'
import { usePageMeta } from '../lib/pageMeta'

export default function Ranking() {
  usePageMeta({ title: 'Ranking de MCs', description: 'Ranking oficial da Batalha do Céu: os MCs com mais pontos e títulos nas batalhas de freestyle.' })
  const nav = useNavigate()
  const [mcs, setMCs] = useState<MC[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('mcs').select('*').order('pontos', { ascending: false })
      .then(({ data }) => { setMCs(data ?? []); setLoading(false) })
  }, [])

  return (
    <div className="wrap">
      <section className="section">
        <div className="container-sm">
          <div className="sec-label">Classificação</div>
          <div className="sec-title">Ranking Geral</div>
          <p style={{ fontFamily: 'var(--FC)', color: 'var(--MU)', marginBottom: '2rem', fontSize: '.85rem', letterSpacing: '.06em', textTransform: 'uppercase' }}>
            Pontuação acumulada em todas as edições · Atualizado automaticamente
          </p>
          {loading ? <div className="aviso">Carregando...</div> : (
            <div className="grid-1px">
              {mcs.map((mc, i) => (
                <div
                  key={mc.id}
                  className={`rank-item${i === 0 ? ' rank-1' : ''}`}
                  onClick={() => { nav(`/mcs/${mc.id}`); window.scrollTo(0, 0) }}
                >
                  <div className="rank-pos">{i + 1}</div>
                  <MCAvatar id={mc.id} nome={mc.nome} fotoUrl={mc.foto_url} size={44} />
                  <div>
                    <div className="rank-nome">{mc.nome}</div>
                    <div className="rank-city">{mc.cidade ?? '—'}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div className="rank-pts-val">{mc.pontos}</div>
                    <div className="rank-pts-lbl">pts</div>
                  </div>
                </div>
              ))}
              {!mcs.length && <div className="aviso">Nenhum MC cadastrado ainda.</div>}
            </div>
          )}
        </div>
      </section>
      <Footer />
    </div>
  )
}
