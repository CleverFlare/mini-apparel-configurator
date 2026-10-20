import { statSync } from 'node:fs'
import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// Assets whose download progress the loading overlay tracks.
const TRACKED_ASSETS = ['src/assets/sweater.glb', 'src/assets/sweater_mask.png']

// Exposes the tracked assets' byte sizes, keyed by file name, as
// `virtual:asset-sizes`. The loader counts decompressed bytes against these,
// so progress stays exact even when the host compresses responses and drops
// or changes Content-Length.
function assetSizes(files: string[]): Plugin {
  const virtualId = 'virtual:asset-sizes'
  const resolvedId = `\0${virtualId}`

  return {
    name: 'asset-sizes',
    resolveId(id) {
      if (id === virtualId) return resolvedId
    },
    load(id) {
      if (id !== resolvedId) return
      const sizes: Record<string, number> = {}
      for (const file of files) {
        const absolute = path.resolve(import.meta.dirname, file)
        this.addWatchFile(absolute)
        sizes[path.basename(file)] = statSync(absolute).size
      }
      return `export default ${JSON.stringify(sizes)}`
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    assetSizes(TRACKED_ASSETS),
    VitePWA({
      // New versions install in the background and take over without
      // reloading, so an update never interrupts a configuration; the new
      // code runs from the next launch.
      registerType: 'autoUpdate',
      injectRegister: 'script-defer',
      manifest: {
        name: 'Atelier Configurator',
        short_name: 'Atelier',
        description: 'Choose the colors of a sweater in 3D.',
        start_url: '/',
        display: 'standalone',
        // Matches the viewport's backdrop, for the splash screen and the
        // status bar.
        background_color: '#f3f3f3',
        theme_color: '#f3f3f3',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'maskable-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // Precache the whole build, the sweater model included, so the
        // installed app works fully offline.
        globPatterns: ['**/*.{js,css,html,glb,png,svg,ico,woff2}'],
        maximumFileSizeToCacheInBytes: 12 * 1024 * 1024,
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
})
