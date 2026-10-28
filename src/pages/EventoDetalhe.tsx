import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { fmtData, statusClass, statusLabel } from '../lib/utils'
import { categoriaIcon, categoriaLabel, linkSeguro } from '../lib/eventos'
import { Footer } from '../components/ui/Footer'
import { usePageMeta, useJsonLd, eventoJsonLd } from '../lib/pageMeta'
import { ENDERECO_CURTO } from '../lib/links'
import { Contagem } from '../components/public/Contagem'
import { EventoAcoes } from '../components/public/EventoAcoes'
import type { Evento, Foto } from '../types'

export default function EventoDetalhe() {
  const { id } = useParams<{ id: string }>()
  const nav = useNavigate()
  const [ev, setEv] = useState<Evento | null>(null)
  const [fotos, setFotos] = useState<Foto[]>([])
  const [lightbox, setLightbox] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) { setLoading(false); return }
    setLoading(true)
    Promise.all([
      supabase.from('eventos').select('*').eq('id', id).maybeSingle(),
      supabase.from('fotos').select('*').eq('evento_id', id).order('created_at', { ascending: false }),
    ]).then(([{ data }, { data: f }]) => { setEv((data as Evento) ?? null); setFotos(f ?? []); setLoading(false) })
  }, [id])

  usePageMeta(ev ? {
    title: ev.titulo,
    description: [
      `${categoriaLabel(ev.categoria)} da Batalha do Céu`,
      [fmtData(ev.data) !== '—' ? fmtData(ev.data) : '', ev.horario, ev.local].filter(Boolean).join(' · '),
      ev.descricao,
    ].filter(Boolean).join(' — '),
    image: ev.banner_url,
  } : { title: 'Evento' })

  useJsonLd(ev ? eventoJsonLd({
    nome: ev.titulo, data: ev.data, horario: ev.horario, local: ev.local,
    enderecoPadrao: ENDERECO_CURTO, descricao: ev.descricao, imagem: ev.banner_url,
  }) : null)

  const voltar = () => { nav('/calendario'); window.scrollTo(0, 0) }

  if (loading) return <div className="wrap"><div className="section"><div className="aviso">Carregando...</div></div></div>
  if (!ev) return (
    <div className="wrap">
      <div className="page-wrap">
        <button className="btn btn-o btn-sm" style={{ marginBottom: '2rem' }} onClick={voltar}>← Voltar</button>
        <div className="aviso">Evento não encontrado.</div>
      </div>
      <Footer />
    </div>
  )

  const link = linkSeguro(ev.link_url)
  const mapsUrl = ev.local ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(ev.local)}` : null
  const encerrado = ev.status === 'encerrada'

  return (
    <div className="wrap">
      <div className="page-wrap">
        <button className="btn btn-o btn-sm" style={{ marginBottom: '2rem' }} onClick={voltar}>← Voltar</button>

        <div style={{ display: 'flex', gap: '.75rem', alignItems: 'center', flexWrap: 'wrap', marginBottom: '.5rem' }}>
          <div className="sec-label">{categoriaIcon(ev.categoria)} {categoriaLabel(ev.categoria)}</div>
          <span className={`status-pill ${statusClass(ev.status)}`}>{statusLabel(ev.status)}</span>
        </div>
        <div className="sec-title" style={{ overflowWrap: 'anywhere' }}>{ev.titulo}</div>

        {ev.banner_url && (
          <div style={{ marginBottom: '2rem', overflow: 'hidden', border: '1px solid var(--B)' }}>
            <img src={ev.banner_url} alt={ev.titulo} decoding="async" style={{ width: '100%', height: 'auto', display: 'block' }} />
          </div>
        )}

        <div className="split-2" style={{ marginBottom: '2.5rem' }}>
          <div>
            {ev.data && <div className="detail-item"><div className="detail-icon">📅</div><div><div className="detail-label">Data</div><div className="detail-val">{fmtData(ev.data)}</div></div></div>}
            {ev.horario && <div className="detail-item"><div className="detail-icon">⏰</div><div><div className="detail-label">Horário</div><div className="detail-val">{ev.horario}</div></div></div>}
            {ev.local && (
              <div className="detail-item"><div className="detail-icon">📍</div><div>
                <div className="detail-label">Local</div>
                <div className="detail-val">{ev.local}</div>
                {mapsUrl && <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="detail-link" style={{ fontFamily: 'var(--FC)', fontSize: '.78rem', color: 'var(--Y)' }}>Ver no mapa ↗</a>}
              </div></div>
            )}
            <div className="detail-item"><div className="detail-icon">{categoriaIcon(ev.categoria)}</div><div><div className="detail-label">Tipo</div><div className="detail-val">{categoriaLabel(ev.categoria)}</div></div></div>
            {!encerrado && <Contagem data={ev.data} horario={ev.horario} />}
            <EventoAcoes encerrado={encerrado} evento={{ titulo: ev.titulo, data: ev.data, horario: ev.horario, local: ev.local, descricao: ev.descricao, path: `/eventos/${ev.id}` }} />
          </div>
          <div>
            {ev.descricao && <p style={{ fontFamily: 'var(--FC)', fontSize: '.95rem', color: 'var(--W2)', lineHeight: 1.75, marginBottom: '1.25rem', whiteSpace: 'pre-line' }}>{ev.descricao}</p>}
            {link && !encerrado && (
              <a href={link} target="_blank" rel="noopener noreferrer" className="btn btn-y">Ingressos / Mais informações ↗</a>
            )}
            {link && encerrado && (
              <a href={link} target="_blank" rel="noopener noreferrer" className="btn btn-o">Saiba mais ↗</a>
            )}
          </div>
        </div>

        {fotos.length > 0 && (
          <div>
            <div className="sec-label" style={{ marginBottom: '1rem' }}>Fotos</div>
            <div className="galeria-grid">
              {fotos.map(f => (
                <div key={f.id} className="galeria-item" onClick={() => setLightbox(f.url)}>
                  <img src={f.url} alt={f.nome ?? ''} loading="lazy" decoding="async" />
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
