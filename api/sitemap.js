import { siteUrl, consulta } from './_site.js'

const PAGINAS = [
  ['/', '1.0', 'weekly'], ['/sobre', '0.6', 'monthly'], ['/mcs', '0.8', 'weekly'],
  ['/ranking', '0.8', 'weekly'], ['/edicoes', '0.9', 'weekly'], ['/calendario', '0.9', 'daily'],
  ['/galeria', '0.6', 'weekly'], ['/contato', '0.5', 'monthly'],
]

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

// Mapa do site gerado na hora a partir do banco: MCs, edições e eventos novos entram sozinhos.
export default async function handler(req, res) {
  const base = siteUrl(req)
  const [mcs, edicoes, eventos] = await Promise.all([
    consulta('mcs', 'id'), consulta('edicoes', 'id,data'), consulta('eventos', 'id,data'),
  ])
  const urls = [
    ...PAGINAS.map(([p, prio, freq]) => ({ loc: p, prio, freq })),
    ...mcs.map(m => ({ loc: `/mcs/${m.id}`, prio: '0.7', freq: 'weekly' })),
    ...edicoes.map(e => ({ loc: `/edicoes/${e.id}`, prio: '0.8', freq: 'weekly', lastmod: e.data })),
    ...eventos.map(e => ({ loc: `/eventos/${e.id}`, prio: '0.7', freq: 'weekly', lastmod: e.data })),
  ]
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    urls.map(u => `  <url><loc>${esc(base + u.loc)}</loc>${u.lastmod ? `<lastmod>${esc(u.lastmod)}</lastmod>` : ''}<changefreq>${u.freq}</changefreq><priority>${u.prio}</priority></url>`).join('\n') +
    `\n</urlset>\n`
  res.setHeader('Content-Type', 'application/xml; charset=utf-8')
  res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400')
  res.status(200).send(xml)
}
