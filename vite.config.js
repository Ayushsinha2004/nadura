import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// Nadura Lead & Sales System dashboard — Mode A (direct keys). The clinic's live
// data lives in its own V2 Supabase (project utczdtqqawncwuwnfzig). All requests
// go through this proxy, which injects the service key server-side so it is NEVER
// present in the browser bundle. (Before client exposure: swap to RLS + a
// per-solution anon key, or a dedicated read role — see .env.example.)
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  const stripBrowserHeaders = (proxyReq) => {
    ;['origin', 'referer', 'sec-fetch-site', 'sec-fetch-mode', 'sec-fetch-dest',
      'sec-ch-ua', 'sec-ch-ua-mobile', 'sec-ch-ua-platform', 'user-agent']
      .forEach((h) => proxyReq.removeHeader(h))
  }

  return {
    plugins: [react()],
    server: {
      proxy: {
        // Nadura V2 client Supabase (PostgREST) — live source of truth.
        '/nadura': {
          target: env.VITE_NADURA_SUPABASE_URL,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/nadura/, ''),
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq) => {
              stripBrowserHeaders(proxyReq)
              proxyReq.setHeader('apikey', env.VITE_NADURA_SERVICE_KEY)
              proxyReq.setHeader('Authorization', `Bearer ${env.VITE_NADURA_SERVICE_KEY}`)
            })
          },
        },
      },
    },
  }
})
