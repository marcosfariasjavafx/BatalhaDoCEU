import { supabase } from './supabase'
import type { BracketData, BracketMatch, BracketMeta } from '../types'

export interface PointDelta {
  mcId: string
  delta: number
  reason: string
}

// ─── Fetch meta (called when building a new bracket) ─────────────────────────

export async function fetchBracketMeta(currentEditionId: string): Promise<BracketMeta> {
  // Find the most recent completed edition (excluding current)
  const { data: allEnded } = await supabase
    .from('edicoes')
    .select('id, campeao_id')
    .eq('status', 'encerrada')
    .neq('id', currentEditionId)
    .order('data', { ascending: false })

  const prevChampionId = allEnded?.[0]?.campeao_id ?? null

  // Compute consecutive win streak for prev champion
  let prevChampWinStreak = 0
  if (prevChampionId && allEnded) {
    for (const ed of allEnded) {
      if (ed.campeao_id === prevChampionId) prevChampWinStreak++
      else break
    }
  }

  // Top 3 MCs by current points
  const { data: top3 } = await supabase
    .from('mcs')
    .select('id')
    .order('pontos', { ascending: false })
    .limit(3)

  return {
    prevChampionId,
    prevChampWinStreak,
    top3Ids: (top3 ?? []).map(m => m.id),
    top3BonusGiven: [],
    sweepBonusGiven: [],
    semiPointsApplied: false,
    finalPointsApplied: false,
  }
}

// ─── Count 2-0 wins for a MC across all bracket matches ──────────────────────

function count20Wins(bracket: BracketData, mcId: string): number {
  let count = 0
  for (const phKey of bracket.phases) {
    for (const m of bracket.matches[phKey] ?? []) {
      if (m.winner === mcId) {
        const rounds = m.rounds ?? []
        const rW = rounds.filter(r => r.winner === mcId).length
        const rL = rounds.filter(r => r.winner !== null && r.winner !== mcId).length
        if (rW === 2 && rL === 0) count++
      }
    }
  }
  return count
}

// ─── Per-match deltas (called once per match when winner is first set) ────────

export function calcMatchDeltas(
  bracket: BracketData,
  phKey: string,
  match: BracketMatch
): { deltas: PointDelta[]; metaUpdates: Partial<BracketMeta> } {
  const meta = bracket.meta
  if (!meta || !match.winner || match.pointsApplied) return { deltas: [], metaUpdates: {} }

  const winner = match.winner
  const loser = winner === match.mc1 ? match.mc2 : match.mc1
  if (!loser) return { deltas: [], metaUpdates: {} }

  const rounds = match.rounds ?? []
  const rW = rounds.filter(r => r.winner === winner).length
  const rL = rounds.filter(r => r.winner !== null && r.winner !== winner).length
  const isSweep = rW === 2 && rL === 0

  const deltas: PointDelta[] = []
  const metaUpdates: Partial<BracketMeta> = {}

  // +3 Vencer por 2×0
  if (isSweep) {
    deltas.push({ mcId: winner, delta: 3, reason: 'Vitória 2×0' })
  }

  // +5 Vencer top 3 do ranking (não escalona por edição)
  if (meta.top3Ids?.includes(loser) && !meta.top3BonusGiven?.includes(winner)) {
    deltas.push({ mcId: winner, delta: 5, reason: 'Venceu top 3 do ranking' })
    metaUpdates.top3BonusGiven = [...(meta.top3BonusGiven ?? []), winner]
  }

  // Regras envolvendo o campeão anterior
  if (meta.prevChampionId && meta.prevChampionId === loser) {
    // +1 Eliminou o último campeão
    deltas.push({ mcId: winner, delta: 1, reason: 'Eliminou o último campeão' })

    // +4 Eliminou campeão com streak de 2+ edições
    if ((meta.prevChampWinStreak ?? 0) >= 2) {
      deltas.push({ mcId: winner, delta: 4, reason: `Eliminou campeão em série (${meta.prevChampWinStreak}× consecutivo)` })
    }

    // -1 Último campeão caiu na 1ª fase
    if (phKey === bracket.phases[0]) {
      deltas.push({ mcId: loser, delta: -1, reason: 'Campeão eliminado na 1ª fase' })
    }
  }

  return { deltas, metaUpdates }
}

