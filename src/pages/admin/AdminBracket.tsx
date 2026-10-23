import { useEffect, useState, useCallback, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { getAutoScoring } from '../../lib/settings'
import { getPhasesForN } from '../../lib/utils'
import { useToast } from '../../hooks/useToast'
import {
  fetchBracketMeta, calcMatchDeltas, calcSweepBonusDeltas,
  calcPhaseCompletionDeltas, applyDeltas, type DeltaSummary, type ScoringCtx,
} from '../../lib/scoring'
import {
  ehEquipe, formatoLabel, tamanhoFormato, nomeAutomatico, membrosDe, nomeCompetidor,
  equipeCampea, sortearEquipes, novoIdEquipe, equipesAtualizadas,
  TIMES_VALIDOS_EQUIPE, PARTICIPANTES_VALIDOS_SOLO,
} from '../../lib/equipes'
import type { Edicao, Equipe, MC, BracketData, BracketMatch, BracketMeta } from '../../types'

/** Qualquer competidor do bracket: um MC (individual) ou uma equipe (dupla/trio) */
type Named = { nome: string }
type GetCompetitor = (id: string | null) => Named | undefined

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
  getMC: GetCompetitor
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
  participants: string[]; getMC: GetCompetitor
  slotCount: number; onConfirm: (slots: string[]) => void; onCancel: () => void
  /** 'MC' (individual) ou 'Equipe' (dupla/trio) — só muda os textos */
  entity?: 'MC' | 'Equipe'
}

