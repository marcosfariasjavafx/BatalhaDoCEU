import { mcAvatarColor, mcInitials } from '../../lib/utils'

interface Props { id: string; nome: string; fotoUrl?: string | null; size?: number }

export function MCAvatar({ id, nome, fotoUrl, size = 72 }: Props) {
  const col = mcAvatarColor(id)
  const ini = mcInitials(nome)
  return (
    <div
      className="mc-avatar"
      style={{ width: size, height: size, background: `${col}18`, borderColor: `${col}33` }}
    >
      {fotoUrl
        ? <img src={fotoUrl} alt={nome} />
        : <span style={{ fontFamily: 'var(--FD)', fontSize: size * 0.3, color: col }}>{ini}</span>
      }
    </div>
  )
}
