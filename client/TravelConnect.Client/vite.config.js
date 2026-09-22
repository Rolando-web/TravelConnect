import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            // Cache-friendly vendor splits: each big dependency becomes its
            // own chunk so a bump to one library never invalidates the others.
            if (id.includes('/firebase/') || id.includes('\\firebase\\')) return 'vendor-firebase';
            if (id.includes('/chart.js/') || id.includes('\\chart.js\\')) return 'vendor-charts';
            if (id.includes('/lucide-react/') || id.includes('\\lucide-react\\')) return 'vendor-icons';
            if (id.includes('/@emailjs/') || id.includes('\\@emailjs\\')) return 'vendor-emailjs';
            if (/[\\/](react|react-dom|react-router-dom|scheduler)[\\/]/.test(id)) return 'vendor-react';
            if (id.includes('/@tailwindcss/') || id.includes('\\@tailwindcss\\')) return 'vendor-tailwind';
            return 'vendor-other';
          }
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test-setup.js',
    css: false,
  },
})
