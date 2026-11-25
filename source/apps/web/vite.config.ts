import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { devProxy } from './dev-proxy.js';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: devProxy(process.env),
  },
});
