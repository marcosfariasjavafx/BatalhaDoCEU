import { Footer } from '../components/ui/Footer'
import {
  ENDERECO, ENDERECO_CURTO, CIDADE, MAPS_URL, MAPS_EMBED_URL,
  INSTAGRAM_URL, INSTAGRAM_HANDLE, WHATSAPP_URL, YOUTUBE_URL,
} from '../lib/links'

export default function Contato() {
  const infos = [
    { icon: '📍', label: 'Local dos Eventos', val: ENDERECO, href: MAPS_URL },
    { icon: '📸', label: 'Instagram', val: INSTAGRAM_HANDLE, href: INSTAGRAM_URL },
    { icon: '💬', label: 'WhatsApp', val: 'Chamar no WhatsApp', href: WHATSAPP_URL },
    { icon: '▶', label: 'YouTube', val: 'youtube.com/c/batalhadoceu', href: YOUTUBE_URL },
  ]

  const redes = [
    { label: '📸 Instagram', href: INSTAGRAM_URL },
    { label: '▶ YouTube', href: YOUTUBE_URL },
    { label: '💬 WhatsApp', href: WHATSAPP_URL },
  ]

  return (
    <div className="wrap">
      <section className="section">
        <div className="container">
          <div className="sec-label">Fale Conosco</div>
          <div className="sec-title">Contato &<br />Localização</div>

          <div className="split-2 gap-lg">
            <div>
              {infos.map(i => (
                <div key={i.label} className="detail-item">
                  <div className="detail-icon">{i.icon}</div>
                  <div style={{ minWidth: 0 }}>
                    <div className="detail-label">{i.label}</div>
                    <div className="detail-val">
                      <a href={i.href} target="_blank" rel="noopener noreferrer" className="detail-link">{i.val}</a>
                    </div>
                  </div>
                </div>
              ))}

              <div style={{ marginTop: '1.5rem' }}>
                <div className="sec-label" style={{ marginBottom: '.75rem' }}>Redes Sociais</div>
                <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
                  {redes.map(r => (
                    <a key={r.label} href={r.href} target="_blank" rel="noopener noreferrer" className="btn btn-o btn-sm">{r.label}</a>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <div className="map-box">
                <iframe
                  title={`Mapa — ${ENDERECO_CURTO}`}
                  src={MAPS_EMBED_URL}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  allowFullScreen
                />
              </div>
              <div style={{ marginTop: '.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '.75rem', flexWrap: 'wrap' }}>
                <span style={{ fontFamily: 'var(--FC)', fontSize: '.78rem', color: 'var(--MU)', textTransform: 'uppercase', letterSpacing: '.08em' }}>{CIDADE}</span>
                <a href={MAPS_URL} target="_blank" rel="noopener noreferrer" className="btn btn-y btn-sm">Como chegar</a>
              </div>
            </div>
          </div>
        </div>
      </section>
      <Footer />
    </div>
  )
}
