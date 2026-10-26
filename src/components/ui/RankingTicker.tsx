import { useNavigate } from 'react-router-dom'
import { mcAvatarColor, mcInitials } from '../../lib/utils'
import type { MC } from '../../types'

interface Props { mcs: MC[] }

export function RankingTicker({ mcs }: Props) {
  const nav = useNavigate()

  if (!mcs.length) return null

  // Duplicate list for seamless infinite loop
  const items = [...mcs, ...mcs, ...mcs]

  return (
    <div className="ticker-wrap">
      <div className="ticker-label">
        <span className="ticker-label-text">Ranking</span>
        <span className="ticker-label-line" />
      </div>
      <div className="ticker-track">
        <div className="ticker-inner">
          {items.map((mc, i) => {
            const pos = (i % mcs.length) + 1
            const col = mcAvatarColor(mc.id)
            const ini = mcInitials(mc.nome)
            return (
              <div
                key={`${mc.id}-${i}`}
                className="ticker-item"
                onClick={() => { nav(`/mcs/${mc.id}`); window.scrollTo(0, 0) }}
              >
                {/* Position */}
                <span className="ticker-pos">#{pos}</span>

                {/* Avatar */}
                <div className="ticker-avatar" style={{ background: `${col}20`, borderColor: `${col}50` }}>
                  {mc.foto_url
                    ? <img src={mc.foto_url} alt={mc.nome} loading="lazy" decoding="async" />
                    : <span style={{ fontFamily: 'var(--FD)', fontSize: '1rem', color: col }}>{ini}</span>
                  }
                </div>

                {/* Name */}
                <span className="ticker-name">{mc.nome}</span>

                {/* Points */}
                <span className="ticker-pts">{mc.pontos} <span className="ticker-pts-lbl">pts</span></span>

                {/* Separator dot */}
                <span className="ticker-sep">·</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
