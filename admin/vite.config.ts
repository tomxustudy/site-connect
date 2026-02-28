import react from 'vite-plugin-react'
import { defineConfig } from 'vite'

const config = defineConfig({
  plugins: [react()],
  server: {
    port: 5173
  }
})

export default config
