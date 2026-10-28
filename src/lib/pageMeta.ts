import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

const SITE = 'Batalha do Céu'

export const DESCRICAO_PADRAO =
  "Batalha de MCs de Hip-Hop e freestyle em Santa Bárbara d'Oeste — SP. Veja edições, ranking dos MCs, calendário de eventos e fotos."

interface PageMeta {
  /** Título da página. Vira "Título — Batalha do Céu" (use `completo` para não acrescentar o nome do site). */
  title: string
  description?: string
  /** URL absoluta da imagem de prévia (banner, foto do MC). */
  image?: string | null
  completo?: boolean
}

/** Corta o texto em `max` caracteres sem quebrar palavra e sem quebras de linha. */
export function resumo(texto: string | null | undefined, max = 155): string {
  const t = (texto ?? '').replace(/\s+/g, ' ').trim()
  if (t.length <= max) return t
  return t.slice(0, max - 1).replace(/\s+\S*$/, '') + '…'
}

function setTag(selector: string, create: () => HTMLElement, attr: string, value: string) {
  let el = document.head.querySelector<HTMLElement>(selector)
  const criado = !el
  if (!el) { el = create(); document.head.appendChild(el) }
  const antes = el.getAttribute(attr)
  el.setAttribute(attr, value)
  return () => { if (criado) el!.remove(); else if (antes !== null) el!.setAttribute(attr, antes) }
}

const meta = (key: 'name' | 'property', name: string) => () => {
  const m = document.createElement('meta'); m.setAttribute(key, name); return m
}

/**
 * Ajusta título, descrição, canonical e prévia (Open Graph/Twitter) da página atual.
 * O Google executa o JavaScript do site e lê esses valores; ao sair da página tudo volta ao padrão.
 */
export function usePageMeta({ title, description, image, completo }: PageMeta) {
  const { pathname } = useLocation()

  useEffect(() => {
    const titulo = completo ? title : `${title} — ${SITE}`
    const desc = resumo(description || DESCRICAO_PADRAO)
    const url = `${window.location.origin}${pathname}`
    const antesTitulo = document.title
    document.title = titulo

    const undo = [
      setTag('meta[name="description"]', meta('name', 'description'), 'content', desc),
      setTag('meta[property="og:title"]', meta('property', 'og:title'), 'content', titulo),
      setTag('meta[property="og:description"]', meta('property', 'og:description'), 'content', desc),
      setTag('meta[property="og:url"]', meta('property', 'og:url'), 'content', url),
      setTag('meta[name="twitter:title"]', meta('name', 'twitter:title'), 'content', titulo),
      setTag('meta[name="twitter:description"]', meta('name', 'twitter:description'), 'content', desc),
      setTag('link[rel="canonical"]', () => { const l = document.createElement('link'); l.rel = 'canonical'; return l }, 'href', url),
    ]
    if (image) {
      undo.push(
        setTag('meta[property="og:image"]', meta('property', 'og:image'), 'content', image),
        setTag('meta[name="twitter:image"]', meta('name', 'twitter:image'), 'content', image),
      )
    }
    return () => { document.title = antesTitulo; undo.forEach(fn => fn()) }
  }, [title, description, image, completo, pathname])
}
