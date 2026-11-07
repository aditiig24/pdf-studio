import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'PDF Studio',
        short_name: 'PDF Studio',
        description: 'Your all-in-one PDF editor',
        theme_color: '#e53935',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/',
        icons: [
  {
    src: '/pdf-studio-icon.svg',
    sizes: 'any',
    type: 'image/svg+xml',
    purpose: 'any'
  }
]
      }
    })
  ]
});