import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './',
  build: { outDir: 'dist' },
  // El optimizador de FSRS (fsrs-browser) usa WebAssembly con hilos: sus workers deben ser módulos ES
  // y Vite no debe pre-empaquetarlo (rompería la ruta a su .wasm y a su worker auxiliar).
  worker: { format: 'es' },
  optimizeDeps: { exclude: ['fsrs-browser'] },
});
