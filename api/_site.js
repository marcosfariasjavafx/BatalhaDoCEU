// Utilidades compartilhadas pelas funções de SEO (arquivos com "_" não viram rotas na Vercel).

/** Endereço público do site: SITE_URL > domínio desta requisição. */
export function siteUrl(req) {
  if (process.env.SITE_URL) return process.env.SITE_URL.replace(/\/+$/, '')
  const host = req.headers['x-forwarded-host'] || req.headers.host
  const proto = req.headers['x-forwarded-proto'] || 'https'
  return `${proto}://${host}`
}

/** Consulta a API REST do Supabase com a chave pública (anon), respeitando o RLS. */
export async function consulta(tabela, colunas) {
  const base = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
  const key = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY
  if (!base || !key) return []
  try {
    const r = await fetch(`${base}/rest/v1/${tabela}?select=${colunas}&limit=1000`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    })
    return r.ok ? await r.json() : []
  } catch { return [] }
}
