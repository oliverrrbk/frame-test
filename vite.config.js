import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        // Del kun de biblioteker i faste vendor-bidder, som RENT FAKTISK bruges tidligt
        // (react-runtime + supabase + framer-motion til rute-overgange). De tunge,
        // rute-specifikke libs (grafer, PDF, kort) grupperes bevidst IKKE: manuel
        // gruppering tvinger hele biblioteket ind i én chunk, så entry — der kun bruger
        // et enkelt lille symbol derfra — trækker hele klumpen (~1 MB) ned på login.
        // Lader vi rolldown splitte dem selv, tree-shakes de og havner i de lazy
        // dashboard-chunks, hvor de først hentes når man faktisk bruger dem.
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          if (id.includes('react-router')) return 'vendor-react';
          if (id.includes('/react-dom/') || id.includes('/react/') || id.includes('/scheduler/')) return 'vendor-react';
          if (id.includes('@supabase')) return 'vendor-supabase';
          if (id.includes('framer-motion')) return 'vendor-motion';
        },
      },
    },
  },
})
