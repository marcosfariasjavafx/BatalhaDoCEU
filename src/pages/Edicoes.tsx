import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { fmtData, statusClass, statusLabel } from '../lib/utils'
import { Footer } from '../components/ui/Footer'
import { ehEquipe, equipeCampea, formatoLabel } from '../lib/equipes'
import type { Edicao, MC } from '../types'

type EdicaoWithCamp = Edicao & { campeao?: MC | null }

export default function Edicoes() {
  const nav = useNavigate()
  const [edicoes, setEdicoes] = useState<EdicaoWithCamp[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('edicoes').select('*, campeao:campeao_id(*)').order('data', { ascending: false })
      .then(({ data }) => { setEdicoes((data ?? []) as any); setLoading(false) })
  }, [])

  return (
    <div className="wrap">
      <section className="section">
        <div className="container">
          <div className="sec-label">Histórico</div>
          <div className="sec-title">Edições</div>
          {loading ? <div className="aviso">Carregando...</div> : (
            <div className="grid-1px" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))' }}>
              {edicoes.map((ed, idx) => {
                const num = edicoes.length - idx
                return (
                  <div key={ed.id} className="ed-card" onClick={() => { nav(`/edicoes/${ed.id}`); window.scrollTo(0, 0) }}>
                    <div className="ed-card-banner">
                      {ed.banner_url ? <img src={ed.banner_url} alt="" /> : <div className="ed-card-banner-ph">BDC{String(num).padStart(2, '0')}</div>}
                      <span className={`status-pill ${statusClass(ed.status)}`}>{statusLabel(ed.status)}</span>
                    </div>
                    <div className="ed-card-body">
                      <div className="ed-card-num">Edição #{String(num).padStart(2, '0')}</div>
                      <div className="ed-card-title">{ed.titulo}</div>
                      <div className="ed-card-meta">
                        <span className="ed-meta-item">{fmtData(ed.data)}</span>
                        {ed.local && <span className="ed-meta-item">· {ed.local}</span>}
                        {ehEquipe(ed.formato) && <span className="ed-meta-item">· {formatoLabel(ed.formato)}</span>}
                        {ed.campeao && <span className="ed-meta-item">· 🏆 {(ed.campeao as any).nome}</span>}
                        {!ed.campeao && equipeCampea(ed) && <span className="ed-meta-item">· 🏆 {equipeCampea(ed)!.nome}</span>}
                      </div>
                    </div>
                  </div>
                )
              })}
              {!edicoes.length && <div className="aviso" style={{ gridColumn: '1/-1' }}>Nenhuma edição cadastrada.</div>}
            </div>
          )}
        </div>
      </section>
      <Footer />
    </div>
  )
}
