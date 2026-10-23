import type { BracketData, Equipe, MC } from '../../types'
import { getPhasesForN } from '../../lib/utils'
import { nomeCompetidor } from '../../lib/equipes'

interface Props {
  bracket: BracketData
  mcs: MC[]
  /** Equipes da edição (dupla/trio). Sem isso, os competidores são MCs individuais. */
  equipes?: Equipe[]
  participantCount?: number
}

export function BracketView({ bracket, mcs, equipes, participantCount }: Props) {
  // Nº de competidores = 2 por confronto da 1ª fase (vale para MCs e para equipes)
  const competitors = (bracket.matches[bracket.phases[0]]?.length ?? 0) * 2
  const phases = getPhasesForN(competitors || participantCount || 8)
  const isTeam = !!equipes?.length
  const getMC = (id: string | null) => {
    const nome = nomeCompetidor(id, equipes, mcs)
    return nome ? { nome } : undefined
  }

  return (
    <div className="bracket-wrap">
      <div className="bracket-row">
        {bracket.phases.map(phKey => {
          const phName = phases.find(p => p.key === phKey)?.name ?? phKey
          const matches = bracket.matches[phKey] ?? []
          return (
            <div key={phKey} className="bracket-phase">
              <div className="bracket-phase-title">{phName}</div>
              {matches.map((m, i) => {
                const mc1 = getMC(m.mc1)
                const mc2 = getMC(m.mc2)
                const c1 = m.winner ? (m.winner === m.mc1 ? "won" : "lost") : "pending"
                const c2 = m.winner ? (m.winner === m.mc2 ? "won" : "lost") : "pending"
                const rounds = m.rounds ?? []
                const r1 = rounds.filter(r => r.winner === m.mc1).length
                const r2 = rounds.filter(r => r.winner === m.mc2).length
                const hasRounds = rounds.length > 0
                return (
                  <div key={i} className="bracket-match">
                    <div className={`bracket-mc ${c1}`}>
                      <span className={`bracket-mc-name${isTeam ? ' team' : ''}`} title={mc1?.nome}>
                        {c1 === "won" && <span className="bracket-trophy">🏆</span>}
                        {mc1?.nome ?? "A definir"}
                      </span>
                      {hasRounds && <span className="bracket-rounds" data-won={c1 === "won"}>{r1}</span>}
                    </div>
                    <div className={`bracket-mc ${c2}`}>
                      <span className={`bracket-mc-name${isTeam ? ' team' : ''}`} title={mc2?.nome}>
                        {c2 === "won" && <span className="bracket-trophy">🏆</span>}
                        {mc2?.nome ?? "A definir"}
                      </span>
                      {hasRounds && <span className="bracket-rounds" data-won={c2 === "won"}>{r2}</span>}
                    </div>
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>
    </div>
  )
}
