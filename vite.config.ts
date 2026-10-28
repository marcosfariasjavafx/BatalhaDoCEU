import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

// Endereço público do site, usado nas tags de prévia (Open Graph) e no canonical, que exigem URL absoluta.
// Ordem: SITE_URL (defina na Vercel ao ter domínio próprio) → domínio de produção da Vercel → padrão.
function siteUrl() {
  const env = process.env
  const raw = env.SITE_URL
    || (env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${env.VERCEL_PROJECT_PRODUCTION_URL}` : '')
    || 'https://batalha-do-ceu.vercel.app'
  return raw.replace(/\/+$/, '')
}

const siteUrlPlugin = (): Plugin => ({
  name: 'site-url',
  transformIndexHtml: html => html.replaceAll('__SITE_URL__', siteUrl()),
})

export default defineConfig({
  plugins: [react(), siteUrlPlugin()],
  build: {
    rollupOptions: {
      output: {
        // Bibliotecas em arquivos próprios: cacheadas entre deploys e baixadas em paralelo
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          supabase: ['@supabase/supabase-js'],
        },
      },
    },
  },
})
