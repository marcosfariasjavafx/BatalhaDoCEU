import type { EdicaoStatus } from '../types'

export function fmtData(d: string | null | undefined): string {
  if (!d) return '—'
  try {
    const [y, m, dia] = d.split('-')
    const meses = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
    return `${dia} ${meses[parseInt(m) - 1]} ${y}`
  } catch { return d }
}

export function statusLabel(s: string): string {
  const map: Record<string, string> = { encerrada: 'Encerrada', confirmada: 'Confirmada', 'em-breve': 'Em Breve' }
  return map[s] ?? s
}

export function statusClass(s: string): string {
  const map: Record<string, string> = { encerrada: 's-encerrada', confirmada: 's-confirmada', 'em-breve': 's-embreve' }
  return map[s] ?? ''
}

export function mcAvatarColor(id: string): string {
  const cols = ['#f5c842','#cc4444','#4488cc','#44cc88','#cc44cc','#cc8844','#44cccc','#88cc44']
  let h = 0
  for (const c of (id ?? '')) h = ((h << 5) - h) + c.charCodeAt(0)
  return cols[Math.abs(h) % cols.length]
}

export function mcInitials(nome: string): string {
  return (nome ?? '?').substring(0, 2).toUpperCase()
}

export function getPhasesForN(n: number): { key: string; name: string }[] {
  if (n <= 4)  return [{ key: 'semi', name: 'Semifinal' }, { key: 'final', name: 'Final' }]
  if (n <= 8)  return [{ key: 'fase1', name: 'Fase Inicial' }, { key: 'semi', name: 'Semifinal' }, { key: 'final', name: 'Final' }]
  return [
    { key: 'fase1', name: 'Oitavas de Final' },
    { key: 'quartas', name: 'Quartas de Final' },
    { key: 'semi', name: 'Semifinal' },
    { key: 'final', name: 'Final' },
  ]
}

export async function uploadFile(file: File, bucket: string): Promise<string> {
  const { supabase } = await import('./supabase')
  const ext = file.name.split('.').pop() ?? 'jpg'
  const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
  const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: true })
  if (error) throw new Error(error.message)
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl
}

export async function compressImage(file: File, maxW = 900, quality = 0.75): Promise<File> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        const ratio = Math.min(maxW / img.width, maxW / img.height, 1)
        const canvas = document.createElement('canvas')
        canvas.width = Math.round(img.width * ratio)
        canvas.height = Math.round(img.height * ratio)
        canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
        // WebP: mesma qualidade visual com ~30% menos bytes. Navegadores sem suporte
        // devolvem outro formato no toBlob; nesse caso usamos JPEG.
        const done = (blob: Blob | null) => {
          if (!blob) return reject(new Error('Falha'))
          const base = file.name.replace(/\.[^.]+$/, '')
          const ext = blob.type === 'image/webp' ? 'webp' : 'jpg'
          resolve(new File([blob], `${base}.${ext}`, { type: blob.type === 'image/webp' ? 'image/webp' : 'image/jpeg' }))
        }
        canvas.toBlob(blob => {
          if (blob && blob.type === 'image/webp') done(blob)
          else canvas.toBlob(done, 'image/jpeg', quality)
        }, 'image/webp', Math.min(quality + 0.05, 0.9))
      }
      img.src = e.target?.result as string
    }
    reader.readAsDataURL(file)
  })
}
