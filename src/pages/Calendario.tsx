import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { statusClass, statusLabel } from '../lib/utils'
import { Footer } from '../components/ui/Footer'
import type { Edicao } from '../types'

const DIAS_SEMANA = ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB', 'DOM']
const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]
const MESES_ABREV = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

function parseLocalDate(s: string) {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export default function Calendario() {
  const nav = useNavigate()
  const today = new Date()
  const [year, setYear]   = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())       // 0-based
  const [edicoes, setEdicoes] = useState<Edicao[]>([])
  const [selectedDay, setSelectedDay] = useState<number | null>(null)

  useEffect(() => {
    supabase
      .from('edicoes')
      .select('*')
      .in('status', ['confirmada', 'em-breve'])
      .order('data')
      .then(({ data }) => setEdicoes(data ?? []))
  }, [])

  /* -------- Calendar grid helpers -------- */
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  // Day of week of the 1st (0=Sun … 6=Sat) → convert to Mon-based (0=Mon … 6=Sun)
  const rawFirst = new Date(year, month, 1).getDay()
  const firstWeekday = (rawFirst + 6) % 7   // shift so Monday = 0

  // Previous month trailing days
  const prevMonthDays = new Date(year, month, 0).getDate()

  // Build 6-row × 7-col grid
  const cells: Array<{ day: number; cur: boolean; prev?: boolean; next?: boolean }> = []
  for (let i = firstWeekday - 1; i >= 0; i--) {
    cells.push({ day: prevMonthDays - i, cur: false, prev: true })
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, cur: true })
  }
  while (cells.length % 7 !== 0) {
    cells.push({ day: cells.length - (firstWeekday + daysInMonth) + 1, cur: false, next: true })
  }

  /* -------- Edition map: day → editions -------- */
  const edByDay = useMemo(() => {
    const map: Record<number, Edicao[]> = {}
    for (const ed of edicoes) {
      if (!ed.data) continue
      const d = parseLocalDate(ed.data)
      if (d.getFullYear() === year && d.getMonth() === month) {
        const day = d.getDate()
        if (!map[day]) map[day] = []
        map[day].push(ed)
      }
    }
    return map
  }, [edicoes, year, month])

  /* -------- Upcoming editions (all future, grouped by month) -------- */
  const upcoming = useMemo(() => {
    const now = new Date()
    now.setHours(0, 0, 0, 0)
    return edicoes.filter(ed => {
      if (!ed.data) return false
      const d = parseLocalDate(ed.data)
      return d >= now
    })
  }, [edicoes])

  /* -------- Navigation -------- */
  const prevMonth = () => {
    if (month === 0) { setYear(y => y - 1); setMonth(11) }
    else setMonth(m => m - 1)
    setSelectedDay(null)
  }
  const nextMonth = () => {
    if (month === 11) { setYear(y => y + 1); setMonth(0) }
    else setMonth(m => m + 1)
    setSelectedDay(null)
  }
  const goToday = () => {
    setYear(today.getFullYear())
    setMonth(today.getMonth())
    setSelectedDay(null)
  }

  /* -------- Selected day editions -------- */
  const selectedEditions = selectedDay ? (edByDay[selectedDay] ?? []) : []

  const isToday = (day: number) =>
    day === today.getDate() && month === today.getMonth() && year === today.getFullYear()

  const fmtEventDate = (data: string, horario: string | null) => {
    const d = parseLocalDate(data)
    const diasSemana = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb']
    return `${diasSemana[d.getDay()]}, ${String(d.getDate()).padStart(2,'0')} de ${MESES[d.getMonth()]} de ${d.getFullYear()}${horario ? ` às ${horario}` : ''}`
  }

  return (
    <div className="wrap">
      <section className="section">
        <div className="container" style={{ maxWidth: 1100 }}>

          {/* Page title */}
          <div style={{ marginBottom: '2.5rem' }}>
            <div className="sec-label">Agenda</div>
            <h1 className="sec-title" style={{ marginBottom: '.5rem' }}>
              Calendário de<br />
              <em style={{ fontStyle: 'normal', color: 'var(--Y)' }}>Edições</em>
            </h1>
            <p style={{ fontFamily: 'var(--FC)', fontSize: '.9rem', color: 'var(--MU)', letterSpacing: '.04em' }}>
              Acompanhe as próximas batalhas e marque na agenda.
            </p>
          </div>

          <div className="cal-layout">
            {/* ====== LEFT: CALENDAR ====== */}
            <div className="cal-card">
              {/* Month header */}
              <div className="cal-header">
                <button className="cal-nav-btn" onClick={prevMonth}>‹</button>
                <div className="cal-month-label">
                  {MESES[month]} <span style={{ color: 'var(--Y)' }}>{year}</span>
                </div>
                <button className="cal-nav-btn" onClick={nextMonth}>›</button>
              </div>

              {/* Today button */}
              <div style={{ textAlign: 'center', marginBottom: '.75rem' }}>
                <button className="btn btn-ghost btn-sm" onClick={goToday}>Hoje</button>
              </div>

              {/* Day headers */}
              <div className="cal-grid">
                {DIAS_SEMANA.map(d => (
                  <div key={d} className="cal-weekday">{d}</div>
                ))}

                {/* Day cells */}
                {cells.map((cell, i) => {
                  const hasEd = cell.cur && !!edByDay[cell.day]
                  const isSel = cell.cur && selectedDay === cell.day
                  const itToday = cell.cur && isToday(cell.day)
                  return (
                    <div
                      key={i}
                      className={[
                        'cal-day',
                        !cell.cur ? 'cal-day-other' : '',
                        hasEd ? 'cal-day-has-ed' : '',
                        isSel ? 'cal-day-selected' : '',
                        itToday ? 'cal-day-today' : '',
                      ].join(' ')}
                      onClick={() => cell.cur && setSelectedDay(isSel ? null : cell.day)}
                    >
                      {cell.day}
                      {hasEd && !isSel && <span className="cal-dot" />}
                    </div>
                  )
                })}
              </div>

              {/* Legend */}
              <div className="cal-legend">
                <span className="cal-legend-dot" />
                <span>Dia com edição agendada</span>
              </div>
            </div>

            {/* ====== RIGHT: UPCOMING / SELECTED ====== */}
            <div className="cal-events">
              {selectedDay && selectedEditions.length > 0 ? (
                <>
                  <div className="cal-events-title">
                    {String(selectedDay).padStart(2,'0')} de {MESES[month]}
                  </div>
                  {selectedEditions.map(ed => (
                    <EventCard key={ed.id} ed={ed} fmtDate={fmtEventDate} onClick={() => { nav(`/edicoes/${ed.id}`); window.scrollTo(0,0) }} />
                  ))}
                </>
              ) : selectedDay ? (
                <div className="aviso" style={{ marginBottom: '1rem' }}>
                  Nenhuma edição em {String(selectedDay).padStart(2,'0')}/{String(month+1).padStart(2,'0')}.
                </div>
              ) : null}

              {!selectedDay && (
                <>
                  <div className="cal-events-title">Próximas Edições</div>
                  {upcoming.length === 0
                    ? <div className="aviso">Nenhuma edição agendada no momento.</div>
                    : upcoming.map(ed => (
                        <EventCard key={ed.id} ed={ed} fmtDate={fmtEventDate} onClick={() => { nav(`/edicoes/${ed.id}`); window.scrollTo(0,0) }} />
                      ))
                  }
                </>
              )}
            </div>
          </div>

        </div>
      </section>
      <Footer />
    </div>
  )
}

