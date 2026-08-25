import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Footer } from '../components/ui/Footer'

export default function Sobre() {
  const [totalMCs, setTotalMCs] = useState(0)
  const [totalEnc, setTotalEnc] = useState(0)
  const [cidades, setCidades] = useState(0)

  useEffect(() => {
    supabase.from('mcs').select('*', { count: 'exact', head: true }).then(({ count }) => setTotalMCs(count ?? 0))
    supabase.from('edicoes').select('*', { count: 'exact', head: true }).eq('status', 'encerrada').then(({ count }) => setTotalEnc(count ?? 0))
    supabase.from('mcs').select('cidade').then(({ data }) => {
      const unique = new Set((data ?? []).map(m => m.cidade).filter(Boolean))
      setCidades(unique.size)
    })
  }, [])

  const pilares = [
    { icon: '🎤', titulo: 'Batalha de Rima', texto: 'O coração do movimento. MCs se enfrentam com palavra, inteligência e improviso em formato de eliminação simples.' },
    { icon: '💥', titulo: 'Breakdance', texto: 'O corpo fala quando as palavras não bastam. O break integra nossos eventos como expressão legítima do hip-hop.' },
    { icon: '🎨', titulo: 'Grafite', texto: 'A arte ocupa o espaço urbano. Em cada edição, grafiteiros locais marcam presença e deixam sua assinatura.' },
    { icon: '🌍', titulo: 'Comunidade', texto: 'Mais do que um evento, somos um coletivo. A Batalha do Céu pertence ao bairro, à quebrada, à periferia.' },
  ]

  return (
    <div className="wrap">
      <section className="section" style={{ background: 'var(--P2)', borderBottom: '1px solid var(--B)' }}>
        <div className="container">
          <div className="sec-label">O Movimento</div>
          <div className="sec-title">Sobre a<br />Batalha do Céu</div>
          <div className="about-body container-sm" style={{ marginLeft: 0 }}>
            <p>
              A <strong>Batalha do Céu</strong> nasceu em 2018 nas ruas de Santa Bárbara d'Oeste, cidade do
              interior paulista, com um único propósito: dar voz à periferia através da palavra.
            </p>
            <div className="about-quote">
              "O microfone é nossa arma. A rima é nossa resistência. O céu é o limite."
            </div>
            <p>
              O que começou como um encontro informal de MCs da cidade cresceu e se tornou um dos eventos de
              batalha de rima mais respeitados da região de Campinas. Ao longo de suas edições, a Batalha do
              Céu já recebeu nomes consagrados do cenário nacional.
            </p>
            <p>
              O movimento vai além das rimas. É um espaço de formação cultural, conexão comunitária e
              celebração da identidade periférica. Aqui, grafite, break e rap se encontram num mesmo chão.
            </p>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="sec-label">Nossa Missão</div>
          <div className="sec-title">Os Quatro Pilares</div>
          <div className="grid-1px" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))' }}>
            {pilares.map(p => (
              <div key={p.titulo} className="pilar">
                <div className="pilar-icon">{p.icon}</div>
                <h3>{p.titulo}</h3>
                <p>{p.texto}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section" style={{ background: 'var(--P2)', borderTop: '1px solid var(--B)' }}>
        <div className="container">
          <div className="sec-label">Impacto</div>
          <div className="sec-title">Números do Movimento</div>
          <div className="grid-1px" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(170px,1fr))', marginTop: '2rem' }}>
            {[
              { lbl: 'Edições Realizadas', val: totalEnc, sub: 'desde 2018' },
              { lbl: 'MCs Cadastrados', val: totalMCs, sub: 'e contando' },
              { lbl: 'Cidades Representadas', val: cidades, sub: 'SP e região' },
              { lbl: 'Público Total', val: '1k+', sub: 'presença acumulada' },
            ].map(s => (
              <div key={s.lbl} className="stat-card">
                <div className="stat-label">{s.lbl}</div>
                <div className="stat-val">{s.val}</div>
                <div className="stat-sub">{s.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
