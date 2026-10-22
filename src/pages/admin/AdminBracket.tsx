import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { getPhasesForN } from '../../lib/utils'
import { useToast } from '../../hooks/useToast'
import {
  fetchBracketMeta, calcMatchDeltas, calcSweepBonusDeltas,
  calcPhaseCompletionDeltas, applyDeltas, type DeltaSummary,
} from '../../lib/scoring'
import type { Edicao, MC, BracketData, BracketMatch, BracketMeta } from '../../types'

// ─── helpers ──────────────────────────────────────────────────────────────────

function calcWinner(m: BracketMatch): string | null {
  const rounds = m.rounds ?? []
  const w1 = rounds.filter(r => r.winner === m.mc1).length
  const w2 = rounds.filter(r => r.winner === m.mc2).length
  if (w1 >= 2) return m.mc1
  if (w2 >= 2) return m.mc2
  return null
}

// ─── Score Log ────────────────────────────────────────────────────────────────

function ScoreLog({ summaries, onClose }: { summaries: DeltaSummary[]; onClose: () => void }) {
  if (!summaries.length) return null
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem' }}>
          <div style={{ fontFamily: 'var(--FD)', fontSize: '1.3rem', color: 'var(--W)', letterSpacing: '.04em' }}>Pontuação Aplicada</div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem', marginBottom: '1.2rem' }}>
          {summaries.map((s, i) => (
            <div key={i} style={{ background: 'var(--P4)', border: `1px solid ${s.total >= 0 ? 'rgba(171,49,48,.25)' : 'rgba(204,80,80,.25)'}`, padding: '.6rem .85rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '.3rem' }}>
                <span style={{ fontFamily: 'var(--FC)', fontSize: '.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--W)' }}>{s.nome}</span>
                <span style={{ fontFamily: 'var(--FD)', fontSize: '1.2rem', color: s.total >= 0 ? 'var(--Y)' : 'var(--R)', lineHeight: 1 }}>
                  {s.total > 0 ? '+' : ''}{s.total}pts
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '.15rem' }}>
                {s.reasons.map((r, j) => (
                  <span key={j} style={{ fontFamily: 'var(--FC)', fontSize: '.65rem', color: 'var(--MU)', letterSpacing: '.04em' }}>{r}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
        <button className="btn btn-y btn-sm" onClick={onClose}>OK</button>
      </div>
    </div>
  )
}

// ─── Round Modal ──────────────────────────────────────────────────────────────

interface RoundModalProps {
  match: BracketMatch; phKey: string; matchIdx: number; phaseName: string
  getMC: (id: string | null) => MC | undefined
  onClose: () => void
  onSave: (phKey: string, idx: number, updatedMatch: BracketMatch) => Promise<void>
}

function RoundModal({ match, phKey, matchIdx, phaseName, getMC, onClose, onSave }: RoundModalProps) {
  const [m, setM] = useState<BracketMatch>(() => ({ ...match, rounds: match.rounds?.length ? match.rounds : [] }))
  const [saving, setSaving] = useState(false)
  const mc1 = getMC(m.mc1); const mc2 = getMC(m.mc2)
  const w1 = (m.rounds ?? []).filter(r => r.winner === m.mc1).length
  const w2 = (m.rounds ?? []).filter(r => r.winner === m.mc2).length
  const decided = w1 >= 2 || w2 >= 2
  const totalRounds = decided ? m.rounds.length : Math.min(m.rounds.length + 1, 3)
  const winner = calcWinner(m)

  function setRoundWinner(ri: number, winnerId: string) {
    const newRounds = [...(m.rounds ?? [])]
    if (newRounds[ri]?.winner === winnerId) {
      setM({ ...m, rounds: newRounds.slice(0, ri), winner: null }); return
    }
    if (ri < newRounds.length) newRounds[ri] = { winner: winnerId }
    else newRounds.push({ winner: winnerId })
    const updated = { ...m, rounds: newRounds }
    updated.winner = calcWinner(updated)
    setM(updated)
  }

  async function handleSave() {
    setSaving(true)
    await onSave(phKey, matchIdx, { ...m, winner: calcWinner(m) })
    setSaving(false); onClose()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" style={{ maxWidth: 520 }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
          <div>
            <div style={{ fontFamily: 'var(--FC)', fontSize: '.65rem', letterSpacing: '.2em', textTransform: 'uppercase', color: 'var(--Y)', marginBottom: '.2rem' }}>{phaseName} · Confronto {matchIdx + 1}</div>
            <div style={{ fontFamily: 'var(--FD)', fontSize: '1.5rem', color: 'var(--W)' }}>{mc1?.nome ?? '?'} <span style={{ color: 'var(--MU)' }}>vs</span> {mc2?.nome ?? '?'}</div>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '.5rem', marginBottom: '1.2rem', textAlign: 'center' }}>
          <div style={{ fontFamily: 'var(--FC)', fontSize: '.82rem', fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: w1 >= 2 ? 'var(--Y)' : 'var(--W)' }}>
            {mc1?.nome ?? 'MC 1'}{w1 > 0 && <span style={{ marginLeft: '.4rem', color: 'var(--Y)' }}>{'●'.repeat(w1)}</span>}
          </div>
          <div style={{ fontFamily: 'var(--FC)', fontSize: '.7rem', color: 'var(--MU)', alignSelf: 'center' }}>VS</div>
          <div style={{ fontFamily: 'var(--FC)', fontSize: '.82rem', fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: w2 >= 2 ? 'var(--Y)' : 'var(--W)' }}>
            {mc2?.nome ?? 'MC 2'}{w2 > 0 && <span style={{ marginLeft: '.4rem', color: 'var(--Y)' }}>{'●'.repeat(w2)}</span>}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '.6rem', marginBottom: '1.5rem' }}>
          {Array.from({ length: totalRounds }).map((_, ri) => {
            const rnd = m.rounds?.[ri]
            const prevDone = ri === 0 || !!m.rounds?.[ri - 1]?.winner
            const prevW1 = (m.rounds ?? []).slice(0, ri).filter(r => r.winner === m.mc1).length
            const prevW2 = (m.rounds ?? []).slice(0, ri).filter(r => r.winner === m.mc2).length
            const alreadyOver = prevW1 >= 2 || prevW2 >= 2
            const w1r = rnd?.winner === m.mc1; const w2r = rnd?.winner === m.mc2
            return (
              <div key={ri} style={{ border: '1px solid var(--B)', background: alreadyOver ? 'rgba(0,0,0,.2)' : 'var(--P3)', opacity: alreadyOver ? .4 : 1 }}>
                <div style={{ fontFamily: 'var(--FC)', fontSize: '.58rem', fontWeight: 700, letterSpacing: '.2em', textTransform: 'uppercase', color: 'var(--MU)', padding: '.35rem .75rem', borderBottom: '1px solid var(--B)', background: 'var(--P4)', display: 'flex', gap: '.5rem' }}>
                  <span>Round {ri + 1}</span>
                  {w1r && <span style={{ color: 'var(--Y)' }}>→ {mc1?.nome} venceu</span>}
                  {w2r && <span style={{ color: 'var(--Y)' }}>→ {mc2?.nome} venceu</span>}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
                  <button disabled={!prevDone || alreadyOver} onClick={() => m.mc1 && setRoundWinner(ri, m.mc1)}
                    style={{ padding: '.75rem 1rem', border: 'none', borderRight: '1px solid var(--B)', background: w1r ? 'rgba(171,49,48,.2)' : 'transparent', color: w1r ? 'var(--Y)' : 'var(--W)', fontFamily: 'var(--FC)', fontSize: '.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em', cursor: (!prevDone || alreadyOver) ? 'default' : 'pointer', transition: 'background .15s', display: 'flex', alignItems: 'center', gap: '.5rem', justifyContent: 'center' }}>
                    {w1r && <span>✓</span>}{mc1?.nome ?? 'MC 1'}
                  </button>
                  <button disabled={!prevDone || alreadyOver} onClick={() => m.mc2 && setRoundWinner(ri, m.mc2)}
                    style={{ padding: '.75rem 1rem', border: 'none', background: w2r ? 'rgba(171,49,48,.2)' : 'transparent', color: w2r ? 'var(--Y)' : 'var(--W)', fontFamily: 'var(--FC)', fontSize: '.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em', cursor: (!prevDone || alreadyOver) ? 'default' : 'pointer', transition: 'background .15s', display: 'flex', alignItems: 'center', gap: '.5rem', justifyContent: 'center' }}>
                    {mc2?.nome ?? 'MC 2'}{w2r && <span>✓</span>}
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        {!decided && m.rounds?.length === 2 && w1 === 1 && w2 === 1 && (
          <div style={{ fontFamily: 'var(--FC)', fontSize: '.75rem', color: 'var(--SC)', marginBottom: '1rem', padding: '.5rem .75rem', border: '1px solid rgba(171,49,48,.3)', background: 'rgba(171,49,48,.06)' }}>
            ⚡ Empate 1×1 — Round 3 necessário!
          </div>
        )}

        {winner && (
          <div style={{ background: 'rgba(171,49,48,.1)', border: '1px solid rgba(171,49,48,.4)', padding: '.8rem 1.2rem', marginBottom: '1.2rem', display: 'flex', alignItems: 'center', gap: '.75rem' }}>
            <span style={{ fontSize: '1.4rem' }}>🏆</span>
            <div>
              <div style={{ fontFamily: 'var(--FC)', fontSize: '.6rem', letterSpacing: '.2em', color: 'var(--Y)', textTransform: 'uppercase' }}>Vencedor ({w1}-{w2})</div>
              <div style={{ fontFamily: 'var(--FD)', fontSize: '1.3rem', color: 'var(--W)' }}>{getMC(winner)?.nome}</div>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: '.75rem' }}>
          <button className="btn btn-y btn-sm" onClick={handleSave} disabled={saving}>{saving ? 'Salvando…' : 'Confirmar'}</button>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>Cancelar</button>
        </div>
      </div>
    </div>
  )
}

// ─── Seed Modal ───────────────────────────────────────────────────────────────

interface SeedModalProps {
  participants: string[]; getMC: (id: string | null) => MC | undefined
  slotCount: number; onConfirm: (slots: string[]) => void; onCancel: () => void
}

function SeedModal({ participants, getMC, slotCount, onConfirm, onCancel }: SeedModalProps) {
  const [slots, setSlots] = useState<string[]>(Array(slotCount).fill(''))
  const used = slots.filter(Boolean)
  const available = participants.filter(id => !used.includes(id))

  function assignSlot(si: number, mcId: string) {
    const next = [...slots]
    const prev = next.indexOf(mcId)
    if (prev !== -1 && prev !== si) next[prev] = ''
    next[si] = mcId; setSlots(next)
  }
  function randomize() { setSlots([...participants].sort(() => Math.random() - .5)) }
  const allFilled = slots.every(Boolean) && slots.length === slotCount

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-box" style={{ maxWidth: 680 }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem' }}>
          <div>
            <div style={{ fontFamily: 'var(--FC)', fontSize: '.65rem', letterSpacing: '.2em', textTransform: 'uppercase', color: 'var(--Y)', marginBottom: '.2rem' }}>Bracket Manual</div>
            <div style={{ fontFamily: 'var(--FD)', fontSize: '1.4rem', color: 'var(--W)' }}>Definir Chaveamento</div>
          </div>
          <button className="modal-close" onClick={onCancel}>✕</button>
        </div>
        <p style={{ fontFamily: 'var(--FC)', fontSize: '.78rem', color: 'var(--MU)', marginBottom: '1.2rem', lineHeight: 1.6 }}>Slot 1 vs 2, Slot 3 vs 4, e assim por diante.</p>
        <div className="split-2" style={{ gap: '1.5rem' }}>
          <div>
            <div style={{ fontFamily: 'var(--FC)', fontSize: '.62rem', letterSpacing: '.18em', textTransform: 'uppercase', color: 'var(--MU)', marginBottom: '.6rem' }}>Slots</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '.3rem' }}>
              {slots.map((slotMcId, si) => {
                const mc = getMC(slotMcId || null)
                return (
                  <div key={si}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '.4rem' }}>
                      <div style={{ width: 26, height: 26, flexShrink: 0, border: '1px solid var(--B)', background: 'var(--P4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--FC)', fontSize: '.7rem', color: 'var(--Y)', fontWeight: 700 }}>{si + 1}</div>
                      <select value={slotMcId} onChange={e => { if (e.target.value) assignSlot(si, e.target.value); else { const n=[...slots]; n[si]=''; setSlots(n) } }}
                        style={{ flex: 1, background: mc ? 'rgba(171,49,48,.1)' : 'var(--P3)', border: `1px solid ${mc ? 'rgba(171,49,48,.4)' : 'var(--B)'}`, color: mc ? 'var(--W)' : 'var(--MU2)', padding: '.35rem .5rem', fontFamily: 'var(--FC)', fontSize: '.8rem', fontWeight: mc ? 700 : 400, textTransform: mc ? 'uppercase' : 'none' }}>
                        <option value="">— Selecionar MC —</option>
                        {slotMcId && <option value={slotMcId}>{mc?.nome}</option>}
                        {available.map(id => <option key={id} value={id}>{getMC(id)?.nome}</option>)}
                      </select>
                    </div>
                    {si % 2 === 1 && si < slots.length - 1 && <div style={{ height: 8, borderLeft: '1px dashed var(--B)', marginLeft: 13, marginTop: 2, marginBottom: 2 }} />}
                  </div>
                )
              })}
            </div>
          </div>
          <div>
            <div style={{ fontFamily: 'var(--FC)', fontSize: '.62rem', letterSpacing: '.18em', textTransform: 'uppercase', color: 'var(--MU)', marginBottom: '.6rem' }}>Confrontos</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '.4rem' }}>
              {Array.from({ length: Math.ceil(slots.length / 2) }).map((_, mi) => {
                const s1 = slots[mi * 2]; const s2 = slots[mi * 2 + 1]
                return (
                  <div key={mi} style={{ border: `1px solid ${s1 && s2 ? 'rgba(171,49,48,.3)' : 'var(--B)'}`, background: 'var(--P4)' }}>
                    <div style={{ padding: '.35rem .6rem', fontFamily: 'var(--FC)', fontSize: '.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.04em', color: s1 ? 'var(--W)' : 'var(--MU2)', borderBottom: '1px solid var(--B)' }}>{s1 ? getMC(s1)?.nome : `Slot ${mi * 2 + 1}`}</div>
                    <div style={{ padding: '.35rem .6rem', fontFamily: 'var(--FC)', fontSize: '.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.04em', color: s2 ? 'var(--W)' : 'var(--MU2)' }}>{s2 ? getMC(s2)?.nome : `Slot ${mi * 2 + 2}`}</div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '.75rem', marginTop: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <button className="btn btn-y btn-sm" onClick={() => onConfirm(slots)} disabled={!allFilled}>✓ Confirmar Chaveamento</button>
          <button className="btn btn-ghost btn-sm" onClick={randomize}>🎲 Aleatorizar</button>
          <button className="btn btn-ghost btn-sm" onClick={onCancel}>Cancelar</button>
          {!allFilled && <span style={{ fontFamily: 'var(--FC)', fontSize: '.68rem', color: 'var(--R)' }}>Preencha todos os {slotCount} slots.</span>}
        </div>
      </div>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function AdminBracket() {
  const { show: toast } = useToast()
  const [edicoes, setEdicoes] = useState<Edicao[]>([])
  const [mcs, setMCs] = useState<MC[]>([])
  const [selEdId, setSelEdId] = useState('')
  const [ed, setEd] = useState<Edicao | null>(null)
  const [champNome, setChampNome] = useState<string | null>(null)
  const [activeMatch, setActiveMatch] = useState<{ phKey: string; idx: number } | null>(null)
  const [showSeedModal, setShowSeedModal] = useState(false)
  const [scoreLog, setScoreLog] = useState<DeltaSummary[]>([])

  const getMC = useCallback((id: string | null) => mcs.find(m => m.id === id), [mcs])

  useEffect(() => {
    Promise.all([
      supabase.from('edicoes').select('*').order('data', { ascending: false }),
      supabase.from('mcs').select('*').order('nome'),
    ]).then(([edsR, mcsR]) => { setEdicoes(edsR.data ?? []); setMCs(mcsR.data ?? []) })
  }, [])

  useEffect(() => {
    if (!selEdId) return
    supabase.from('edicoes').select('*').eq('id', selEdId).single().then(({ data }) => {
      setEd(data); setChampNome(data?.campeao_id ? getMC(data.campeao_id)?.nome ?? null : null)
    })
    const ch = supabase.channel(`bracket-${selEdId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'edicoes', filter: `id=eq.${selEdId}` }, payload => {
        const nova = payload.new as Edicao
        setEd(nova); setChampNome(nova.campeao_id ? getMC(nova.campeao_id)?.nome ?? null : null)
      }).subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [selEdId, getMC])

  async function togglePart(mcId: string, checked: boolean) {
    if (!ed) return
    const set = new Set(ed.participantes ?? [])
    checked ? set.add(mcId) : set.delete(mcId)
    const participantes = Array.from(set)
    const { error } = await supabase.from('edicoes').update({ participantes }).eq('id', ed.id)
    if (!error) setEd({ ...ed, participantes })
  }

  async function buildBracket(slots: string[]): Promise<BracketData> {
    const phases = getPhasesForN(slots.length)
    const matches: BracketData['matches'] = {}
    matches[phases[0].key] = []
    for (let i = 0; i < slots.length; i += 2)
      matches[phases[0].key].push({ mc1: slots[i], mc2: slots[i + 1] ?? null, winner: null, rounds: [] })
    phases.slice(1).forEach(p => { matches[p.key] = [] })
    const meta = await fetchBracketMeta(ed!.id)
    return { phases: phases.map(p => p.key), matches, meta }
  }

  async function confirmManual(slots: string[]) {
    if (!ed) return
    if (ed.bracket && !confirm('Isso apagará o bracket atual. Continuar?')) return
    const bracket = await buildBracket(slots)
    await supabase.from('edicoes').update({ bracket, campeao_id: null, status: 'confirmada' }).eq('id', ed.id)
    setEd({ ...ed, bracket, campeao_id: null }); setChampNome(null); setShowSeedModal(false)
    toast('Chaveamento manual criado!')
  }

  async function gerarAleatorio() {
    if (!ed) return
    const parts = ed.participantes ?? []
    if (parts.length !== 8 && parts.length !== 16) { toast(`Selecione 8 ou 16 participantes (atual: ${parts.length})`, true); return }
    if (ed.bracket && !confirm('Isso apagará o bracket atual. Continuar?')) return
    const bracket = await buildBracket([...parts].sort(() => Math.random() - .5))
    await supabase.from('edicoes').update({ bracket, campeao_id: null, status: 'confirmada' }).eq('id', ed.id)
    setEd({ ...ed, bracket, campeao_id: null }); setChampNome(null)
    toast('Chaveamento aleatório gerado!')
  }

  async function resetBracket() {
    if (!ed || !confirm('Resetar o bracket?')) return
    await supabase.from('edicoes').update({ bracket: null, campeao_id: null }).eq('id', ed.id)
    setEd({ ...ed, bracket: null, campeao_id: null }); setChampNome(null)
    toast('Bracket resetado.')
  }

  async function saveMatch(phKey: string, matchIdx: number, updatedMatch: BracketMatch) {
    if (!ed?.bracket) return

    const bracket: BracketData = JSON.parse(JSON.stringify(ed.bracket))
    const prevMatch = bracket.matches[phKey][matchIdx]
    bracket.matches[phKey][matchIdx] = updatedMatch

    const allDeltas: import('../../lib/scoring').PointDelta[] = []
    let metaUpdates: Partial<BracketMeta> = {}

    // 1. Per-match points (only when winner is set for the first time)
    if (!prevMatch.pointsApplied && updatedMatch.winner) {
      const { deltas: md, metaUpdates: mmu } = calcMatchDeltas(bracket, phKey, updatedMatch)
      allDeltas.push(...md)
      Object.assign(metaUpdates, mmu)
      if (bracket.meta) Object.assign(bracket.meta, mmu)
      bracket.matches[phKey][matchIdx].pointsApplied = true

      // 2. Sweep bonus (3x 2-0)
      const { deltas: sd, metaUpdates: smu } = calcSweepBonusDeltas(bracket, updatedMatch.winner)
      allDeltas.push(...sd)
      Object.assign(metaUpdates, smu)
      if (bracket.meta) Object.assign(bracket.meta, smu)
    }

    const phaseKeys = bracket.phases
    const phIdx = phaseKeys.indexOf(phKey)
    const allPhaseMatches = bracket.matches[phKey]
    const phaseComplete = allPhaseMatches.every(m => !!m.winner)

    let campeao_id = ed.campeao_id
    let status = ed.status

    if (phaseComplete) {
      // 3. Phase completion points (semi, final)
      const { deltas: phD, metaUpdates: phMu } = calcPhaseCompletionDeltas(bracket, phKey)
      allDeltas.push(...phD)
      Object.assign(metaUpdates, phMu)
      if (bracket.meta) Object.assign(bracket.meta, phMu)

      const winners = allPhaseMatches.map(m => m.winner!)
      const isLast = phIdx === phaseKeys.length - 1

      if (isLast || winners.length === 1) {
        // CHAMPION
        campeao_id = winners[0]
        status = 'encerrada'
        const champMC = getMC(campeao_id)
        if (champMC) {
          await supabase.from('mcs').update({ titulos: (champMC.titulos ?? 0) + 1 }).eq('id', campeao_id)
          setChampNome(champMC.nome)
        }
      } else {
        // Advance to next phase
        const nextKey = phaseKeys[phIdx + 1]
        bracket.matches[nextKey] = []
        for (let i = 0; i < winners.length; i += 2)
          bracket.matches[nextKey].push({ mc1: winners[i], mc2: winners[i + 1] ?? null, winner: null, rounds: [] })
      }
    }

    // 4. Apply all point changes and build log
    const latestMCs = mcs.map(m => ({ ...m })) // local copy for sequential updates
    const summaries = await applyDeltas(allDeltas, latestMCs)
    if (summaries.length) {
      setScoreLog(summaries)
      // Refresh MC state so subsequent saves use updated points
      const { data } = await supabase.from('mcs').select('*').order('nome')
      if (data) setMCs(data)
    }

    if (champNome === null && campeao_id) {
      const champName = getMC(campeao_id)?.nome ?? null
      if (champName) toast(`🏆 Campeão: ${champName}`)
    }

    await supabase.from('edicoes').update({ bracket, campeao_id, status }).eq('id', ed.id)
    setEd({ ...ed, bracket, campeao_id, status })
  }

  const phases = ed ? getPhasesForN((ed.participantes ?? []).length || 8) : []
  const partCount = (ed?.participantes ?? []).length
  const validCount = partCount === 8 || partCount === 16
  const activeMatchData = activeMatch && ed?.bracket ? ed.bracket.matches[activeMatch.phKey]?.[activeMatch.idx] : null
  const activePhaseName = activeMatch ? phases.find(p => p.key === activeMatch.phKey)?.name ?? activeMatch.phKey : ''

  // Show scoring rules info panel
  const meta = ed?.bracket?.meta as BracketMeta | undefined

  return (
    <div>
      <div className="admin-panel-title">Bracket / Chaveamento</div>

      <div className="form-group" style={{ maxWidth: 360, marginBottom: '2rem' }}>
        <label className="form-label">Edição</label>
        <select className="form-select" value={selEdId} onChange={e => { setSelEdId(e.target.value); setEd(null); setChampNome(null) }}>
          <option value="">Selecione uma edição...</option>
          {edicoes.map(e => <option key={e.id} value={e.id}>{e.titulo}</option>)}
        </select>
      </div>

      {ed && (
        <>
          {/* SCORING CONTEXT INFO */}
          {meta && (
            <div style={{ background: 'var(--P3)', border: '1px solid var(--B)', padding: '.75rem 1rem', marginBottom: '1.5rem', display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontFamily: 'var(--FC)', fontSize: '.58rem', letterSpacing: '.18em', textTransform: 'uppercase', color: 'var(--MU)', marginBottom: '.2rem' }}>Último campeão</div>
                <div style={{ fontFamily: 'var(--FC)', fontSize: '.85rem', fontWeight: 700, color: meta.prevChampionId ? 'var(--Y)' : 'var(--MU2)', textTransform: 'uppercase' }}>
                  {meta.prevChampionId ? getMC(meta.prevChampionId)?.nome ?? '—' : '— Nenhum —'}
                </div>
              </div>
              <div>
                <div style={{ fontFamily: 'var(--FC)', fontSize: '.58rem', letterSpacing: '.18em', textTransform: 'uppercase', color: 'var(--MU)', marginBottom: '.2rem' }}>Streak</div>
                <div style={{ fontFamily: 'var(--FD)', fontSize: '1.1rem', color: meta.prevChampWinStreak >= 2 ? 'var(--R)' : 'var(--W)' }}>
                  {meta.prevChampWinStreak}×{meta.prevChampWinStreak >= 2 ? ' 🔥' : ''}
                </div>
              </div>
              <div>
                <div style={{ fontFamily: 'var(--FC)', fontSize: '.58rem', letterSpacing: '.18em', textTransform: 'uppercase', color: 'var(--MU)', marginBottom: '.2rem' }}>Top 3 atuais</div>
                <div style={{ fontFamily: 'var(--FC)', fontSize: '.78rem', color: 'var(--W)', textTransform: 'uppercase', fontWeight: 700 }}>
                  {meta.top3Ids.map(id => getMC(id)?.nome).filter(Boolean).join(' · ') || '—'}
                </div>
              </div>
            </div>
          )}

          {/* SCORING RULES */}
          <details style={{ marginBottom: '1.5rem' }}>
            <summary style={{ fontFamily: 'var(--FC)', fontSize: '.72rem', letterSpacing: '.15em', textTransform: 'uppercase', color: 'var(--MU)', cursor: 'pointer', userSelect: 'none' }}>
              📋 Tabela de Pontuação
            </summary>
            <div style={{ marginTop: '.75rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '.3rem .75rem' }}>
              {[
                ['+3', 'Vencer por 2×0'],
                ['+5', 'Vencer top 3 do ranking'],
                ['+10', 'Ser campeão'],
                ['+5', 'Ser vice-campeão'],
                ['+4', 'Semifinalista'],
                ['+1', 'Bicampeão consecutivo'],
                ['+4', 'Eliminou campeão com streak 2+'],
                ['+1', 'Eliminou o último campeão'],
                ['+2', 'Ganhou 3× de 2-0 na edição (não escalona)'],
                ['-1', 'Último campeão eliminado na 1ª fase'],
              ].map(([pts, desc], i) => (
                <div key={i} style={{ display: 'flex', gap: '.5rem', alignItems: 'baseline' }}>
                  <span style={{ fontFamily: 'var(--FD)', fontSize: '.95rem', color: pts.startsWith('-') ? 'var(--R)' : 'var(--Y)', minWidth: 30 }}>{pts}</span>
                  <span style={{ fontFamily: 'var(--FC)', fontSize: '.72rem', color: 'var(--MU)', letterSpacing: '.03em' }}>{desc}</span>
                </div>
              ))}
            </div>
          </details>

          {/* PARTICIPANTES */}
          <div style={{ marginBottom: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '.75rem' }}>
              <div className="sec-label">Participantes</div>
              <span style={{ fontFamily: 'var(--FC)', fontSize: '.72rem', letterSpacing: '.1em', color: validCount ? 'var(--Y)' : 'var(--MU)' }}>
                {partCount}/{ed.limite} · {validCount ? '✓ pronto' : 'precisa de 8 ou 16'}
              </span>
            </div>
            <div className="grid-1px" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(150px,1fr))' }}>
              {mcs.map(mc => {
                const sel = (ed.participantes ?? []).includes(mc.id)
                return (
                  <label key={mc.id} style={{ background: sel ? 'rgba(171,49,48,.09)' : 'var(--P3)', padding: '.65rem 1rem', display: 'flex', alignItems: 'center', gap: '.7rem', cursor: 'pointer', transition: 'background .15s', border: sel ? '1px solid rgba(171,49,48,.3)' : '1px solid transparent' }}>
                    <input type="checkbox" checked={sel} style={{ accentColor: 'var(--Y)', width: 14, height: 14 }} onChange={e => togglePart(mc.id, e.target.checked)} />
                    <span style={{ fontFamily: 'var(--FC)', fontSize: '.82rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.04em', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{mc.nome}</span>
                    <span style={{ fontFamily: 'var(--FD)', fontSize: '.85rem', color: 'var(--MU)', flexShrink: 0 }}>{mc.pontos}</span>
                  </label>
                )
              })}
            </div>
          </div>

          {/* AÇÕES */}
          <div style={{ display: 'flex', gap: '.75rem', marginBottom: '2rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <button className="btn btn-y btn-sm" disabled={!validCount} onClick={() => setShowSeedModal(true)}>✏️ Bracket Manual</button>
            <button className="btn btn-o btn-sm" disabled={!validCount} onClick={gerarAleatorio}>🎲 Bracket Aleatório</button>
            {ed.bracket && <button className="btn btn-ghost btn-sm" onClick={resetBracket}>⟳ Resetar</button>}
            {ed.bracket && <span style={{ fontFamily: 'var(--FC)', fontSize: '.65rem', color: 'var(--Y)', letterSpacing: '.08em' }}>● REALTIME ATIVO</span>}
          </div>

          {/* BRACKET */}
          {ed.bracket && ed.bracket.phases && ed.bracket.phases.length > 0 && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem', marginBottom: '1rem' }}>
                <div className="sec-label" style={{ marginBottom: 0 }}>Chaveamento</div>
                <span style={{ fontFamily: 'var(--FC)', fontSize: '.6rem', color: 'var(--MU)', letterSpacing: '.05em' }}>Clique em um confronto para registrar os rounds</span>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <div style={{ display: 'flex', gap: '1.5rem', minWidth: 500, alignItems: 'flex-start' }}>
                  {ed.bracket.phases.map(phKey => {
                    const phName = phases.find(p => p.key === phKey)?.name ?? phKey
                    const phMatches = ed.bracket!.matches[phKey] ?? []
                    return (
                      <div key={phKey} style={{ flex: 1, minWidth: 160 }}>
                        <div className="bracket-phase-title">{phName}</div>
                        {phMatches.map((m, i) => {
                          const mc1 = getMC(m.mc1); const mc2 = getMC(m.mc2)
                          const w1 = (m.rounds ?? []).filter(r => r.winner === m.mc1).length
                          const w2 = (m.rounds ?? []).filter(r => r.winner === m.mc2).length
                          const hasWinner = !!m.winner
                          const inProgress = !hasWinner && (m.rounds?.length ?? 0) > 0
                          return (
                            <div key={i} onClick={() => mc1 && mc2 && setActiveMatch({ phKey, idx: i })}
                              style={{ border: `1px solid ${inProgress ? 'rgba(171,49,48,.5)' : hasWinner ? 'rgba(171,49,48,.25)' : 'var(--B)'}`, marginBottom: '1rem', cursor: mc1 && mc2 ? 'pointer' : 'default', background: inProgress ? 'rgba(171,49,48,.04)' : 'transparent', position: 'relative', transition: 'border-color .2s' }}
                              onMouseEnter={e => { if (mc1 && mc2)(e.currentTarget as HTMLDivElement).style.borderColor = 'var(--Y)' }}
                              onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = inProgress ? 'rgba(171,49,48,.5)' : hasWinner ? 'rgba(171,49,48,.25)' : 'var(--B)' }}
                            >
                              {(hasWinner || inProgress) && (
                                <div style={{ position: 'absolute', top: -9, right: 6, background: hasWinner ? 'var(--Y)' : 'var(--P4)', border: `1px solid ${hasWinner ? 'var(--Y)' : 'rgba(171,49,48,.4)'}`, color: hasWinner ? 'var(--MN)' : 'var(--Y)', fontFamily: 'var(--FC)', fontSize: '.52rem', fontWeight: 700, letterSpacing: '.12em', padding: '2px 6px', textTransform: 'uppercase' }}>
                                  {hasWinner ? `${Math.max(w1,w2)}-${Math.min(w1,w2)}` : `R${m.rounds.length}`}
                                </div>
                              )}
                              {([{ mc: mc1, id: m.mc1, wins: w1 }, { mc: mc2, id: m.mc2, wins: w2 }] as const).map(({ mc, id, wins }, row) => {
                                const isW = m.winner === id; const isL = hasWinner && !isW
                                return (
                                  <div key={row} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '.5rem .75rem', background: isW ? 'rgba(171,49,48,.12)' : 'transparent', borderBottom: row === 0 ? '1px solid var(--B)' : 'none', color: isW ? 'var(--Y)' : isL ? 'var(--MU2)' : 'var(--W)', fontFamily: 'var(--FC)', fontSize: '.83rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em' }}>
                                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{mc?.nome ?? 'A definir'}</span>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '.3rem', flexShrink: 0 }}>
                                      {wins > 0 && <span style={{ color: 'var(--Y)', fontSize: '.55rem', letterSpacing: '2px' }}>{'●'.repeat(wins)}</span>}
                                      {isW && <span>🏆</span>}
                                    </span>
                                  </div>
                                )
                              })}
                              {mc1 && mc2 && !hasWinner && <div style={{ textAlign: 'center', padding: '3px', fontFamily: 'var(--FC)', fontSize: '.55rem', color: 'var(--MU2)', letterSpacing: '.1em', borderTop: '1px solid var(--B)' }}>CLIQUE PARA INICIAR</div>}
                            </div>
                          )
                        })}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {champNome && (
            <div style={{ background: 'rgba(171,49,48,.08)', border: '1px solid rgba(171,49,48,.35)', padding: '1.2rem 1.5rem', marginTop: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <span style={{ fontSize: '1.5rem' }}>🏆</span>
              <div>
                <div style={{ fontFamily: 'var(--FC)', fontSize: '.65rem', fontWeight: 700, letterSpacing: '.22em', textTransform: 'uppercase', color: 'var(--Y)' }}>Campeão</div>
                <div style={{ fontFamily: 'var(--FD)', fontSize: '1.8rem', color: 'var(--Y)', lineHeight: 1 }}>{champNome}</div>
              </div>
            </div>
          )}
        </>
      )}

      {showSeedModal && ed && (
        <SeedModal participants={ed.participantes ?? []} getMC={getMC} slotCount={(ed.participantes ?? []).length} onConfirm={confirmManual} onCancel={() => setShowSeedModal(false)} />
      )}
      {activeMatch && activeMatchData && (
        <RoundModal match={activeMatchData} phKey={activeMatch.phKey} matchIdx={activeMatch.idx} phaseName={activePhaseName} getMC={getMC} onClose={() => setActiveMatch(null)} onSave={saveMatch} />
      )}
      {scoreLog.length > 0 && <ScoreLog summaries={scoreLog} onClose={() => setScoreLog([])} />}
    </div>
  )
}
