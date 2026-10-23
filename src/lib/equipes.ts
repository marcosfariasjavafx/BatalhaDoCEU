import type { Edicao, Equipe, Formato, MC } from '../types'

export const FORMATOS: { value: Formato; label: string; tamanho: number }[] = [
  { value: 'solo', label: 'Individual (1×1)', tamanho: 1 },
  { value: 'dupla', label: 'Dupla (2×2)', tamanho: 2 },
  { value: 'trio', label: 'Trio (3×3)', tamanho: 3 },
]

/** Quantas equipes um bracket aceita (mesma lógica do formato individual: 8 ou 16; 4 também fecha semi + final). */
export const TIMES_VALIDOS_EQUIPE = [4, 8, 16]
export const PARTICIPANTES_VALIDOS_SOLO = [8, 16]

export function tamanhoFormato(f: Formato | undefined | null): number {
  return FORMATOS.find(x => x.value === (f ?? 'solo'))?.tamanho ?? 1
}

export function ehEquipe(f: Formato | undefined | null): boolean {
  return (f ?? 'solo') !== 'solo'
}

export function formatoLabel(f: Formato | undefined | null): string {
  return { solo: 'Individual', dupla: 'Dupla', trio: 'Trio' }[f ?? 'solo']
}

/** Nome automático da equipe: "Caótico & Zika" */
export function nomeAutomatico(membros: string[], mcs: MC[]): string {
  return membros.map(id => mcs.find(m => m.id === id)?.nome ?? '?').join(' & ')
}

/** MCs que formam um competidor do bracket: os integrantes da equipe, ou o próprio MC no formato individual. */
export function membrosDe(equipes: Equipe[] | undefined, id: string): string[] {
  return equipes?.find(e => e.id === id)?.membros ?? [id]
}

/** Nome de um competidor do bracket (equipe ou MC). */
export function nomeCompetidor(id: string | null, equipes: Equipe[] | undefined, mcs: MC[]): string | undefined {
  if (!id) return undefined
  return equipes?.find(e => e.id === id)?.nome ?? mcs.find(m => m.id === id)?.nome
}

/** Equipe campeã de uma edição em dupla/trio (vencedora da final), ou null. */
export function equipeCampea(ed: Pick<Edicao, 'formato' | 'equipes' | 'bracket' | 'campeoes'>): Equipe | null {
  if (!ehEquipe(ed.formato) || !ed.bracket?.phases?.length) return null
  const last = ed.bracket.phases[ed.bracket.phases.length - 1]
  const winner = ed.bracket.matches[last]?.[0]?.winner
  if (!winner) return null
  return ed.equipes?.find(e => e.id === winner) ?? null
}

/** Esse MC foi campeão dessa edição? (individual: campeao_id; dupla/trio: integrante da equipe campeã) */
export function ehCampeao(ed: Pick<Edicao, 'campeao_id' | 'campeoes'>, mcId: string): boolean {
  return ed.campeao_id === mcId || (ed.campeoes ?? []).includes(mcId)
}

/** Divide MCs em equipes de `tamanho`, embaralhando. Exige que a quantidade seja múltipla do tamanho. */
export function sortearEquipes(mcIds: string[], tamanho: number): string[][] {
  const shuffled = [...mcIds].sort(() => Math.random() - 0.5)
  const out: string[][] = []
  for (let i = 0; i < shuffled.length; i += tamanho) out.push(shuffled.slice(i, i + tamanho))
  return out
}

export function novoIdEquipe(): string {
  return `eq-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}

/** As equipes salvas ainda correspondem aos participantes marcados? */
export function equipesAtualizadas(equipes: Equipe[] | undefined, participantes: string[] | undefined, tamanho: number): boolean {
  if (!equipes?.length) return false
  const membros = equipes.flatMap(e => e.membros)
  if (equipes.some(e => e.membros.length !== tamanho)) return false
  const a = new Set(membros)
  const b = new Set(participantes ?? [])
  return a.size === membros.length && a.size === b.size && [...a].every(id => b.has(id))
}
