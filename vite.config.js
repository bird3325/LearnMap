import { defineConfig } from 'vite';
import { resolve } from 'path';
import { fork } from 'child_process';

let serverProcess = null;

function expressBackendPlugin() {
  return {
    name: 'express-backend',
    configureServer() {
      if (!serverProcess) {
        console.log('[Vite Dev] Express 백엔드 서버(포트 5000)를 구동합니다...');
        try {
          serverProcess = fork(resolve(__dirname, 'server.js'), [], {
            env: { ...process.env, PORT: '5000' }
          });
          process.on('exit', () => {
            if (serverProcess) serverProcess.kill();
          });
        } catch (e) {
          console.error('[Vite Dev] Express 백엔드 구동 에러:', e);
        }
      }
    }
  };
}

export default defineConfig({
  plugins: [expressBackendPlugin()],
  server: {
    port: 3000,
    strictPort: false,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
        configure: (proxy, _options) => {
          proxy.on('error', (_err, _req, res) => {
            if (!res.headersSent) {
              res.writeHead(404, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'Backend proxy target unreachable', fallback: true }));
            }
          });
        }
      }
    }
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        admin: resolve(__dirname, 'admin.html')
      }
    }
  }
});

