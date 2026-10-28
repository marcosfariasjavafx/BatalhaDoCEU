import { useEffect, useState } from 'react'
import { inicioEvento } from '../../lib/agenda'

const AO_VIVO_H = 6 // por quantas horas depois do início mostramos "Acontecendo agora"

/** Contagem regressiva até o início do evento. Some depois que o evento passa. */
export function Contagem({ data, horario }: { data: string | null; horario?: string | null }) {
  const alvo = inicioEvento(data, horario)
  const [agora, setAgora] = useState(() => Date.now())

  useEffect(() => {
    if (!alvo) return
    const id = setInterval(() => setAgora(Date.now()), alvo.temHora ? 1000 : 60_000)
    return () => clearInterval(id)
  }, [alvo?.inicio.getTime(), alvo?.temHora])

  if (!alvo) return null
  const falta = alvo.inicio.getTime() - agora

  if (falta <= 0) {
    // Sem horário o evento é "hoje" o dia todo; com horário, vale até AO_VIVO_H depois do início
    const ainda = alvo.temHora ? -falta < AO_VIVO_H * 3600_000 : -falta < 24 * 3600_000
    return ainda ? <div className="countdown-live">🔴 Acontecendo agora!</div> : null
  }

  const s = Math.floor(falta / 1000)
  const dias = Math.floor(s / 86400), horas = Math.floor((s % 86400) / 3600)
  const min = Math.floor((s % 3600) / 60), seg = s % 60
  const caixas: [number, string][] = alvo.temHora
    ? [[dias, 'dias'], [horas, 'horas'], [min, 'min'], [seg, 'seg']]
    : [[dias, dias === 1 ? 'dia' : 'dias']]

  return (
    <div className="countdown" role="timer" aria-label={`Faltam ${dias} dias`}>
      {caixas.map(([n, rot]) => (
        <div key={rot} className="countdown-box">
          <span className="countdown-num">{String(n).padStart(2, '0')}</span>
          <span className="countdown-lbl">{rot}</span>
        </div>
      ))}
    </div>
  )
}
