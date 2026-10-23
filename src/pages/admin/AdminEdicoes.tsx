import { useEffect, useState, useRef, FormEvent } from 'react'
import { supabase } from '../../lib/supabase'
import { uploadFile, compressImage, fmtData, statusClass, statusLabel } from '../../lib/utils'
import { useToast } from '../../hooks/useToast'
import { FORMATOS, formatoLabel, ehEquipe, equipeCampea } from '../../lib/equipes'
import AdminEventos from './AdminEventos'
import type { Edicao, EdicaoStatus, Formato, MC } from '../../types'

const EMPTY = {
  titulo: '', data: '', horario: '', local: '', descricao: '',
  status: 'em-breve' as EdicaoStatus, limite: 8,
  formato: 'solo' as Formato,
  banner_url: null as string | null, campeao_id: null as string | null,
  participantes: [] as string[], bracket: null as any,
}

type EdicaoWithCamp = Edicao & { campeao?: MC | null }

export default function AdminEdicoes() {
  const { show: toast } = useToast()
  const [edicoes, setEdicoes] = useState<EdicaoWithCamp[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ ...EMPTY })
  const [editId, setEditId] = useState<string | null>(null)
  const [origFormato, setOrigFormato] = useState<Formato>('solo')
  const [novoEventoSignal, setNovoEventoSignal] = useState(0)
  const [saving, setSaving] = useState(false)
  const [bannerPreview, setBannerPreview] = useState<string | null>(null)
  const [bannerFile, setBannerFile] = useState<File | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const load = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('edicoes').select('*, campeao:campeao_id(*)').order('data', { ascending: false })
    setEdicoes((data ?? []) as any)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  function openNew() {
    setEditId(null); setOrigFormato('solo'); setForm({ ...EMPTY }); setBannerPreview(null); setBannerFile(null); setModal(true)
  }

  function openEdit(ed: EdicaoWithCamp) {
    setEditId(ed.id)
    setOrigFormato(ed.formato ?? 'solo')
    setForm({
      titulo: ed.titulo, data: ed.data ?? '', horario: ed.horario ?? '',
      local: ed.local ?? '', descricao: ed.descricao ?? '', status: ed.status,
      formato: ed.formato ?? 'solo',
      limite: ed.limite, banner_url: ed.banner_url,
      campeao_id: ed.campeao_id, participantes: ed.participantes ?? [], bracket: ed.bracket,
    })
    setBannerPreview(ed.banner_url)
    setBannerFile(null)
    setModal(true)
  }

  function handleBannerChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setBannerFile(file)
    setBannerPreview(URL.createObjectURL(file))
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault()
    if (!form.titulo.trim()) return
    setSaving(true)
    try {
      let banner_url = form.banner_url
      if (bannerFile) {
        const compressed = await compressImage(bannerFile, 1080, 0.85)
        banner_url = await uploadFile(compressed, 'banners')
      }
      const payload: Record<string, unknown> = { ...form, banner_url, limite: Number(form.limite) }
      // Trocou o formato (só é permitido sem bracket): as equipes antigas não valem mais
      if (editId && form.formato !== origFormato) payload.equipes = []
      if (editId) {
        const { error } = await supabase.from('edicoes').update(payload).eq('id', editId)
        if (error) throw error
        toast('Edição atualizada!')
      } else {
        const { error } = await supabase.from('edicoes').insert(payload)
        if (error) throw error
        toast('Edição criada!')
      }
      setModal(false)
      load()
    } catch (err: any) {
      toast(err.message ?? 'Erro ao salvar', true)
    }
    setSaving(false)
  }

  async function handleDelete(id: string) {
    if (!confirm('Excluir esta edição?')) return
    await supabase.from('edicoes').delete().eq('id', id)
    toast('Edição removida.')
    load()
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '.75rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
        <div className="admin-panel-title" style={{ marginBottom: 0 }}>Edições / Eventos</div>
        <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
          <button className="btn btn-y btn-sm" onClick={openNew}>+ Nova Edição</button>
          <button className="btn btn-o btn-sm" onClick={() => setNovoEventoSignal(n => n + 1)}>+ Novo Evento</button>
        </div>
      </div>

      <div className="sec-label" style={{ marginBottom: '.75rem' }}>Edições de batalha</div>

      {loading
        ? <div className="aviso">Carregando...</div>
        : (
          <div className="grid-1px">
            {edicoes.map(ed => (
              <div key={ed.id} className="admin-row admin-row-ed">
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '.6rem', marginBottom: '.2rem' }}>
                    <span className={`status-pill ${statusClass(ed.status)}`} style={{ fontSize: '.55rem' }}>{statusLabel(ed.status)}</span>
                    <span style={{ fontFamily: 'var(--FC)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em' }}>{ed.titulo}</span>
                  </div>
                  <div style={{ fontFamily: 'var(--FC)', fontSize: '.78rem', color: 'var(--MU)' }}>
                    {fmtData(ed.data)}{ed.local ? ` · ${ed.local}` : ''} · {ed.limite} MCs
                    {ehEquipe(ed.formato) && ` · ${formatoLabel(ed.formato)}`}
                    {ed.campeao && ` · 🏆 ${(ed.campeao as any).nome}`}
                    {!ed.campeao && equipeCampea(ed) && ` · 🏆 ${equipeCampea(ed)!.nome}`}
                  </div>
                </div>
                <div className="admin-row-actions">
                  <button className="btn btn-ghost btn-sm" onClick={() => openEdit(ed)}>Editar</button>
                  <button className="btn btn-danger btn-sm" onClick={() => handleDelete(ed.id)}>Excluir</button>
                </div>
              </div>
            ))}
            {!edicoes.length && <div className="aviso">Nenhuma edição cadastrada.</div>}
          </div>
        )}

      {/* MODAL */}
      {modal && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setModal(false) }}>
          <div className="modal-box modal-box-lg">
            <div className="modal-header">
              {editId ? 'Editar Edição' : 'Nova Edição'}
              <button className="modal-close" onClick={() => setModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSave}>
              <div className="modal-body">
                {/* Banner */}
                <div style={{ marginBottom: '1.2rem' }}>
                  {bannerPreview && (
                    <div style={{ background: 'var(--P4)', marginBottom: '.5rem', overflow: 'hidden', border: '1px solid var(--B)' }}>
                      <img src={bannerPreview} alt="" style={{ width: '100%', height: 'auto', display: 'block' }} />
                    </div>
                  )}
                  <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleBannerChange} />
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => fileRef.current?.click()}>
                    {bannerPreview ? 'Trocar Banner' : 'Escolher Banner'}
                  </button>
                  <span style={{ fontFamily: 'var(--FC)', fontSize: '.68rem', color: 'var(--MU)', marginLeft: '.75rem' }}>
                    Suporta qualquer proporção — recomendado: post do Instagram (1:1 ou 4:5)
                  </span>
                </div>

                <div className="form-group">
                  <label className="form-label">Título *</label>
                  <input className="form-input" value={form.titulo} onChange={e => setForm({ ...form, titulo: e.target.value })} required />
                </div>
                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Data</label>
                    <input className="form-input" type="date" value={form.data} onChange={e => setForm({ ...form, data: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Horário</label>
                    <input className="form-input" placeholder="Ex: 15h" value={form.horario} onChange={e => setForm({ ...form, horario: e.target.value })} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Local</label>
                  <input className="form-input" value={form.local} onChange={e => setForm({ ...form, local: e.target.value })} />
                </div>
                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Status</label>
                    <select className="form-select" value={form.status} onChange={e => setForm({ ...form, status: e.target.value as any })}>
                      <option value="em-breve">Em Breve</option>
                      <option value="confirmada">Confirmada</option>
                      <option value="encerrada">Encerrada</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Limite de MCs</label>
                    <input className="form-input" type="number" min="4" value={form.limite} onChange={e => setForm({ ...form, limite: +e.target.value })} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Formato da batalha</label>
                  <select
                    className="form-select"
                    value={form.formato}
                    disabled={!!editId && !!form.bracket}
                    onChange={e => setForm({ ...form, formato: e.target.value as Formato })}
                  >
                    {FORMATOS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                  </select>
                  <div style={{ fontFamily: 'var(--FC)', fontSize: '.68rem', color: 'var(--MU)', marginTop: '.35rem', lineHeight: 1.5 }}>
                    {editId && form.bracket
                      ? 'O formato não pode mudar depois que o chaveamento foi criado. Reset o bracket (aba Bracket) para trocar.'
                      : ehEquipe(form.formato)
                        ? 'As equipes são montadas na aba Bracket, a partir dos MCs participantes.'
                        : 'Cada MC batalha sozinho.'}
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Descrição</label>
                  <textarea className="form-textarea" value={form.descricao} onChange={e => setForm({ ...form, descricao: e.target.value })} />
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

      {/* EVENTOS (show, breakdance, grafite...) */}
      <AdminEventos novoSignal={novoEventoSignal} />
    </div>
  )
}
