import { useEffect, useState, useRef, FormEvent } from 'react'
import { supabase } from '../../lib/supabase'
import { uploadFile, compressImage } from '../../lib/utils'
import { MCAvatar } from '../../components/ui/MCAvatar'
import { useToast } from '../../hooks/useToast'
import type { MC } from '../../types'

const EMPTY = { nome: '', cidade: '', bio: '', pontos: 0, titulos: 0, foto_url: null as string | null }

export default function AdminMCs() {
  const { show: toast } = useToast()
  const [mcs, setMCs] = useState<MC[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ ...EMPTY })
  const [editId, setEditId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [fotoPreview, setFotoPreview] = useState<string | null>(null)
  const [fotoFile, setFotoFile] = useState<File | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const load = async () => {
    setLoading(true)
    const { data } = await supabase.from('mcs').select('*').order('pontos', { ascending: false })
    setMCs(data ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  function openNew() {
    setEditId(null); setForm({ ...EMPTY }); setFotoPreview(null); setFotoFile(null); setModal(true)
  }

  function openEdit(mc: MC) {
    setEditId(mc.id)
    setForm({ nome: mc.nome, cidade: mc.cidade ?? '', bio: mc.bio ?? '', pontos: mc.pontos, titulos: mc.titulos, foto_url: mc.foto_url })
    setFotoPreview(mc.foto_url)
    setFotoFile(null)
    setModal(true)
  }

  function handleFotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setFotoFile(file)
    setFotoPreview(URL.createObjectURL(file))
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault()
    if (!form.nome.trim()) return
    setSaving(true)
    try {
      let foto_url = form.foto_url
      if (fotoFile) {
        const compressed = await compressImage(fotoFile, 600, 0.8)
        foto_url = await uploadFile(compressed, 'avatares')
      }
      const payload = { ...form, foto_url, pontos: Number(form.pontos), titulos: Number(form.titulos) }
      if (editId) {
        const { error } = await supabase.from('mcs').update(payload).eq('id', editId)
        if (error) throw error
        toast('MC atualizado!')
      } else {
        const { error } = await supabase.from('mcs').insert(payload)
        if (error) throw error
        toast('MC criado!')
      }
      setModal(false)
      load()
    } catch (err: any) {
      toast(err.message ?? 'Erro ao salvar', true)
    }
    setSaving(false)
  }

  async function handleDelete(id: string) {
    if (!confirm('Excluir este MC?')) return
    await supabase.from('mcs').delete().eq('id', id)
    toast('MC removido.')
    load()
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div className="admin-panel-title" style={{ marginBottom: 0 }}>MCs</div>
        <button className="btn btn-y btn-sm" onClick={openNew}>+ Novo MC</button>
      </div>

      {loading
        ? <div className="aviso">Carregando...</div>
        : (
          <div className="grid-1px">
            {mcs.map(mc => (
              <div key={mc.id} className="admin-row admin-row-mc">
                <MCAvatar id={mc.id} nome={mc.nome} fotoUrl={mc.foto_url} size={44} />
                <div>
                  <div style={{ fontFamily: 'var(--FC)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em' }}>{mc.nome}</div>
                  <div style={{ fontFamily: 'var(--FC)', fontSize: '.78rem', color: 'var(--MU)' }}>
                    {mc.cidade ?? '—'} · {mc.pontos} pts · {mc.titulos} título(s)
                  </div>
                </div>
                <div className="admin-row-actions">
                  <button className="btn btn-ghost btn-sm" onClick={() => openEdit(mc)}>Editar</button>
                  <button className="btn btn-danger btn-sm" onClick={() => handleDelete(mc.id)}>Excluir</button>
                </div>
              </div>
            ))}
            {!mcs.length && <div className="aviso">Nenhum MC cadastrado ainda.</div>}
          </div>
        )}

      {/* MODAL */}
      {modal && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setModal(false) }}>
          <div className="modal-box">
            <div className="modal-header">
              {editId ? 'Editar MC' : 'Novo MC'}
              <button className="modal-close" onClick={() => setModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSave}>
              <div className="modal-body">
                {/* Foto preview */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.2rem' }}>
                  {fotoPreview
                    ? <img src={fotoPreview} alt="" style={{ width: 64, height: 64, objectFit: 'cover', border: '1px solid var(--B)' }} />
                    : <div style={{ width: 64, height: 64, background: 'var(--P4)', border: '1px solid var(--B)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--FC)', color: 'var(--MU)', fontSize: '.7rem' }}>Foto</div>
                  }
                  <div>
                    <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFotoChange} />
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => fileRef.current?.click()}>Escolher foto</button>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Nome *</label>
                  <input className="form-input" value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Cidade</label>
                  <input className="form-input" value={form.cidade} onChange={e => setForm({ ...form, cidade: e.target.value })} />
                </div>
                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Pontos</label>
                    <input className="form-input" type="number" min="0" value={form.pontos} onChange={e => setForm({ ...form, pontos: +e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Títulos</label>
                    <input className="form-input" type="number" min="0" value={form.titulos} onChange={e => setForm({ ...form, titulos: +e.target.value })} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Bio</label>
                  <textarea className="form-textarea" value={form.bio} onChange={e => setForm({ ...form, bio: e.target.value })} />
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-o btn-sm" onClick={() => setModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-y btn-sm" disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
