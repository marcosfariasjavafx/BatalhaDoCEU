import { useEffect, useState } from 'react'
import { getAutoScoring, setAutoScoring } from '../../lib/settings'
import { useToast } from '../../hooks/useToast'

export default function AdminPontuacao() {
  const { show: toast } = useToast()
  const [ativo, setAtivo] = useState<boolean | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => { getAutoScoring().then(setAtivo) }, [])

  async function alternar() {
    if (ativo === null || saving) return
    const novo = !ativo
    setSaving(true)
    const ok = await setAutoScoring(novo)
    setSaving(false)
    if (!ok) { toast('Não foi possível salvar. Verifique se você está logado.', true); return }
    setAtivo(novo)
    toast(novo ? 'Pontuação automática ativada' : 'Pontuação automática desativada')
  }

  return (
    <div>
      <div className="admin-panel-title">Pontuação</div>

      <div className="setting-card">
        <div className="setting-info">
          <div className="setting-title">Cálculo automático de pontuação</div>
          <p className="setting-desc">
            Quando <strong>ligado</strong>, o ranking é atualizado sozinho conforme você registra os
            resultados no Bracket (vitórias 2×0, top 3, semifinalistas, campeão, vice etc.).
          </p>
          <p className="setting-desc">
            Quando <strong>desligado</strong>, os resultados do Bracket continuam sendo registrados e o
            campeão é definido normalmente, mas <strong>nenhum ponto é somado ou removido</strong> dos MCs.
            Você pode ajustar os pontos manualmente na aba MCs.
          </p>
          <p className="setting-desc setting-note">
            Partidas e fases concluídas com o cálculo desligado são consideradas “já tratadas”: ligar
            de novo não gera pontos retroativos. Vale apenas para as próximas partidas.
          </p>
        </div>

        <div className="setting-control">
          <button
            type="button"
            role="switch"
            aria-checked={ativo === true}
            aria-label="Pontuação automática"
            className={`switch${ativo ? ' on' : ''}`}
            onClick={alternar}
            disabled={ativo === null || saving}
          >
            <span className="switch-knob" />
          </button>
          <div className={`setting-status ${ativo ? 'on' : 'off'}`}>
            {ativo === null ? 'Carregando…' : ativo ? 'Ativada' : 'Desativada'}
          </div>
        </div>
      </div>
    </div>
  )
}
