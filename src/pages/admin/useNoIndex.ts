import { useEffect } from 'react'

/** Pede aos buscadores (Google etc.) para não indexar as telas do painel. */
export function useNoIndex() {
  useEffect(() => {
    const m = document.createElement('meta')
    m.name = 'robots'
    m.content = 'noindex, nofollow'
    document.head.appendChild(m)
    return () => { m.remove() }
  }, [])
}
