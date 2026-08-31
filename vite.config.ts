import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': new URL('./src', import.meta.url).pathname },
  },
  define: {
    // sockjs-client reference l'objet global de Node.js, absent du
    // navigateur : on le fait pointer vers globalThis, qui existe
    // partout. Sans cette ligne, l'import de @stomp/stompjs echoue
    // au chargement avec "global is not defined".
    global: 'globalThis',
  },
  server: {
    host: 'localhost',
    port: 5000,
    strictPort: true,
  },
});
