export type EdicaoStatus = 'em-breve' | 'confirmada' | 'encerrada'

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
  created_at?: string
}

export interface Foto {
  id: string
  edicao_id: string | null
  url: string
  nome: string | null
  created_at?: string
}
