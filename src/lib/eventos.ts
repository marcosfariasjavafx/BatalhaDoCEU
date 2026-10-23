import type { EventoCategoria } from '../types'

export const CATEGORIAS_EVENTO: { value: EventoCategoria; label: string; icon: string }[] = [
  { value: 'show', label: 'Show', icon: '🎤' },
  { value: 'breakdance', label: 'Breakdance', icon: '🕺' },
  { value: 'grafite', label: 'Grafite', icon: '🎨' },
  { value: 'dj', label: 'DJ', icon: '🎧' },
  { value: 'workshop', label: 'Workshop / Oficina', icon: '🛠' },
  { value: 'festival', label: 'Festival', icon: '🎪' },
  { value: 'outro', label: 'Outro', icon: '✨' },
]

export function categoriaLabel(c: string | null | undefined): string {
  return CATEGORIAS_EVENTO.find(x => x.value === c)?.label ?? 'Evento'
}

export function categoriaIcon(c: string | null | undefined): string {
  return CATEGORIAS_EVENTO.find(x => x.value === c)?.icon ?? '✨'
}

/** Só aceita links http(s) — evita `javascript:` e similares vindos do cadastro. */
export function linkSeguro(url: string | null | undefined): string | null {
  if (!url) return null
  const u = url.trim()
  return /^https?:\/\//i.test(u) ? u : null
}
