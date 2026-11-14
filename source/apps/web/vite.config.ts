import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/** The API listens on PORT, or 3000 when PORT is unset or empty (`apps/api/src/server.ts`); the proxy reads the same variable. */
const API_PORT = process.env['PORT']?.trim() || '3000';
const API_TARGET = `http://localhost:${API_PORT}`;

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/analyze': API_TARGET,
    },
  },
});
