import { statSync } from 'node:fs'
import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'

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
  plugins: [react(), tailwindcss(), assetSizes(TRACKED_ASSETS)],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
})
