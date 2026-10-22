// Links oficiais e endereço da Batalha do Céu — altere só aqui e o site inteiro atualiza.

export const YOUTUBE_URL = 'https://www.youtube.com/c/batalhadoceu'
export const INSTAGRAM_URL = 'https://www.instagram.com/batalhaceuarts/'
export const INSTAGRAM_HANDLE = '@batalhaceuarts'
export const WHATSAPP_URL = 'https://api.whatsapp.com/message/EBRZ6JAGGU7ED1?autoload=1&app_absent=0&utm_source=ig'

export const ENDERECO = "R. Argeu Egídio dos Santos, 100 - Planalto do Sol II, Santa Bárbara d'Oeste - SP, 13453-842"
export const ENDERECO_CURTO = "R. Argeu Egídio dos Santos, 100 — Planalto do Sol II"
export const CIDADE = "Santa Bárbara d'Oeste — SP"

const q = encodeURIComponent(ENDERECO)
/** Abre a rota/local no Google Maps */
export const MAPS_URL = `https://www.google.com/maps/search/?api=1&query=${q}`
/** URL para usar dentro de um <iframe> (não exige chave de API) */
export const MAPS_EMBED_URL = `https://maps.google.com/maps?q=${q}&z=16&output=embed`
