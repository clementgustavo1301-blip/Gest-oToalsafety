import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('jspdf') || id.includes('pdfjs-dist')) return 'pdf-vendor';
          if (id.includes('docx') || id.includes('jszip') || id.includes('read-excel-file')) return 'office-vendor';
          if (id.includes('recharts') || id.includes('leaflet')) return 'charts-map-vendor';
          return undefined;
        },
      },
    },
  },
})
