import { useEffect, useRef, useState, FormEvent } from 'react'
import { supabase } from '../../lib/supabase'
import { uploadFile, compressImage, fmtData, statusClass, statusLabel } from '../../lib/utils'
import { CATEGORIAS_EVENTO, categoriaIcon, categoriaLabel, linkSeguro } from '../../lib/eventos'
import { useToast } from '../../hooks/useToast'
import type { Evento, EventoCategoria, EdicaoStatus } from '../../types'

const EMPTY = {
  titulo: '', categoria: 'show' as EventoCategoria, data: '', horario: '', local: '',
  descricao: '', link_url: '', status: 'em-breve' as EdicaoStatus, banner_url: null as string | null,
}

/** Texto vazio vira null (colunas `date` não aceitam ''). */
const orNull = (s: string) => (s.trim() ? s.trim() : null)

/**
 * Seção "Eventos" do painel Edições / Eventos: shows, breakdance, grafite etc.
 * `novoSignal`: cada vez que o número aumenta, abre o formulário de novo evento
 * (usado pelo botão "+ Novo Evento" do topo da página).
 */
export default function AdminEventos({ novoSignal }: { novoSignal: number }) {
  const { show: toast } = useToast()
  const [eventos, setEventos] = useState<Evento[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ ...EMPTY })
  const [editId, setEditId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [bannerPreview, setBannerPreview] = useState<string | null>(null)
  const [bannerFile, setBannerFile] = useState<File | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const load = async () => {
    setLoading(true)
    const { data } = await supabase.from('eventos').select('*').order('data', { ascending: false, nullsFirst: true })
    setEventos((data ?? []) as Evento[])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  function openNew() {
    setEditId(null); setForm({ ...EMPTY }); setBannerPreview(null); setBannerFile(null); setModal(true)
  }

  // Botão "+ Novo Evento" do topo da página
  useEffect(() => { if (novoSignal > 0) openNew() }, [novoSignal])

  function openEdit(ev: Evento) {
    setEditId(ev.id)
    setForm({
      titulo: ev.titulo, categoria: ev.categoria, data: ev.data ?? '', horario: ev.horario ?? '',
      local: ev.local ?? '', descricao: ev.descricao ?? '', link_url: ev.link_url ?? '',
      status: ev.status, banner_url: ev.banner_url,
    })
    setBannerPreview(ev.banner_url); setBannerFile(null); setModal(true)
  }

  function handleBannerChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setBannerFile(file); setBannerPreview(URL.createObjectURL(file))
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault()
    if (!form.titulo.trim()) return
    if (form.link_url.trim() && !linkSeguro(form.link_url)) {
      toast('O link precisa começar com http:// ou https://', true); return
    }
    setSaving(true)
    try {
      let banner_url = form.banner_url
      if (bannerFile) {
        const compressed = await compressImage(bannerFile, 1080, 0.85)
        banner_url = await uploadFile(compressed, 'banners')
      }
      const payload = {
        titulo: form.titulo.trim(), categoria: form.categoria, status: form.status, banner_url,
        data: orNull(form.data), horario: orNull(form.horario), local: orNull(form.local),
        descricao: orNull(form.descricao), link_url: orNull(form.link_url),
      }
      if (editId) {
        const { error } = await supabase.from('eventos').update(payload).eq('id', editId)
        if (error) throw error
        toast('Evento atualizado!')
      } else {
        const { error } = await supabase.from('eventos').insert(payload)
        if (error) throw error
        toast('Evento criado!')
      }
      setModal(false); load()
    } catch (err: any) {
      toast(err.message ?? 'Erro ao salvar', true)
    }
    setSaving(false)
  }

  async function handleDelete(id: string) {
    if (!confirm('Excluir este evento?')) return
    const { error } = await supabase.from('eventos').delete().eq('id', id)
    if (error) { toast('Não foi possível excluir', true); return }
    toast('Evento removido.'); load()
  }

  return (
    <div id="eventos" style={{ marginTop: '3rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '.75rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
        <div>
          <div className="sec-label" style={{ marginBottom: '.15rem' }}>Eventos</div>
          <div style={{ fontFamily: 'var(--FC)', fontSize: '.78rem', color: 'var(--MU)' }}>
            Shows, breakdance, grafite e outros eventos que não são batalha.
          </div>
        </div>
        <button className="btn btn-o btn-sm" onClick={openNew}>+ Novo Evento</button>
      </div>

      {loading ? <div className="aviso">Carregando...</div> : (
        <div className="grid-1px">
          {eventos.map(ev => (
            <div key={ev.id} className="admin-row admin-row-ed">
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '.6rem', marginBottom: '.2rem', flexWrap: 'wrap' }}>
                  <span className={`status-pill ${statusClass(ev.status)}`} style={{ fontSize: '.55rem' }}>{statusLabel(ev.status)}</span>
                  <span className="tag tag-part" style={{ cursor: 'default' }}>{categoriaIcon(ev.categoria)} {categoriaLabel(ev.categoria)}</span>
                  <span style={{ fontFamily: 'var(--FC)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', overflowWrap: 'anywhere' }}>{ev.titulo}</span>
                </div>
                <div style={{ fontFamily: 'var(--FC)', fontSize: '.78rem', color: 'var(--MU)' }}>
                  {fmtData(ev.data)}{ev.horario ? ` · ${ev.horario}` : ''}{ev.local ? ` · ${ev.local}` : ''}
                </div>
              </div>
              <div className="admin-row-actions">
                <button className="btn btn-ghost btn-sm" onClick={() => openEdit(ev)}>Editar</button>
                <button className="btn btn-danger btn-sm" onClick={() => handleDelete(ev.id)}>Excluir</button>
              </div>
            </div>
          ))}
          {!eventos.length && <div className="aviso">Nenhum evento cadastrado. Use “+ Novo Evento” para adicionar um show, breakdance etc.</div>}
        </div>
      )}

      {modal && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setModal(false) }}>
          <div className="modal-box modal-box-lg">
            <div className="modal-header">
              {editId ? 'Editar Evento' : 'Novo Evento'}
              <button className="modal-close" onClick={() => setModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSave}>
              <div className="modal-body">
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
                    Qualquer proporção — recomendado: post do Instagram (1:1 ou 4:5)
                  </span>
                </div>

                <div className="form-group">
                  <label className="form-label">Título *</label>
                  <input className="form-input" value={form.titulo} onChange={e => setForm({ ...form, titulo: e.target.value })} required />
                </div>
                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Tipo de evento</label>
                    <select className="form-select" value={form.categoria} onChange={e => setForm({ ...form, categoria: e.target.value as EventoCategoria })}>
                      {CATEGORIAS_EVENTO.map(c => <option key={c.value} value={c.value}>{c.icon} {c.label}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Status</label>
                    <select className="form-select" value={form.status} onChange={e => setForm({ ...form, status: e.target.value as EdicaoStatus })}>
                      <option value="em-breve">Em Breve</option>
                      <option value="confirmada">Confirmado</option>
                      <option value="encerrada">Encerrado</option>
                    </select>
                  </div>
                </div>
                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Data</label>
                    <input className="form-input" type="date" value={form.data} onChange={e => setForm({ ...form, data: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Horário</label>
                    <input className="form-input" placeholder="Ex: 20h" value={form.horario} onChange={e => setForm({ ...form, horario: e.target.value })} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Local</label>
                  <input className="form-input" value={form.local} onChange={e => setForm({ ...form, local: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Link (opcional)</label>
                  <input className="form-input" type="url" placeholder="https://… (ingressos, inscrição, Instagram do evento)" value={form.link_url} onChange={e => setForm({ ...form, link_url: e.target.value })} />
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
    </div>
  )
}
