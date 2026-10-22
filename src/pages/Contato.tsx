import { Footer } from '../components/ui/Footer'

export default function Contato() {
  const infos = [
    { icon: '📍', label: 'Local dos Eventos', val: "Praça Central — Santa Bárbara d'Oeste, SP" },
    { icon: '📸', label: 'Instagram', val: '@batalhadoceu.sbo' },
    { icon: '💬', label: 'WhatsApp', val: '(19) 99999-0000' },
    { icon: '✉', label: 'E-mail', val: 'contato@batalhadoceu.com.br' },
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
                  <div>
                    <div className="detail-label">{i.label}</div>
                    <div className="detail-val">{i.val}</div>
                  </div>
                </div>
              ))}

              <div style={{ marginTop: '1.5rem' }}>
                <div className="sec-label" style={{ marginBottom: '.75rem' }}>Redes Sociais</div>
                <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
                  {['📸 Instagram', '▶ YouTube', '🎵 TikTok'].map(r => (
                    <button key={r} className="btn btn-o btn-sm">{r}</button>
                  ))}
                </div>
              </div>
            </div>

            <div style={{
              background: 'var(--P4)', border: '1px solid var(--B)', minHeight: 280,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexDirection: 'column', gap: '.75rem',
            }}>
              <div style={{ fontSize: '2.5rem', opacity: .2 }}>🗺</div>
              <p style={{ fontFamily: 'var(--FC)', fontSize: '.8rem', color: 'var(--MU)', textTransform: 'uppercase', letterSpacing: '.1em', textAlign: 'center' }}>
                Santa Bárbara d'Oeste — SP<br />
                <span style={{ color: 'var(--MU2)', fontSize: '.7rem' }}>Google Maps em breve</span>
              </p>
            </div>
          </div>
        </div>
      </section>
      <Footer />
    </div>
  )
}
