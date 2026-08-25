import { useEffect, useState, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { uploadFile, compressImage } from '../../lib/utils'
import { useToast } from '../../hooks/useToast'
import type { Foto, Edicao } from '../../types'

export default function AdminGaleria() {
  const { show: toast } = useToast()
  const [fotos, setFotos] = useState<Foto[]>([])
  const [edicoes, setEdicoes] = useState<Pick<Edicao, 'id' | 'titulo'>[]>([])
  const [selEdId, setSelEdId] = useState('')
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const load = async () => {
    const [fotosR, edsR] = await Promise.all([
      supabase.from('fotos').select('*').order('created_at', { ascending: false }),
      supabase.from('edicoes').select('id,titulo').order('data', { ascending: false }),
    ])
    setFotos(fotosR.data ?? [])
    setEdicoes(edsR.data ?? [])
  }

  useEffect(() => { load() }, [])

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (!files.length) return
    setUploading(true)
    try {
      for (const file of files) {
        const compressed = await compressImage(file, 900, 0.75)
        const url = await uploadFile(compressed, 'fotos')
        await supabase.from('fotos').insert({ url, nome: file.name, edicao_id: selEdId || null })
      }
      toast(`${files.length} foto(s) adicionada(s)!`)
      load()
    } catch (err: any) {
      toast('Erro no upload: ' + err.message, true)
    }
    setUploading(false)
    e.target.value = ''
  }

  async function handleDelete(foto: Foto) {
    if (!confirm('Remover esta foto?')) return
    try {
      await supabase.from('fotos').delete().eq('id', foto.id)
      // Remover do Storage
      const urlObj = new URL(foto.url)
      const parts = urlObj.pathname.split('/object/public/fotos/')
      if (parts[1]) await supabase.storage.from('fotos').remove([parts[1]])
      toast('Foto removida.')
      load()
    } catch {
      toast('Erro ao remover.', true)
    }
  }

  return (
    <div>
      <div className="admin-panel-title">Galeria</div>

      {/* Upload */}
      <div style={{ marginBottom: '2rem' }}>
        <div className="form-group" style={{ maxWidth: 360 }}>
          <label className="form-label">Edição (opcional)</label>
          <select className="form-select" value={selEdId} onChange={e => setSelEdId(e.target.value)}>
            <option value="">Sem edição</option>
            {edicoes.map(e => <option key={e.id} value={e.id}>{e.titulo}</option>)}
          </select>
        </div>

        <div className="upload-zone" onClick={() => !uploading && fileRef.current?.click()}>
          <input ref={fileRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={handleUpload} />
          <div style={{ fontSize: '2rem', opacity: .3, marginBottom: '.6rem' }}>📷</div>
          <div style={{ fontFamily: 'var(--FC)', fontSize: '.8rem', color: 'var(--MU)', textTransform: 'uppercase', letterSpacing: '.1em' }}>
            {uploading ? '⏳ Enviando...' : 'Clique para selecionar fotos (múltiplas)'}
          </div>
        </div>
      </div>

      <div style={{ fontFamily: 'var(--FC)', fontSize: '.72rem', color: 'var(--MU)', letterSpacing: '.1em', marginBottom: '.75rem' }}>
        {fotos.length} foto(s) no total
      </div>

      <div className="galeria-admin-grid">
        {fotos.map(f => (
          <div key={f.id} className="galeria-admin-item">
            <img src={f.url} alt={f.nome ?? ''} loading="lazy" />
            <button className="galeria-del" onClick={() => handleDelete(f)}>✕</button>
          </div>
        ))}
        {!fotos.length && <div className="aviso" style={{ gridColumn: '1/-1' }}>Nenhuma foto ainda. Faça upload acima.</div>}
      </div>
    </div>
  )
}
