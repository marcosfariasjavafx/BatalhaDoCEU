import { arquivoIcs, googleAgendaUrl, inicioEvento, whatsappCompartilharUrl, type DadosEvento } from '../../lib/agenda'

/** Botões "Adicionar ao calendário" (Google ou celular) e "Compartilhar no WhatsApp". */
export function EventoAcoes({ evento, encerrado }: { evento: DadosEvento; encerrado?: boolean }) {
  const google = googleAgendaUrl(evento)
  const futuro = !encerrado && (inicioEvento(evento.data, evento.horario)?.inicio.getTime() ?? 0) + 24 * 3600_000 > Date.now()

  function baixarIcs() {
    const ics = arquivoIcs(evento)
    if (!ics) return
    const url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar;charset=utf-8' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `${evento.titulo.replace(/[^\w]+/g, '-').toLowerCase() || 'evento'}.ics`
    document.body.appendChild(a); a.click(); a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  return (
    <div className="evento-acoes">
      {google && futuro && (
        <>
          <a className="btn btn-o btn-sm" href={google} target="_blank" rel="noopener noreferrer">📅 Google Agenda</a>
          <button type="button" className="btn btn-o btn-sm" onClick={baixarIcs}>📲 Calendário do celular</button>
        </>
      )}
      <a className="btn btn-o btn-sm" href={whatsappCompartilharUrl(evento)} target="_blank" rel="noopener noreferrer">💬 Compartilhar no WhatsApp</a>
    </div>
  )
}
