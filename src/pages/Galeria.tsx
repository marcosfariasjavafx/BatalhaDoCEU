import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Footer } from '../components/ui/Footer'
import type { Foto, Edicao, Evento } from '../types'

export default function Galeria() {
  const [fotos, setFotos] = useState<Foto[]>([])
  const [edicoes, setEdicoes] = useState<Pick<Edicao, 'id' | 'titulo'>[]>([])
  const [eventos, setEventos] = useState<Pick<Evento, 'id' | 'titulo'>[]>([])
  const [filtro, setFiltro] = useState<string | null>(null)
  const [lightbox, setLightbox] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      supabase.from('fotos').select('*').order('created_at', { ascending: false }),
      supabase.from('edicoes').select('id,titulo').order('data', { ascending: false }),
      supabase.from('eventos').select('id,titulo').order('data', { ascending: false }),
    ]).then(([{ data: f }, { data: e }, { data: ev }]) => {
      setFotos(f ?? [])
      setEdicoes(e ?? [])
      setEventos(ev ?? [])
      setLoading(false)
    })
  }, [])

  // Filtros de edições e eventos que têm fotos (ids são uuids, não se repetem entre as tabelas)
  const exibidas = filtro ? fotos.filter(f => f.edicao_id === filtro || f.evento_id === filtro) : fotos
  const comFotos = [
    ...edicoes.filter(e => fotos.some(f => f.edicao_id === e.id)),
    ...eventos.filter(e => fotos.some(f => f.evento_id === e.id)),
  ]

  return (
    <div className="wrap">
      <section className="section">
        <div className="container">
          <div className="sec-label">Memória</div>
          <div className="sec-title">Galeria</div>

          {/* Filtros */}
          <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
            <button
              className={`btn btn-o btn-sm${!filtro ? ' active-filter' : ''}`}
              onClick={() => setFiltro(null)}
              style={!filtro ? { borderColor: 'var(--Y)', color: 'var(--Y)' } : {}}
            >
              Todas
            </button>
            {comFotos.map(e => (
              <button
                key={e.id}
                className="btn btn-o btn-sm"
                onClick={() => setFiltro(e.id)}
                style={filtro === e.id ? { borderColor: 'var(--Y)', color: 'var(--Y)' } : {}}
              >
                {e.titulo}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="aviso">Carregando...</div>
          ) : (
            <div className="galeria-grid">
              {exibidas.map(f => (
                <div key={f.id} className="galeria-item" onClick={() => setLightbox(f.url)}>
                  <img src={f.url} alt={f.nome ?? ''} loading="lazy" />
                </div>
              ))}
              {!exibidas.length && (
                <div className="aviso" style={{ gridColumn: '1/-1' }}>
                  Nenhuma foto ainda. Acesse o painel admin para fazer upload.
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Lightbox */}
      {lightbox && (
        <div className="lightbox" onClick={() => setLightbox(null)}>
          <button className="lightbox-close" onClick={() => setLightbox(null)}>✕</button>
          <img className="lightbox-img" src={lightbox} alt="" />
        </div>
      )}

      <Footer />
    </div>
  )
}