function SeedModal({ participants, getMC, slotCount, onConfirm, onCancel, entity = 'MC' }: SeedModalProps) {
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
                        <option value="">— Selecionar {entity} —</option>
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

// ─── Teams Modal (dupla / trio) ───────────────────────────────────────────────

interface TeamsModalProps {
  tamanho: number                 // 2 = dupla, 3 = trio
  formatoNome: string             // "Dupla" | "Trio"
  participantIds: string[]        // MCs marcados na edição
  mcs: MC[]
  initial: Equipe[]
  onConfirm: (equipes: Equipe[]) => void
  onCancel: () => void
}

function TeamsModal({ tamanho, formatoNome, participantIds, mcs, initial, onConfirm, onCancel }: TeamsModalProps) {
  const nTeams = Math.floor(participantIds.length / tamanho)
  const divisivel = participantIds.length % tamanho === 0
  const quantidadeOk = divisivel && TIMES_VALIDOS_EQUIPE.includes(nTeams)

  const aproveitar = equipesAtualizadas(initial, participantIds, tamanho)
  const [groups, setGroups] = useState<string[][]>(() =>
    aproveitar ? initial.map(e => [...e.membros]) : Array.from({ length: nTeams }, () => Array(tamanho).fill('')))
  const [names, setNames] = useState<string[]>(() =>
    aproveitar ? initial.map(e => e.nome) : Array(nTeams).fill(''))

  const nomeMC = (id: string) => mcs.find(m => m.id === id)?.nome ?? '?'
  const used = groups.flat().filter(Boolean)
  const available = participantIds.filter(id => !used.includes(id))
  const allFilled = groups.length === nTeams && groups.every(g => g.length === tamanho && g.every(Boolean))

  function setMember(ti: number, si: number, mcId: string) {
    setGroups(groups.map((g, i) => (i === ti ? g.map((v, j) => (j === si ? mcId : v)) : g)))
  }

  function sortear() {
    setGroups(sortearEquipes(participantIds, tamanho))
    setNames(Array(nTeams).fill(''))
  }

  function confirmar() {
    const equipes: Equipe[] = groups.map((membros, i) => ({
      id: novoIdEquipe(),
      nome: names[i]?.trim() || nomeAutomatico(membros, mcs),
      membros,
    }))
    onConfirm(equipes)
  }

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-box" style={{ maxWidth: 680 }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem' }}>
          <div>
            <div style={{ fontFamily: 'var(--FC)', fontSize: '.65rem', letterSpacing: '.2em', textTransform: 'uppercase', color: 'var(--Y)', marginBottom: '.2rem' }}>Batalha de {formatoNome}</div>
            <div style={{ fontFamily: 'var(--FD)', fontSize: '1.4rem', color: 'var(--W)' }}>Montar Equipes</div>
          </div>
          <button className="modal-close" onClick={onCancel}>✕</button>
        </div>

        {!quantidadeOk ? (
          <div style={{ fontFamily: 'var(--FC)', fontSize: '.85rem', color: 'var(--R)', lineHeight: 1.6, padding: '.75rem 1rem', border: '1px solid rgba(224,80,80,.4)', background: 'rgba(224,80,80,.08)', marginBottom: '1.2rem' }}>
            Há {participantIds.length} MCs marcados. Em {formatoNome.toLowerCase()} são necessários{' '}
            {TIMES_VALIDOS_EQUIPE.map(n => n * tamanho).join(', ')} MCs ({TIMES_VALIDOS_EQUIPE.join(', ')} equipes).
            Ajuste os participantes e abra de novo.
          </div>
        ) : (
          <>
            <p style={{ fontFamily: 'var(--FC)', fontSize: '.78rem', color: 'var(--MU)', marginBottom: '1.2rem', lineHeight: 1.6 }}>
              {nTeams} equipes de {tamanho} MCs. O nome é opcional — sem nome, usamos os integrantes (ex.: “{nomeAutomatico(participantIds.slice(0, tamanho), mcs)}”).
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '.6rem', maxHeight: '55vh', overflowY: 'auto', marginBottom: '1.2rem', paddingRight: 2 }}>
              {groups.map((g, ti) => (
                <div key={ti} style={{ border: `1px solid ${g.every(Boolean) ? 'rgba(171,49,48,.3)' : 'var(--B)'}`, background: 'var(--P4)', padding: '.6rem .75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', marginBottom: '.5rem' }}>
                    <span style={{ fontFamily: 'var(--FC)', fontSize: '.7rem', fontWeight: 700, color: 'var(--Y)', letterSpacing: '.1em', textTransform: 'uppercase', flexShrink: 0 }}>Equipe {ti + 1}</span>
                    <input
                      className="form-input"
                      style={{ padding: '4px 8px', fontSize: '.8rem' }}
                      placeholder={g.every(Boolean) ? nomeAutomatico(g, mcs) : 'Nome da equipe (opcional)'}
                      value={names[ti] ?? ''}
                      onChange={e => setNames(names.map((n, i) => (i === ti ? e.target.value : n)))}
                    />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fit, minmax(150px, 1fr))`, gap: '.4rem' }}>
                    {g.map((mcId, si) => (
                      <select key={si} value={mcId} onChange={e => setMember(ti, si, e.target.value)}
                        style={{ background: mcId ? 'rgba(171,49,48,.1)' : 'var(--P3)', border: `1px solid ${mcId ? 'rgba(171,49,48,.4)' : 'var(--B)'}`, color: mcId ? 'var(--W)' : 'var(--MU2)', padding: '.35rem .5rem', fontFamily: 'var(--FC)', fontSize: '.8rem', fontWeight: mcId ? 700 : 400, textTransform: mcId ? 'uppercase' : 'none' }}>
                        <option value="">— MC {si + 1} —</option>
                        {mcId && <option value={mcId}>{nomeMC(mcId)}</option>}
                        {available.map(id => <option key={id} value={id}>{nomeMC(id)}</option>)}
                      </select>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        <div style={{ display: 'flex', gap: '.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <button className="btn btn-y btn-sm" onClick={confirmar} disabled={!quantidadeOk || !allFilled}>✓ Confirmar Equipes</button>
          <button className="btn btn-ghost btn-sm" onClick={sortear} disabled={!quantidadeOk}>🎲 Sortear Equipes</button>
          <button className="btn btn-ghost btn-sm" onClick={onCancel}>Cancelar</button>
          {quantidadeOk && !allFilled && <span style={{ fontFamily: 'var(--FC)', fontSize: '.68rem', color: 'var(--R)' }}>Preencha todos os integrantes.</span>}
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
  const [activeMatch, setActiveMatch] = useState<{ phKey: string; idx: number } | null>(null)
  const [showSeedModal, setShowSeedModal] = useState(false)
  const [showTeamsModal, setShowTeamsModal] = useState(false)
  const [scoreLog, setScoreLog] = useState<DeltaSummary[]>([])
  const [autoScoring, setAutoScoringState] = useState(true)

  useEffect(() => { getAutoScoring().then(setAutoScoringState) }, [])

  const getMC = useCallback((id: string | null) => mcs.find(m => m.id === id), [mcs])

  // Formato da edição: no bracket os competidores são MCs (solo) ou equipes (dupla/trio)
  const formato = ed?.formato ?? 'solo'
  const isTeam = ehEquipe(formato)
  const tamanho = tamanhoFormato(formato)
  const equipes: Equipe[] = ed?.equipes ?? []

  /** Nome/objeto de um competidor do bracket (equipe ou MC) — usado nos modais e no bracket */
  const getComp = useCallback<GetCompetitor>(
    (id) => { const nome = nomeCompetidor(id, equipes, mcs); return nome ? { nome } : undefined },
    [equipes, mcs]
  )

  /** Nome do campeão: MC (solo) ou equipe vencedora da final (dupla/trio) */
  const champNome = useMemo(() => {
    if (!ed) return null
    if (ed.campeao_id) return mcs.find(m => m.id === ed.campeao_id)?.nome ?? null
    return equipeCampea(ed)?.nome ?? null
  }, [ed, mcs])

  useEffect(() => {
    Promise.all([
      supabase.from('edicoes').select('*').order('data', { ascending: false }),
      supabase.from('mcs').select('*').order('nome'),
    ]).then(([edsR, mcsR]) => { setEdicoes(edsR.data ?? []); setMCs(mcsR.data ?? []) })
  }, [])

  useEffect(() => {
    if (!selEdId) return
    supabase.from('edicoes').select('*').eq('id', selEdId).single().then(({ data }) => { setEd(data) })
    const ch = supabase.channel(`bracket-${selEdId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'edicoes', filter: `id=eq.${selEdId}` }, payload => {
        setEd(payload.new as Edicao)
      }).subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [selEdId])

  // Quem entra no bracket: os MCs participantes (solo) ou as equipes montadas (dupla/trio)
  const competitorIds = isTeam ? equipes.map(e => e.id) : (ed?.participantes ?? [])
  const partCount = (ed?.participantes ?? []).length
  const equipesOk = isTeam && equipesAtualizadas(equipes, ed?.participantes, tamanho)
  const validCount = isTeam
    ? equipesOk && TIMES_VALIDOS_EQUIPE.includes(equipes.length)
    : PARTICIPANTES_VALIDOS_SOLO.includes(partCount)

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
    const meta = await fetchBracketMeta(ed!.id, formato)
    return { phases: phases.map(p => p.key), matches, meta }
  }

  async function confirmManual(slots: string[]) {
    if (!ed) return
    if (ed.bracket && !confirm('Isso apagará o bracket atual. Continuar?')) return
    const bracket = await buildBracket(slots)
    await supabase.from('edicoes').update({ bracket, campeao_id: null, campeoes: [], status: 'confirmada' }).eq('id', ed.id)
    setEd({ ...ed, bracket, campeao_id: null, campeoes: [] }); setShowSeedModal(false)
    toast('Chaveamento manual criado!')
  }

  async function gerarAleatorio() {
    if (!ed) return
    if (!validCount) {
      toast(isTeam
        ? 'Monte as equipes antes de gerar o chaveamento'
        : `Selecione 8 ou 16 participantes (atual: ${partCount})`, true)
      return
    }
    if (ed.bracket && !confirm('Isso apagará o bracket atual. Continuar?')) return
    const bracket = await buildBracket([...competitorIds].sort(() => Math.random() - .5))
    await supabase.from('edicoes').update({ bracket, campeao_id: null, campeoes: [], status: 'confirmada' }).eq('id', ed.id)
    setEd({ ...ed, bracket, campeao_id: null, campeoes: [] })
    toast('Chaveamento aleatório gerado!')
  }

  async function resetBracket() {
    if (!ed || !confirm('Resetar o bracket?')) return
    await supabase.from('edicoes').update({ bracket: null, campeao_id: null, campeoes: [] }).eq('id', ed.id)
    setEd({ ...ed, bracket: null, campeao_id: null, campeoes: [] })
    toast('Bracket resetado.')
  }

  async function confirmTeams(novas: Equipe[]) {
    if (!ed) return
    if (ed.bracket && !confirm('Refazer as equipes apagará o bracket atual. Continuar?')) return
    const { error } = await supabase.from('edicoes')
      .update({ equipes: novas, bracket: null, campeao_id: null, campeoes: [] }).eq('id', ed.id)
    if (error) { toast('Erro ao salvar as equipes', true); return }
    setEd({ ...ed, equipes: novas, bracket: null, campeao_id: null, campeoes: [] })
    setShowTeamsModal(false)
    toast(`${novas.length} equipes salvas!`)
  }

  async function saveMatch(phKey: string, matchIdx: number, updatedMatch: BracketMatch) {
    if (!ed?.bracket) return

    const bracket: BracketData = JSON.parse(JSON.stringify(ed.bracket))
    const prevMatch = bracket.matches[phKey][matchIdx]
    bracket.matches[phKey][matchIdx] = updatedMatch

    const allDeltas: import('../../lib/scoring').PointDelta[] = []
    let metaUpdates: Partial<BracketMeta> = {}

    // Em dupla/trio os pontos de uma equipe vão para cada integrante
    const ctx: ScoringCtx = { membersOf: (id: string) => membrosDe(ed.equipes, id) }

    // Lê o interruptor direto do banco (não do estado) para refletir mudanças feitas em outra aba/dispositivo
    const autoOn = await getAutoScoring()
    setAutoScoringState(autoOn)

    // 1. Per-match points (only when winner is set for the first time)
    if (!prevMatch.pointsApplied && updatedMatch.winner) {
      if (autoOn) {
        const { deltas: md, metaUpdates: mmu } = calcMatchDeltas(bracket, phKey, updatedMatch, ctx)
        allDeltas.push(...md)
        Object.assign(metaUpdates, mmu)
        if (bracket.meta) Object.assign(bracket.meta, mmu)

        // 2. Sweep bonus (3x 2-0)
        const { deltas: sd, metaUpdates: smu } = calcSweepBonusDeltas(bracket, updatedMatch.winner, ctx)
        allDeltas.push(...sd)
        Object.assign(metaUpdates, smu)
        if (bracket.meta) Object.assign(bracket.meta, smu)
      } else {
        toast('Pontuação automática desativada — nenhum ponto foi aplicado')
      }
      // Marca como tratada mesmo com o cálculo desligado: ligar depois não gera pontos retroativos
      bracket.matches[phKey][matchIdx].pointsApplied = true
    }

    const phaseKeys = bracket.phases
    const phIdx = phaseKeys.indexOf(phKey)
    const allPhaseMatches = bracket.matches[phKey]
    const phaseComplete = allPhaseMatches.every(m => !!m.winner)

    let campeao_id = ed.campeao_id
    let campeoes = ed.campeoes ?? []
    let champCompId: string | null = null // id do competidor campeão (MC ou equipe)
    let status = ed.status

    if (phaseComplete) {
      // 3. Phase completion points (semi, final)
      const { deltas: phD, metaUpdates: phMu } = calcPhaseCompletionDeltas(bracket, phKey, ctx)
      if (autoOn) {
        allDeltas.push(...phD)
        Object.assign(metaUpdates, phMu)
        if (bracket.meta) Object.assign(bracket.meta, phMu)
      } else if (bracket.meta) {
        // Desligado: não pontua, mas marca semi/final como tratadas para não pontuar retroativamente
        if (phMu.semiPointsApplied) bracket.meta.semiPointsApplied = true
        if (phMu.finalPointsApplied) bracket.meta.finalPointsApplied = true
      }

      const winners = allPhaseMatches.map(m => m.winner!)
      const isLast = phIdx === phaseKeys.length - 1

      if (isLast || winners.length === 1) {
        // CHAMPION
        champCompId = winners[0]
        status = 'encerrada'
        const champMembers = membrosDe(ed.equipes, champCompId)
        if (isTeam) {
          // campeao_id é uma FK para um único MC; em equipe, os campeões ficam em `campeoes`
          campeao_id = null
          campeoes = champMembers
        } else {
          campeao_id = champCompId
        }
        // Cada integrante da equipe campeã ganha +1 título
        for (const mcId of champMembers) {
          const champMC = getMC(mcId)
          if (champMC) await supabase.from('mcs').update({ titulos: (champMC.titulos ?? 0) + 1 }).eq('id', mcId)
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

    if (champNome === null && champCompId) {
      const champName = getComp(champCompId)?.nome ?? null
      if (champName) toast(`🏆 Campeão: ${champName}`)
    }

    await supabase.from('edicoes').update({ bracket, campeao_id, campeoes, status }).eq('id', ed.id)
    setEd({ ...ed, bracket, campeao_id, campeoes, status })
  }

  const phases = ed ? getPhasesForN(competitorIds.length || 8) : []
  const activeMatchData = activeMatch && ed?.bracket ? ed.bracket.matches[activeMatch.phKey]?.[activeMatch.idx] : null
  const activePhaseName = activeMatch ? phases.find(p => p.key === activeMatch.phKey)?.name ?? activeMatch.phKey : ''

  // Show scoring rules info panel
  const meta = ed?.bracket?.meta as BracketMeta | undefined

  return (
    <div>
      <div className="admin-panel-title">Bracket / Chaveamento</div>

      {!autoScoring && (
        <div className="auto-off-banner">
          <span>⚠ Pontuação automática desativada — os resultados não somam pontos no ranking.</span>
          <Link to="/admin/pontuacao" className="btn btn-o btn-sm">Ativar</Link>
        </div>
      )}

      <div className="form-group" style={{ maxWidth: 360, marginBottom: '2rem' }}>
        <label className="form-label">Edição</label>
        <select className="form-select" value={selEdId} onChange={e => { setSelEdId(e.target.value); setEd(null) }}>
          <option value="">Selecione uma edição...</option>
          {edicoes.map(e => <option key={e.id} value={e.id}>{e.titulo}{ehEquipe(e.formato) ? ` · ${formatoLabel(e.formato)}` : ''}</option>)}
        </select>
      </div>

      {ed && (
        <>
          {isTeam && (
            <div style={{ background: 'rgba(171,49,48,.08)', border: '1px solid rgba(171,49,48,.3)', padding: '.6rem 1rem', marginBottom: '1.5rem', fontFamily: 'var(--FC)', fontSize: '.8rem', color: 'var(--W2)', lineHeight: 1.6 }}>
              <strong style={{ color: 'var(--Y)', letterSpacing: '.08em', textTransform: 'uppercase' }}>Batalha de {formatoLabel(formato)}</strong>
              {' '}— cada integrante da equipe recebe os pontos completos de cada regra. As regras de “campeão anterior” (eliminar o último campeão, streak, bicampeão) só valem no formato individual.
            </div>
          )}

          {/* SCORING CONTEXT INFO */}
          {meta && !isTeam && (
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
                ['+3', 'Vencer por 2×0', false],
                ['+5', isTeam ? 'Vencer equipe com alguém do top 3' : 'Vencer top 3 do ranking', false],
                ['+10', 'Ser campeão', false],
                ['+5', 'Ser vice-campeão', false],
                ['+4', 'Semifinalista', false],
                ['+1', 'Bicampeão consecutivo', true],
                ['+4', 'Eliminou campeão com streak 2+', true],
                ['+1', 'Eliminou o último campeão', true],
                ['+2', 'Ganhou 3× de 2-0 na edição (não escalona)', false],
                ['-1', 'Último campeão eliminado na 1ª fase', true],
              ].map(([pts, desc, soIndividual], i) => (
                <div key={i} style={{ display: 'flex', gap: '.5rem', alignItems: 'baseline', opacity: isTeam && soIndividual ? .4 : 1 }}>
                  <span style={{ fontFamily: 'var(--FD)', fontSize: '.95rem', color: String(pts).startsWith('-') ? 'var(--R)' : 'var(--Y)', minWidth: 30 }}>{pts}</span>
                  <span style={{ fontFamily: 'var(--FC)', fontSize: '.72rem', color: 'var(--MU)', letterSpacing: '.03em' }}>{desc}{isTeam && soIndividual ? ' (só individual)' : ''}</span>
                </div>
              ))}
            </div>
          </details>

          {/* PARTICIPANTES */}
          <div style={{ marginBottom: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '.75rem' }}>
              <div className="sec-label">Participantes</div>
              <span style={{ fontFamily: 'var(--FC)', fontSize: '.72rem', letterSpacing: '.1em', color: validCount ? 'var(--Y)' : 'var(--MU)' }}>
                {isTeam
                  ? `${partCount} MCs · ${equipes.length} equipes · ${validCount
                      ? '✓ pronto'
                      : equipes.length === 0 ? 'monte as equipes'
                      : !equipesOk ? 'equipes desatualizadas — refaça'
                      : `precisa de ${TIMES_VALIDOS_EQUIPE.join(', ')} equipes`}`
                  : `${partCount}/${ed.limite} · ${validCount ? '✓ pronto' : 'precisa de 8 ou 16'}`}
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

          {/* EQUIPES (dupla / trio) */}
          {isTeam && equipes.length > 0 && (
            <div style={{ marginBottom: '2rem' }}>
              <div className="sec-label" style={{ marginBottom: '.75rem' }}>Equipes</div>
              <div className="grid-1px" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))' }}>
                {equipes.map((eq, i) => (
                  <div key={eq.id} style={{ background: 'var(--P3)', padding: '.65rem 1rem' }}>
                    <div style={{ fontFamily: 'var(--FC)', fontSize: '.58rem', fontWeight: 700, letterSpacing: '.18em', textTransform: 'uppercase', color: 'var(--Y)', marginBottom: '.15rem' }}>Equipe {i + 1}</div>
                    <div style={{ fontFamily: 'var(--FC)', fontSize: '.88rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.04em', overflowWrap: 'anywhere' }}>{eq.nome}</div>
                    <div style={{ fontFamily: 'var(--FC)', fontSize: '.7rem', color: 'var(--MU)', marginTop: '.1rem' }}>{eq.membros.map(id => getMC(id)?.nome ?? '?').join(' · ')}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* AÇÕES */}
          <div style={{ display: 'flex', gap: '.75rem', marginBottom: '2rem', flexWrap: 'wrap', alignItems: 'center' }}>
            {isTeam && (
              <button className="btn btn-y btn-sm" onClick={() => setShowTeamsModal(true)}>
                👥 {equipes.length ? 'Refazer Equipes' : 'Montar Equipes'}
              </button>
            )}
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
                          const mc1 = getComp(m.mc1); const mc2 = getComp(m.mc2)
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
        <SeedModal participants={competitorIds} getMC={getComp} slotCount={competitorIds.length} entity={isTeam ? 'Equipe' : 'MC'} onConfirm={confirmManual} onCancel={() => setShowSeedModal(false)} />
      )}
      {showTeamsModal && ed && isTeam && (
        <TeamsModal tamanho={tamanho} formatoNome={formatoLabel(formato)} participantIds={ed.participantes ?? []} mcs={mcs} initial={equipes} onConfirm={confirmTeams} onCancel={() => setShowTeamsModal(false)} />
      )}
      {activeMatch && activeMatchData && (
        <RoundModal match={activeMatchData} phKey={activeMatch.phKey} matchIdx={activeMatch.idx} phaseName={activePhaseName} getMC={getComp} onClose={() => setActiveMatch(null)} onSave={saveMatch} />
      )}
      {scoreLog.length > 0 && <ScoreLog summaries={scoreLog} onClose={() => setScoreLog([])} />}
    </div>
  )
}
