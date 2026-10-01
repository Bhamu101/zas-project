import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Without this, Vite binds to [::1] only on this machine — so a browser that
  // resolves `localhost` to 127.0.0.1 gets connection refused and the dev
  // server looks dead. `true` binds every interface, which also makes the dev
  // server reachable from a phone on the same WiFi for testing the mobile app.
  server: {
    host: true,
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
})