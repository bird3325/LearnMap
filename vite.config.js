import { defineConfig } from 'vite';
import { resolve } from 'path';
import { fork } from 'child_process';

let serverProcess = null;

function expressBackendPlugin() {
  function startServer() {
    if (serverProcess) {
      try {
        serverProcess.kill();
      } catch (e) {}
      serverProcess = null;
    }
    console.log('[Vite Dev] Express 백엔드 서버(포트 5000)를 구동합니다...');
    try {
      serverProcess = fork(resolve(__dirname, 'server.js'), [], {
        env: { ...process.env, PORT: '5000' }
      });
    } catch (e) {
      console.error('[Vite Dev] Express 백엔드 구동 에러:', e);
    }
  }

  return {
    name: 'express-backend',
    configureServer(server) {
      startServer();
      server.watcher.on('change', (file) => {
        if (file.endsWith('server.js') || file.endsWith('config.json')) {
          console.log('[Vite Dev] server.js 또는 config.json 변경 감지 -> Express 백엔드 재기동');
          startServer();
        }
      });
      process.on('exit', () => {
        if (serverProcess) {
          try { serverProcess.kill(); } catch (e) {}
        }
      });
    }
  };
}

function utf8HeadersPlugin() {
  return {
    name: 'utf8-headers-plugin',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        // /admin 또는 /admin/ 접속 시 admin.js 소스 노출 방지 및 admin.html 페이지로 rewrite
        const cleanUrl = req.url ? req.url.split('?')[0] : '';
        if (cleanUrl === '/admin' || cleanUrl === '/admin/') {
          const query = req.url.includes('?') ? '?' + req.url.split('?')[1] : '';
          req.url = '/admin.html' + query;
        }
        if (cleanUrl === '/business' || cleanUrl === '/business/' || cleanUrl === '/partner' || cleanUrl === '/partner/') {
          const query = req.url.includes('?') ? '?' + req.url.split('?')[1] : '';
          req.url = '/business.html' + query;
        }

        const origSetHeader = res.setHeader;
        res.setHeader = function (name, val) {
          if (typeof name === 'string' && name.toLowerCase() === 'content-type') {
            if (typeof val === 'string' && (val.includes('javascript') || val.includes('html') || val.includes('json')) && !val.includes('charset')) {
              val = `${val}; charset=utf-8`;
            }
          }
          return origSetHeader.call(this, name, val);
        };
        next();
      });
    }
  };
}

export default defineConfig({
  appType: 'mpa',
  plugins: [expressBackendPlugin(), utf8HeadersPlugin()],
  server: {
    port: 3000,
    strictPort: false,
    watch: {
      ignored: [
        '**/src/data/**',
        '**/public/data/**',
        '**/public/src/data/**',
        '**/scratch/**',
        '**/.agents/**',
        '**/.git/**'
      ]
    },
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
        admin: resolve(__dirname, 'admin.html'),
        business: resolve(__dirname, 'business.html')
      }
    }
  }
});

