import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const proxyTarget =
    env.VITE_DEV_PROXY_TARGET || 'https://bedev.rentyourride.ca';

  return {
    plugins: [react()],
    server: {
      host: true, // 0.0.0.0 — needed for Cloudflare/ngrok tunnels
      port: 5174,
      // Allow trycloudflare.com / localtunnel preview hosts
      allowedHosts: true,
      proxy: {
        // When VITE_API_ORIGIN is unset, browser calls `/api/v1/...`
        '/api': {
          target: proxyTarget,
          changeOrigin: true,
          secure: true,
          rewrite: (p) => p.replace(/^\/api/, ''),
        },
      },
    },
  };
});
