import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { fmtData, statusClass, statusLabel } from '../lib/utils'
import { BracketView } from '../components/public/BracketView'
import { Footer } from '../components/ui/Footer'
import { ehCampeao, ehEquipe, equipeCampea, formatoLabel, tamanhoFormato } from '../lib/equipes'
import type { Edicao, MC, Foto } from '../types'
import { usePageMeta, useJsonLd, eventoJsonLd } from '../lib/pageMeta'
import { ENDERECO_CURTO } from '../lib/links'
import { Contagem } from '../components/public/Contagem'
import { EventoAcoes } from '../components/public/EventoAcoes'

export default function EdicaoDetalhe() {
  const { id } = useParams<{ id: string }>()
  const nav = useNavigate()
  const [ed, setEd] = useState<Edicao & { campeao?: MC | null } | null>(null)
  const [mcs, setMCs] = useState<MC[]>([])
  const [fotos, setFotos] = useState<Foto[]>([])
  const [allEds, setAllEds] = useState<{ id: string }[]>([])
  const [lightbox, setLightbox] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    Promise.all([
      supabase.from('edicoes').select('*, campeao:campeao_id(*)').eq('id', id).single(),
      supabase.from('mcs').select('*'),
      supabase.from('fotos').select('*').eq('edicao_id', id),
      supabase.from('edicoes').select('id').order('data', { ascending: true }),
    ]).then(([{ data: edData }, { data: mcsData }, { data: fotosData }, { data: allEdsData }]) => {
      setEd(edData as any)
      setMCs(mcsData ?? [])
      setFotos(fotosData ?? [])
      setAllEds(allEdsData ?? [])
      setLoading(false)
    })
  }, [id])

  usePageMeta(ed ? {
    title: ed.titulo,
    description: [
      ed.status === 'encerrada' ? 'Edição encerrada da Batalha do Céu' : 'Edição da Batalha do Céu',
      [fmtData(ed.data) !== '—' ? fmtData(ed.data) : '', ed.local].filter(Boolean).join(' · '),
      ed.descricao,
    ].filter(Boolean).join(' — '),
    image: ed.banner_url,
  } : { title: 'Edição' })

  useJsonLd(ed ? eventoJsonLd({
    nome: ed.titulo, data: ed.data, horario: ed.horario, local: ed.local,
    enderecoPadrao: ENDERECO_CURTO, descricao: ed.descricao, imagem: ed.banner_url,
  }) : null)

  if (loading) return <div className="wrap"><div className="section"><div className="aviso">Carregando...</div></div></div>
  if (!ed) return <div className="wrap"><div className="section"><div className="aviso">Edição não encontrada.</div></div></div>

  const num = allEds.findIndex(e => e.id === id) + 1
  const camp = ed.campeao as MC | null
  const participants = (ed.participantes ?? []).map(pid => mcs.find(m => m.id === pid)).filter(Boolean) as MC[]
  const isTeam = ehEquipe(ed.formato)
  const equipes = ed.equipes ?? []
  const campEquipe = equipeCampea(ed)
  const mcName = (mid: string) => mcs.find(m => m.id === mid)?.nome ?? '?'
  const goMC = (mid: string) => { nav(`/mcs/${mid}`); window.scrollTo(0, 0) }

  return (
    <div className="wrap">
      <div className="page-wrap">
        <button className="btn btn-o btn-sm" style={{ marginBottom: '2rem' }} onClick={() => { nav('/edicoes'); window.scrollTo(0, 0) }}>
          ← Voltar
        </button>

        <div style={{ display: 'flex', gap: '.75rem', alignItems: 'center', flexWrap: 'wrap', marginBottom: '.5rem' }}>
          <div className="sec-label">Edição #{String(num).padStart(2, '0')}</div>
          <span className={`status-pill ${statusClass(ed.status)}`}>{statusLabel(ed.status)}</span>
        </div>
        <div className="sec-title">{ed.titulo}</div>

        {ed.banner_url && (
          <div style={{ marginBottom: '2rem', overflow: 'hidden', border: '1px solid var(--B)' }}>
            <img src={ed.banner_url} alt="" style={{ width: '100%', height: 'auto', display: 'block' }} />
          </div>
        )}

        <div className="split-2" style={{ marginBottom: '2.5rem' }}>
          <div>
            {ed.data && <div className="detail-item"><div className="detail-icon">📅</div><div><div className="detail-label">Data</div><div className="detail-val">{fmtData(ed.data)}</div></div></div>}
            {ed.horario && <div className="detail-item"><div className="detail-icon">⏰</div><div><div className="detail-label">Horário</div><div className="detail-val">{ed.horario}</div></div></div>}
            {ed.local && <div className="detail-item"><div className="detail-icon">📍</div><div><div className="detail-label">Local</div><div className="detail-val">{ed.local}</div></div></div>}
            <div className="detail-item"><div className="detail-icon">👥</div><div><div className="detail-label">Formato</div><div className="detail-val">
              {isTeam
                ? (equipes.length
                    ? `Batalha de ${formatoLabel(ed.formato)} · ${equipes.length} equipes de ${tamanhoFormato(ed.formato)} MCs · Eliminação Simples`
                    : `Batalha de ${formatoLabel(ed.formato)} · ${ed.limite} MCs · Eliminação Simples`)
                : `${ed.limite} MCs · Eliminação Simples`}
            </div></div></div>
            {ed.status !== 'encerrada' && <Contagem data={ed.data} horario={ed.horario} />}
            <EventoAcoes encerrado={ed.status === 'encerrada'} evento={{ titulo: ed.titulo, data: ed.data, horario: ed.horario, local: ed.local, descricao: ed.descricao, path: `/edicoes/${ed.id}` }} />
          </div>
          <div>
            {ed.descricao && <p style={{ fontFamily: 'var(--FC)', fontSize: '.95rem', color: 'var(--W2)', lineHeight: 1.75, marginBottom: '1.25rem' }}>{ed.descricao}</p>}
            {(camp || campEquipe) && (
              <div style={{ background: 'rgba(245,200,66,.07)', border: '1px solid rgba(245,200,66,.3)', padding: '1.2rem 1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <span style={{ fontSize: '1.5rem' }}>🏆</span>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontFamily: 'var(--FC)', fontSize: '.65rem', fontWeight: 700, letterSpacing: '.22em', textTransform: 'uppercase', color: 'var(--Y)' }}>
                    {campEquipe ? `${formatoLabel(ed.formato)} Campeã` : 'Campeão'}
                  </div>
                  <div style={{ fontFamily: 'var(--FD)', fontSize: '1.8rem', color: 'var(--Y)', lineHeight: 1, overflowWrap: 'anywhere' }}>{camp?.nome ?? campEquipe?.nome}</div>
                  {campEquipe && (
                    <div style={{ fontFamily: 'var(--FC)', fontSize: '.78rem', color: 'var(--W2)', marginTop: '.35rem' }}>
                      {campEquipe.membros.map(mcName).join(' · ')}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {isTeam && equipes.length > 0 ? (
          <div style={{ marginBottom: '2.5rem' }}>
            <div className="sec-label" style={{ marginBottom: '.75rem' }}>Equipes</div>
            <div className="grid-1px" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(230px,1fr))', background: 'transparent', gap: '.5rem' }}>
              {equipes.map(eq => {
                const champ = campEquipe?.id === eq.id
                return (
                  <div key={eq.id} className={`team-card${champ ? ' champ' : ''}`}>
                    <div className="team-card-name">{eq.nome}{champ ? ' 🏆' : ''}</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.3rem' }}>
                      {eq.membros.map(mid => (
                        <span key={mid} className={`tag ${champ ? 'tag-champ' : 'tag-part'}`} onClick={() => goMC(mid)}>{mcName(mid)}</span>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ) : participants.length > 0 && (
          <div style={{ marginBottom: '2.5rem' }}>
            <div className="sec-label" style={{ marginBottom: '.75rem' }}>Participantes</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.4rem' }}>
              {participants.map(mc => (
                <span
                  key={mc.id}
                  className={`tag ${ehCampeao(ed, mc.id) ? 'tag-champ' : 'tag-part'}`}
                  onClick={() => goMC(mc.id)}
                >
                  {mc.nome}{ehCampeao(ed, mc.id) ? ' 🏆' : ''}
                </span>
              ))}
            </div>
          </div>
        )}

        {ed.bracket && ed.bracket.phases && ed.bracket.phases.length > 0 && (
          <div style={{ marginBottom: '2.5rem' }}>
            <div className="sec-label" style={{ marginBottom: '1rem' }}>Chaveamento</div>
            <BracketView bracket={ed.bracket} mcs={mcs} equipes={isTeam ? equipes : undefined} participantCount={participants.length} />
          </div>
        )}

        {fotos.length > 0 && (
          <div>
            <div className="sec-label" style={{ marginBottom: '1rem' }}>Fotos</div>
            <div className="galeria-grid">
              {fotos.map(f => (
                <div key={f.id} className="galeria-item" onClick={() => setLightbox(f.url)}>
                  <img src={f.url} alt={f.nome ?? ''} loading="lazy" />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {lightbox && (
        <div className="lightbox" onClick={() => setLightbox(null)}>
          <img src={lightbox} className="lightbox-img" alt="" />
          <button className="lightbox-close" onClick={() => setLightbox(null)}>✕</button>
        </div>
      )}

      <Footer />
    </div>
  )
}
