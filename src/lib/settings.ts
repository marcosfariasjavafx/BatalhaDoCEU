import { supabase } from './supabase'

const KEY_PONTUACAO_AUTO = 'pontuacao_automatica'

/**
 * Lê se a pontuação automática está ligada.
 * Se a configuração não existir ou a leitura falhar, assume LIGADA
 * (comportamento original do sistema).
 */
export async function getAutoScoring(): Promise<boolean> {
  const { data, error } = await supabase
    .from('configuracoes')
    .select('valor')
    .eq('chave', KEY_PONTUACAO_AUTO)
    .maybeSingle()

  if (error || !data) return true
  return (data.valor as { ativo?: boolean } | null)?.ativo !== false
}

/** Liga/desliga a pontuação automática. Retorna true se salvou com sucesso. */
export async function setAutoScoring(ativo: boolean): Promise<boolean> {
  const { error } = await supabase
    .from('configuracoes')
    .upsert({ chave: KEY_PONTUACAO_AUTO, valor: { ativo }, updated_at: new Date().toISOString() })
  return !error
}
