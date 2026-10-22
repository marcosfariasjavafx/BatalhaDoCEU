import { CIDADE, ENDERECO_CURTO, MAPS_URL, INSTAGRAM_URL, YOUTUBE_URL, WHATSAPP_URL } from '../../lib/links'

export function Footer() {
  return (
    <footer>
      <div>
        <div className="ft-logo" style={{ marginBottom: '.5rem' }}>
          <img src="/assets/logo-branco.png" alt="Batalha do Céu" style={{ height: 48, width: 'auto' }} />
        </div>
        <div className="ft-copy">
          {CIDADE} · Brasil<br />
          <a href={MAPS_URL} target="_blank" rel="noopener noreferrer" className="ft-link">{ENDERECO_CURTO}</a><br />
          Movimento Hip-Hop Underground
        </div>
        <div className="ft-social">
          <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer">Instagram</a>
          <a href={YOUTUBE_URL} target="_blank" rel="noopener noreferrer">YouTube</a>
          <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer">WhatsApp</a>
        </div>
      </div>
      <div className="ft-copy ft-copy-right">
        Projeto de Extensão · IFSP<br />
        © {new Date().getFullYear()} · Sem fins lucrativos
      </div>
    </footer>
  )
}
