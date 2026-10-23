export type EdicaoStatus = 'em-breve' | 'confirmada' | 'encerrada'

/** Formato da batalha: individual (1×1), dupla (2×2) ou trio (3×3) */
export type Formato = 'solo' | 'dupla' | 'trio'

/** Equipe de uma edição em formato dupla/trio. No bracket, mc1/mc2/winner guardam o `id` da equipe. */
export interface Equipe {
  id: string
  nome: string
  membros: string[] // ids de MCs
}

export interface MC {
  id: string
  nome: string
  cidade: string | null
  bio: string | null
  pontos: number
  titulos: number
  foto_url: string | null
  created_at?: string
}

export interface BracketRound {
  winner: string | null
}

export interface BracketMatch {
  mc1: string | null
  mc2: string | null
  winner: string | null
  rounds: BracketRound[]
  pointsApplied?: boolean
}

export interface BracketMeta {
  prevChampionId: string | null
  prevChampWinStreak: number
  top3Ids: string[]
  top3BonusGiven: string[]
  sweepBonusGiven: string[]
  semiPointsApplied: boolean
  finalPointsApplied: boolean
}

export interface BracketData {
  phases: string[]
  matches: Record<string, BracketMatch[]>
  meta?: BracketMeta
}

export interface Edicao {
  id: string
  titulo: string
  data: string | null
  horario: string | null
  local: string | null
  descricao: string | null
  status: EdicaoStatus
  limite: number
  banner_url: string | null
  campeao_id: string | null
  participantes: string[]
  bracket: BracketData | null
  formato: Formato
  equipes: Equipe[]
  /** MCs campeões (integrantes da equipe campeã). No formato solo vale `campeao_id`. */
  campeoes: string[]
  created_at?: string
}

/** Categoria de um evento que não é batalha */
export type EventoCategoria = 'show' | 'breakdance' | 'grafite' | 'dj' | 'workshop' | 'festival' | 'outro'

/** Evento da Batalha do Céu que não é uma edição de batalha (show, breakdance, grafite...) */
export interface Evento {
  id: string
  titulo: string
  categoria: EventoCategoria
  data: string | null
  horario: string | null
  local: string | null
  descricao: string | null
  banner_url: string | null
  /** Link opcional (ingressos, inscrição, Instagram do evento...) */
  link_url: string | null
  status: EdicaoStatus
  created_at?: string
}

export interface Foto {
  id: string
  edicao_id: string | null
  url: string
  nome: string | null
  created_at?: string
}