/* -------- Event Card sub-component -------- */
function EventCard({ ed, fmtDate, onClick }: {
  ed: Edicao
  fmtDate: (d: string, h: string | null) => string
  onClick: () => void
}) {
  const d = ed.data ? parseLocalDate(ed.data) : null
  const MESES_ABREV_LOCAL = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
  const diasSemanaAbrev = ['DOM','SEG','TER','QUA','QUI','SEX','SÁB']

  return (
    <div className="cal-event-card" onClick={onClick}>
      {/* Date badge */}
      {d && (
        <div className="cal-event-badge">
          <span className="cal-event-badge-dow">{diasSemanaAbrev[d.getDay()]}</span>
          <span className="cal-event-badge-day">{String(d.getDate()).padStart(2,'0')}</span>
          <span className="cal-event-badge-mon">{MESES_ABREV_LOCAL[d.getMonth()]}</span>
        </div>
      )}

      {/* Info */}
      <div className="cal-event-info">
        <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', marginBottom: '.3rem', flexWrap: 'wrap' }}>
          <span className={`status-pill ${statusClass(ed.status)}`}>{statusLabel(ed.status)}</span>
        </div>
        <div className="cal-event-title">{ed.titulo}</div>
        {ed.local && (
          <div className="cal-event-meta">
            <span style={{ opacity: .7 }}>📍</span> {ed.local}
          </div>
        )}
        {ed.data && (
          <div className="cal-event-meta">
            <span style={{ opacity: .7 }}>📅</span> {fmtDate(ed.data, ed.horario)}
          </div>
        )}
      </div>

      <div className="cal-event-arrow">›</div>
    </div>
  )
}
