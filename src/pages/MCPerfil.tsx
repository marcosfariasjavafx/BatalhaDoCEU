import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { MCAvatar } from '../components/ui/MCAvatar'
import { Footer } from '../components/ui/Footer'
import { ehCampeao } from '../lib/equipes'
import type { MC, Edicao } from '../types'

export default function MCPerfil() {
  const { id } = useParams<{ id: string }>()
  const nav = useNavigate()
  const [mc, setMC] = useState<MC | null>(null)
  const [pos, setPos] = useState(0)
  const [edicoesPart, setEdicoesPart] = useState<Pick<Edicao, 'id' | 'titulo' | 'status' | 'campeao_id' | 'campeoes' | 'participantes'>[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    Promise.all([
      supabase.from('mcs').select('*').eq('id', id).single(),
      supabase.from('mcs').select('id,pontos').order('pontos', { ascending: false }),
      supabase.from('edicoes').select('id,titulo,status,campeao_id,campeoes,participantes').order('data', { ascending: false }),
    ]).then(([{ data: mcData }, { data: allMCs }, { data: eds }]) => {
      setMC(mcData)
      setPos((allMCs ?? []).findIndex(m => m.id === id) + 1)
      setEdicoesPart((eds ?? []).filter(e => (e.participantes ?? []).includes(id!)))
      setLoading(false)
    })
  }, [id])

  if (loading) return <div className="wrap"><div className="section"><div className="aviso">Carregando...</div></div></div>
  if (!mc) return <div className="wrap"><div className="section"><div className="aviso">MC não encontrado.</div></div></div>

  return (
    <div className="wrap">
      <div className="page-wrap" style={{ maxWidth: 880 }}>
        <button className="btn btn-o btn-sm" style={{ marginBottom: '2rem' }} onClick={() => { nav('/mcs'); window.scrollTo(0, 0) }}>
          ← Voltar
        </button>

        <div style={{ display: 'flex', gap: '2.5rem', alignItems: 'flex-start', marginBottom: '2.5rem', flexWrap: 'wrap' }}>
          <MCAvatar id={mc.id} nome={mc.nome} fotoUrl={mc.foto_url} size={150} />
          <div style={{ flex: '1 1 260px', minWidth: 0 }}>
            <div style={{ fontFamily: 'var(--FC)', fontSize: '.68rem', fontWeight: 700, letterSpacing: '.22em', textTransform: 'uppercase', color: 'var(--Y)', marginBottom: '.4rem' }}>
              #{pos} no Ranking
            </div>
            <div style={{ fontFamily: 'var(--FD)', fontSize: 'clamp(2.5rem,6vw,4rem)', textTransform: 'uppercase', lineHeight: .92, marginBottom: '.4rem' }}>
              {mc.nome}
            </div>
            <div style={{ fontFamily: 'var(--FC)', fontSize: '.9rem', color: 'var(--MU)', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: '1.4rem' }}>
              {mc.cidade ?? '—'}
            </div>
            <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
              {[{ val: mc.pontos, lbl: 'Pontos' }, { val: mc.titulos, lbl: 'Títulos' }, { val: edicoesPart.length, lbl: 'Edições' }].map(s => (
                <div key={s.lbl}>
                  <div style={{ fontFamily: 'var(--FD)', fontSize: '1.8rem', color: 'var(--Y)', lineHeight: 1 }}>{s.val}</div>
                  <div style={{ fontFamily: 'var(--FC)', fontSize: '.6rem', fontWeight: 700, letterSpacing: '.15em', textTransform: 'uppercase', color: 'var(--MU)' }}>{s.lbl}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {mc.bio && (
          <div style={{ maxWidth: 620, marginBottom: '2rem', fontSize: '.98rem', color: 'var(--W2)', lineHeight: 1.8 }}>{mc.bio}</div>
        )}

        <div>
          <div className="sec-label" style={{ marginBottom: '.75rem' }}>Edições Participadas</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.4rem' }}>
            {edicoesPart.length ? edicoesPart.map(e => (
              <span
                key={e.id}
                className={`tag ${ehCampeao(e, id!) ? 'tag-champ' : 'tag-part'}`}
                onClick={() => { nav(`/edicoes/${e.id}`); window.scrollTo(0, 0) }}
              >
                {e.titulo}{ehCampeao(e, id!) ? ' 🏆' : ''}
              </span>
            )) : (
              <span style={{ fontFamily: 'var(--FC)', fontSize: '.85rem', color: 'var(--MU)' }}>Nenhuma edição ainda.</span>
            )}
          </div>
        </div>
      </div>
      <Footer />
    </div>
  )
}
