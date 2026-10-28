import { horaIso } from './pageMeta'

export interface DadosEvento {
  titulo: string
  data: string | null
  horario?: string | null
  local?: string | null
  descricao?: string | null
  /** Caminho da página do evento no site, ex.: /edicoes/abc */
  path: string
}

const DURACAO_PADRAO_H = 3

/** Início do evento (horário de Brasília). Sem horário cadastrado, vale 00:00 e `temHora` é false. */
export function inicioEvento(data: string | null, horario?: string | null): { inicio: Date; temHora: boolean } | null {
  if (!data) return null
  const hora = horaIso(horario)
  const inicio = new Date(`${data}T${hora ?? '00:00'}:00-03:00`)
  return Number.isNaN(inicio.getTime()) ? null : { inicio, temHora: !!hora }
}

const pad = (n: number) => String(n).padStart(2, '0')
const utc = (d: Date) =>
  `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
const diaSimples = (data: string) => data.replace(/-/g, '')
const proximoDia = (data: string) => {
  const d = new Date(`${data}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + 1)
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}`
}

const urlDoEvento = (e: DadosEvento) => `${window.location.origin}${e.path}`
const detalhes = (e: DadosEvento) => [e.descricao, `Mais informações: ${urlDoEvento(e)}`].filter(Boolean).join('\n\n')

/** Link que abre o Google Agenda com o evento já preenchido. */
export function googleAgendaUrl(e: DadosEvento): string | null {
  const t = inicioEvento(e.data, e.horario)
  if (!t || !e.data) return null
  const dates = t.temHora
    ? `${utc(t.inicio)}/${utc(new Date(t.inicio.getTime() + DURACAO_PADRAO_H * 3600_000))}`
    : `${diaSimples(e.data)}/${proximoDia(e.data)}` // dia inteiro
  const p = new URLSearchParams({ action: 'TEMPLATE', text: e.titulo, dates, details: detalhes(e) })
  if (e.local) p.set('location', e.local)
  return `https://calendar.google.com/calendar/render?${p.toString()}`
}

const escIcs = (s: string) => s.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;')

/** Arquivo .ics (iPhone, Android, Outlook) com lembretes de 1 dia e 2 horas antes. */
export function arquivoIcs(e: DadosEvento): string | null {
  const t = inicioEvento(e.data, e.horario)
  if (!t || !e.data) return null
  const quando = t.temHora
    ? `DTSTART:${utc(t.inicio)}\r\nDTEND:${utc(new Date(t.inicio.getTime() + DURACAO_PADRAO_H * 3600_000))}`
    : `DTSTART;VALUE=DATE:${diaSimples(e.data)}\r\nDTEND;VALUE=DATE:${proximoDia(e.data)}`
  const linhas = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Batalha do Ceu//PT-BR', 'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${e.path.replace(/\W/g, '')}-${e.data}@batalhadoceu`,
    `DTSTAMP:${utc(new Date())}`,
    quando,
    `SUMMARY:${escIcs(e.titulo)}`,
    ...(e.local ? [`LOCATION:${escIcs(e.local)}`] : []),
    `DESCRIPTION:${escIcs(detalhes(e))}`,
    `URL:${urlDoEvento(e)}`,
    'BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${escIcs(e.titulo)}`, 'TRIGGER:-P1D', 'END:VALARM',
    'BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${escIcs(e.titulo)}`, 'TRIGGER:-PT2H', 'END:VALARM',
    'END:VEVENT', 'END:VCALENDAR',
  ]
  return linhas.join('\r\n') + '\r\n'
}

/** Link do WhatsApp com a mensagem de divulgação pronta. */
export function whatsappCompartilharUrl(e: DadosEvento): string {
  const t = inicioEvento(e.data, e.horario)
  const quando = t
    ? new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', timeZone: 'America/Sao_Paulo' }).format(t.inicio)
      + (e.horario ? ` · ${e.horario}` : '')
    : ''
  const texto = [
    `🎤 *${e.titulo}*`,
    ...(quando ? [`📅 ${quando}`] : []),
    ...(e.local ? [`📍 ${e.local}`] : []),
    '',
    `Detalhes: ${urlDoEvento(e)}`,
  ].join('\n')
  return `https://wa.me/?text=${encodeURIComponent(texto)}`
}
