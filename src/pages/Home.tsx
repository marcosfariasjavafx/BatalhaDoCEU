import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { fmtData, statusClass, statusLabel } from '../lib/utils'
import { MCAvatar } from '../components/ui/MCAvatar'
import { Footer } from '../components/ui/Footer'
import { RankingTicker } from '../components/ui/RankingTicker'
import { ehEquipe, equipeCampea, formatoLabel } from '../lib/equipes'
import { categoriaIcon, categoriaLabel, linkSeguro } from '../lib/eventos'
import type { MC, Edicao, Evento } from '../types'
import { usePageMeta } from '../lib/pageMeta'
import { Contagem } from '../components/public/Contagem'
import { EventoAcoes } from '../components/public/EventoAcoes'

const FEED_IMAGES = [
  '/assets/feed/feed_00.webp',
  '/assets/feed/feed_01.webp',
  '/assets/feed/feed_02.webp',
  '/assets/feed/feed_03.webp',
  '/assets/feed/feed_04.webp',
  '/assets/feed/feed_05.webp',
  '/assets/feed/feed_06.webp',
  '/assets/feed/feed_07.webp',
  '/assets/feed/feed_08.webp',
  '/assets/feed/feed_09.webp',
]

export default function Home() {
  usePageMeta({ title: "Batalha do Céu — Batalha de MCs em Santa Bárbara d'Oeste", completo: true })
  const nav = useNavigate()
  const [mcs, setMCs] = useState<MC[]>([])
  const [allMcs, setAllMcs] = useState<MC[]>([])
  const [nextEd, setNextEd] = useState<Edicao | null>(null)
  const [encerradas, setEncerradas] = useState<(Edicao & { campeao?: MC | null })[]>([])
  const [ranking, setRanking] = useState<MC[]>([])
  const [edCount, setEdCount] = useState(0)
  const [slideIdx, setSlideIdx] = useState(0)
  // Slides já exibidos: só eles (e o próximo) são carregados, em vez das 10 fotos de uma vez
  const vistos = useRef<Set<number>>(new Set())
  vistos.current.add(slideIdx)
  const [eventos, setEventos] = useState<Evento[]>([])
  const [eventosPassados, setEventosPassados] = useState<Evento[]>([])

  useEffect(() => {
    // Eventos (shows, breakdance...): separa os próximos dos anteriores
    supabase.from('eventos').select('*').order('data', { ascending: false }).limit(100)
      .then(({ data }) => {
        const hoje = new Date(); hoje.setHours(0, 0, 0, 0)
        const jaPassou = (ev: Evento) => {
          if (ev.status === 'encerrada') return true
          if (!ev.data) return false
          const [y, m, d] = ev.data.split('-').map(Number)
          return new Date(y, m - 1, d) < hoje
        }
        const todos = (data ?? []) as Evento[]
        // Próximos: mais perto primeiro; sem data vão para o fim
        const futuros = todos.filter(ev => !jaPassou(ev))
          .sort((a, b) => (a.data ?? '9999').localeCompare(b.data ?? '9999'))
        // Anteriores: mais recentes primeiro
        const passados = todos.filter(jaPassou)
          .sort((a, b) => (b.data ?? '').localeCompare(a.data ?? ''))
        setEventos(futuros.slice(0, 3))
        setEventosPassados(passados.slice(0, 6))
      })
    // Uma única consulta de MCs (já ordenada por pontos): Top MCs, ranking e ticker saem dela
    supabase.from('mcs').select('*').order('pontos', { ascending: false })
      .then(({ data }) => {
        const todos = (data ?? []) as MC[]
        setAllMcs(todos); setMCs(todos.slice(0, 6)); setRanking(todos.slice(0, 5))
      })
    supabase.from('edicoes').select('*').in('status', ['confirmada', 'em-breve']).order('data').limit(1)
      .then(({ data }) => setNextEd(data?.[0] ?? null))
    supabase.from('edicoes').select('*, campeao:campeao_id(*)').eq('status', 'encerrada')
      .order('data', { ascending: false }).limit(3)
      .then(({ data }) => { setEncerradas((data ?? []) as any); setEdCount((data ?? []).length) })
  }, [])

  // Auto-advance slideshow every 4s
  useEffect(() => {
    const timer = setInterval(() => {
      setSlideIdx(i => (i + 1) % FEED_IMAGES.length)
    }, 4000)
    return () => clearInterval(timer)
  }, [])

  const go = (path: string) => { nav(path); window.scrollTo(0, 0) }

  return (
    <div className="wrap">
      {/* HERO */}
      <section className="hero">
        {/* Slideshow background */}
        <div className="hero-slideshow">
          {FEED_IMAGES.map((src, i) => {
            const proximo = i === (slideIdx + 1) % FEED_IMAGES.length
            return (
              <div key={src} className={`hero-slide${i === slideIdx ? ' active' : ''}`}>
                {(vistos.current.has(i) || proximo) && <img src={src} alt="" decoding="async" />}
                <div className="hero-slide-overlay" />
              </div>
            )
          })}
        </div>

        <div className="hero-radial" />
        <div className="hero-grid" />
        <div className="hero-bg-text">{edCount + 1}</div>
        <div className="hero-content">
          <div className="hero-pill">Santa Bárbara d'Oeste · SP · Brasil</div>
          <h1>BATALHA<em>DO CÉU</em></h1>
          <p className="hero-sub">Hip-Hop · Freestyle · Cultura de Rua · Desde 2018</p>
          <div className="hero-actions">
            <button className="btn btn-y" onClick={() => go('/edicoes')}>Ver Próxima Edição</button>
            <button className="btn btn-o" onClick={() => go('/sobre')}>Conhecer o Projeto</button>
          </div>
        </div>

        {/* Slideshow dots */}
        <div className="hero-dots">
          {FEED_IMAGES.map((_, i) => (
            <button key={i} className={`hero-dot${i === slideIdx ? ' active' : ''}`} onClick={() => setSlideIdx(i)} />
          ))}
        </div>

        <div className="hero-scroll">Scroll</div>
      </section>

      {/* RANKING TICKER */}
      <RankingTicker mcs={allMcs} />

      {/* PRÓXIMA EDIÇÃO */}
      <section className="section" style={{ background: 'var(--P2)', borderTop: '1px solid var(--B)' }}>
        <div className="container">
          <div className="sec-label">Em Destaque</div>
          <div className="sec-title">Próxima Edição</div>
          {nextEd ? (
            <div className="next-ed-card">
              <div style={{ background: 'var(--P4)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', minHeight: 200 }}>
                {nextEd.banner_url
                  ? <img src={nextEd.banner_url} alt="" style={{ width: '100%', height: 'auto', display: 'block' }} />
                  : <div style={{ fontFamily: 'var(--FD)', fontSize: '4rem', color: 'rgba(171,49,48,.15)', padding: '2rem' }}>BDC</div>}
              </div>
              <div style={{ background: 'var(--P3)', padding: '2rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div className="sec-label">{statusLabel(nextEd.status)}</div>
                  <div style={{ fontFamily: 'var(--FD)', fontSize: '2rem', textTransform: 'uppercase', lineHeight: 1, marginBottom: '1.2rem' }}>{nextEd.titulo}</div>
                  <Contagem data={nextEd.data} horario={nextEd.horario} />
                  {nextEd.data && <div className="detail-item"><div className="detail-icon">📅</div><div><div className="detail-label">Data</div><div className="detail-val">{fmtData(nextEd.data)}</div></div></div>}
                  {nextEd.horario && <div className="detail-item"><div className="detail-icon">⏰</div><div><div className="detail-label">Horário</div><div className="detail-val">{nextEd.horario}</div></div></div>}
                  {nextEd.local && <div className="detail-item"><div className="detail-icon">📍</div><div><div className="detail-label">Local</div><div className="detail-val">{nextEd.local}</div></div></div>}
                  <EventoAcoes evento={{ titulo: nextEd.titulo, data: nextEd.data, horario: nextEd.horario, local: nextEd.local, descricao: nextEd.descricao, path: `/edicoes/${nextEd.id}` }} />
                </div>
                <button className="btn btn-y" style={{ marginTop: '1.2rem' }} onClick={() => go(`/edicoes/${nextEd.id}`)}>Ver Detalhes</button>
              </div>
            </div>
          ) : <div className="aviso">Nenhuma edição programada no momento.</div>}
        </div>
      </section>

      {/* PRÓXIMOS EVENTOS (shows, breakdance...) — só aparece se houver evento agendado */}
      {eventos.length > 0 && (
        <section className="section" style={{ borderTop: '1px solid var(--B)' }}>
          <div className="container">
            <div className="sec-label">Além das Batalhas</div>
            <div className="sec-title">Próximos Eventos</div>
            <div className="grid-1px" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))' }}>
              {eventos.map(ev => {
                const link = linkSeguro(ev.link_url)
                return (
                  <div key={ev.id} className="ed-card" onClick={() => go(`/eventos/${ev.id}`)}>
                    <div className="ed-card-banner">
                      {ev.banner_url ? <img src={ev.banner_url} alt="" loading="lazy" decoding="async" /> : <div className="ed-card-banner-ph">{categoriaIcon(ev.categoria)}</div>}
                      <span className={`status-pill ${statusClass(ev.status)}`}>{statusLabel(ev.status)}</span>
                    </div>
                    <div className="ed-card-body">
                      <div className="ed-card-num">{categoriaIcon(ev.categoria)} {categoriaLabel(ev.categoria)}</div>
                      <div className="ed-card-title">{ev.titulo}</div>
                      <div className="ed-card-meta">
                        {ev.data && <span className="ed-meta-item">{fmtData(ev.data)}{ev.horario ? ` · ${ev.horario}` : ''}</span>}
                        {ev.local && <span className="ed-meta-item">{ev.data ? '· ' : ''}{ev.local}</span>}
                      </div>
                      {ev.descricao && <p style={{ fontSize: '.85rem', color: 'var(--MU)', lineHeight: 1.6, marginTop: '.6rem' }}>{ev.descricao}</p>}
                      {link && (
                        <a href={link} target="_blank" rel="noopener noreferrer" className="btn btn-o btn-sm" style={{ marginTop: '.8rem' }} onClick={e => e.stopPropagation()}>Saiba mais ↗</a>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
            <div style={{ marginTop: '1.5rem' }}>
              <button className="btn btn-o" onClick={() => { nav('/calendario'); window.scrollTo(0, 0) }}>Ver Calendário Completo</button>
            </div>
          </div>
        </section>
      )}

      {/* TOP MCS */}
      <section className="section">
        <div className="container">
          <div className="sec-label">Os Guerreiros</div>
          <div className="sec-title">Top MCs</div>
          <div className="grid-1px" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(190px,1fr))' }}>
            {mcs.map((mc, i) => (
              <div key={mc.id} className="mc-card" onClick={() => go(`/mcs/${mc.id}`)}>
                <div className="mc-pts-bg">{mc.pontos}</div>
                <MCAvatar id={mc.id} nome={mc.nome} fotoUrl={mc.foto_url} />
                <div className="mc-rank-badge">#{i + 1} no ranking</div>
                <div className="mc-nome">{mc.nome}</div>
                <div className="mc-cidade">{mc.cidade ?? '—'}</div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: '1.5rem' }}>
            <button className="btn btn-o" onClick={() => go('/mcs')}>Ver Todos os MCs</button>
          </div>
        </div>
      </section>

      {/* RANKING */}
      <section className="section" style={{ background: 'var(--P2)', borderTop: '1px solid var(--B)' }}>
        <div className="container">
          <div className="sec-label">Classificação</div>
          <div className="sec-title">Ranking Atual</div>
          <div className="grid-1px">
            {ranking.map((mc, i) => (
              <div key={mc.id} className={`rank-item${i === 0 ? ' rank-1' : ''}`} onClick={() => go(`/mcs/${mc.id}`)}>
                <div className="rank-pos">{i + 1}</div>
                <MCAvatar id={mc.id} nome={mc.nome} fotoUrl={mc.foto_url} size={44} />
                <div><div className="rank-nome">{mc.nome}</div><div className="rank-city">{mc.cidade ?? '—'}</div></div>
                <div style={{ textAlign: 'right' }}><div className="rank-pts-val">{mc.pontos}</div><div className="rank-pts-lbl">pts</div></div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: '1.5rem' }}>
            <button className="btn btn-o" onClick={() => go('/ranking')}>Ver Ranking Completo</button>
          </div>
        </div>
      </section>

      {/* EDIÇÕES RECENTES */}
      <section className="section">
        <div className="container">
          <div className="sec-label">Histórico</div>
          <div className="sec-title">Edições Anteriores</div>
          <div className="grid-1px" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))' }}>
            {encerradas.map((ed, idx) => (
              <div key={ed.id} className="ed-card" onClick={() => go(`/edicoes/${ed.id}`)}>
                <div className="ed-card-banner">
                  {ed.banner_url ? <img src={ed.banner_url} alt="" loading="lazy" decoding="async" /> : <div className="ed-card-banner-ph">BDC</div>}
                  <span className={`status-pill ${statusClass(ed.status)}`}>{statusLabel(ed.status)}</span>
                </div>
                <div className="ed-card-body">
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
            ))}
          </div>
          <div style={{ marginTop: '1.5rem' }}>
            <button className="btn btn-o" onClick={() => go('/edicoes')}>Ver Todas as Edições</button>
          </div>
        </div>
      </section>

      {/* EVENTOS ANTERIORES */}
      {eventosPassados.length > 0 && (
        <section className="section" style={{ borderTop: '1px solid var(--B)' }}>
          <div className="container">
            <div className="sec-label">Histórico</div>
            <div className="sec-title">Eventos Anteriores</div>
            <div className="grid-1px" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))' }}>
              {eventosPassados.map(ev => {
                const link = linkSeguro(ev.link_url)
                return (
                  <div key={ev.id} className="ed-card" onClick={() => go(`/eventos/${ev.id}`)}>
                    <div className="ed-card-banner">
                      {ev.banner_url ? <img src={ev.banner_url} alt="" loading="lazy" decoding="async" /> : <div className="ed-card-banner-ph">{categoriaIcon(ev.categoria)}</div>}
                      <span className={`status-pill ${statusClass('encerrada')}`}>{statusLabel('encerrada')}</span>
                    </div>
                    <div className="ed-card-body">
                      <div className="ed-card-num">{categoriaIcon(ev.categoria)} {categoriaLabel(ev.categoria)}</div>
                      <div className="ed-card-title">{ev.titulo}</div>
                      <div className="ed-card-meta">
                        {ev.data && <span className="ed-meta-item">{fmtData(ev.data)}{ev.horario ? ` · ${ev.horario}` : ''}</span>}
                        {ev.local && <span className="ed-meta-item">{ev.data ? '· ' : ''}{ev.local}</span>}
                      </div>
                      {ev.descricao && <p style={{ fontSize: '.85rem', color: 'var(--MU)', lineHeight: 1.6, marginTop: '.6rem' }}>{ev.descricao}</p>}
                      {link && (
                        <a href={link} target="_blank" rel="noopener noreferrer" className="btn btn-o btn-sm" style={{ marginTop: '.8rem' }} onClick={e => e.stopPropagation()}>Saiba mais ↗</a>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </section>
      )}

      <Footer />
    </div>
  )
}