// ─── Sweep bonus: ganhou 3× de 2-0 na mesma edição ───────────────────────────

export function calcSweepBonusDeltas(
  bracket: BracketData,
  winnerId: string
): { deltas: PointDelta[]; metaUpdates: Partial<BracketMeta> } {
  const meta = bracket.meta
  if (!meta) return { deltas: [], metaUpdates: {} }
  if (meta.sweepBonusGiven?.includes(winnerId)) return { deltas: [], metaUpdates: {} }

  const count = count20Wins(bracket, winnerId)
  if (count >= 3) {
    return {
      deltas: [{ mcId: winnerId, delta: 2, reason: `Ganhou ${count}× de 2-0 na edição` }],
      metaUpdates: { sweepBonusGiven: [...(meta.sweepBonusGiven ?? []), winnerId] },
    }
  }
  return { deltas: [], metaUpdates: {} }
}

// ─── Phase completion deltas ──────────────────────────────────────────────────

export function calcPhaseCompletionDeltas(
  bracket: BracketData,
  phKey: string
): { deltas: PointDelta[]; metaUpdates: Partial<BracketMeta> } {
  const meta = bracket.meta
  if (!meta) return { deltas: [], metaUpdates: {} }

  const phases = bracket.phases
  const phIdx = phases.indexOf(phKey)
  const matches = bracket.matches[phKey] ?? []
  const deltas: PointDelta[] = []
  const metaUpdates: Partial<BracketMeta> = {}

  const isLast = phIdx === phases.length - 1
  const isSemi = phases.length >= 2 && phIdx === phases.length - 2

  // +4 Semifinalistas (perdedores da semifinal)
  if (isSemi && !meta.semiPointsApplied) {
    for (const m of matches) {
      if (m.winner) {
        const loser = m.winner === m.mc1 ? m.mc2 : m.mc1
        if (loser) deltas.push({ mcId: loser, delta: 4, reason: 'Semifinalista' })
      }
    }
    metaUpdates.semiPointsApplied = true
  }

  // Final: campeão +10, vice +5, bicampeão +1
  if (isLast && !meta.finalPointsApplied && matches.length === 1) {
    const final = matches[0]
    if (final?.winner) {
      const champion = final.winner
      const vice = champion === final.mc1 ? final.mc2 : final.mc1

      deltas.push({ mcId: champion, delta: 10, reason: 'Campeão 🏆' })
      if (vice) deltas.push({ mcId: vice, delta: 5, reason: 'Vice-campeão' })

      // +1 Campeão 2 vezes consecutivas
      if (meta.prevChampionId && meta.prevChampionId === champion) {
        deltas.push({ mcId: champion, delta: 1, reason: 'Bicampeão (consecutivo)' })
      }
    }
    metaUpdates.finalPointsApplied = true
  }

  return { deltas, metaUpdates }
}

// ─── Group and apply all deltas to DB ────────────────────────────────────────

export interface DeltaSummary {
  nome: string
  total: number
  reasons: string[]
}

export async function applyDeltas(
  deltas: PointDelta[],
  mcs: { id: string; nome: string; pontos: number }[]
): Promise<DeltaSummary[]> {
  if (!deltas.length) return []

  const groups: Record<string, { total: number; reasons: string[] }> = {}
  for (const d of deltas) {
    if (!groups[d.mcId]) groups[d.mcId] = { total: 0, reasons: [] }
    groups[d.mcId].total += d.delta
    groups[d.mcId].reasons.push(`${d.delta > 0 ? '+' : ''}${d.delta} ${d.reason}`)
  }

  const summaries: DeltaSummary[] = []

  for (const [mcId, { total, reasons }] of Object.entries(groups)) {
    const mc = mcs.find(m => m.id === mcId)
    if (!mc) continue
    if (total !== 0) {
      await supabase.from('mcs').update({ pontos: mc.pontos + total }).eq('id', mcId)
      // Update local reference for subsequent calcs in same session
      mc.pontos += total
    }
    summaries.push({ nome: mc.nome, total, reasons })
  }

  return summaries
}
