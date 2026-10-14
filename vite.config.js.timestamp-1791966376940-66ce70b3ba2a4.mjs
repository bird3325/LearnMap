// vite.config.js
import { defineConfig } from "file:///D:/100%20shop/LearnMap/node_modules/vite/dist/node/index.js";
import { resolve } from "path";
import { fork } from "child_process";
var __vite_injected_original_dirname = "D:\\100 shop\\LearnMap";
var serverProcess = null;
function expressBackendPlugin() {
  function startServer() {
    if (serverProcess) {
      try {
        serverProcess.kill();
      } catch (e) {
      }
      serverProcess = null;
    }
    console.log("[Vite Dev] Express \uBC31\uC5D4\uB4DC \uC11C\uBC84(\uD3EC\uD2B8 5000)\uB97C \uAD6C\uB3D9\uD569\uB2C8\uB2E4...");
    try {
      serverProcess = fork(resolve(__vite_injected_original_dirname, "server.js"), [], {
        env: { ...process.env, PORT: "5000" }
      });
    } catch (e) {
      console.error("[Vite Dev] Express \uBC31\uC5D4\uB4DC \uAD6C\uB3D9 \uC5D0\uB7EC:", e);
    }
  }
  return {
    name: "express-backend",
    configureServer(server) {
      startServer();
      server.watcher.on("change", (file) => {
        if (file.endsWith("server.js") || file.endsWith("config.json")) {
          console.log("[Vite Dev] server.js \uB610\uB294 config.json \uBCC0\uACBD \uAC10\uC9C0 -> Express \uBC31\uC5D4\uB4DC \uC7AC\uAE30\uB3D9");
          startServer();
        }
      });
      process.on("exit", () => {
        if (serverProcess) {
          try {
            serverProcess.kill();
          } catch (e) {
          }
        }
      });
    }
  };
}
function utf8HeadersPlugin() {
  return {
    name: "utf8-headers-plugin",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const cleanUrl = req.url ? req.url.split("?")[0] : "";
        if (cleanUrl === "/admin" || cleanUrl === "/admin/") {
          const query = req.url.includes("?") ? "?" + req.url.split("?")[1] : "";
          req.url = "/admin.html" + query;
        }
        const origSetHeader = res.setHeader;
        res.setHeader = function(name, val) {
          if (typeof name === "string" && name.toLowerCase() === "content-type") {
            if (typeof val === "string" && (val.includes("javascript") || val.includes("html") || val.includes("json")) && !val.includes("charset")) {
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
var vite_config_default = defineConfig({
  appType: "mpa",
  plugins: [expressBackendPlugin(), utf8HeadersPlugin()],
  server: {
    port: 3e3,
    strictPort: false,
    watch: {
      ignored: [
        "**/src/data/**",
        "**/public/data/**",
        "**/public/src/data/**",
        "**/scratch/**",
        "**/.agents/**",
        "**/.git/**"
      ]
    },
    proxy: {
      "/api": {
        target: "http://localhost:5000",
        changeOrigin: true,
        secure: false,
        configure: (proxy, _options) => {
          proxy.on("error", (_err, _req, res) => {
            if (!res.headersSent) {
              res.writeHead(404, { "Content-Type": "application/json" });
              res.end(JSON.stringify({ error: "Backend proxy target unreachable", fallback: true }));
            }
          });
        }
      }
    }
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(__vite_injected_original_dirname, "index.html"),
        admin: resolve(__vite_injected_original_dirname, "admin.html")
      }
    }
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcuanMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJEOlxcXFwxMDAgc2hvcFxcXFxMZWFybk1hcFwiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiRDpcXFxcMTAwIHNob3BcXFxcTGVhcm5NYXBcXFxcdml0ZS5jb25maWcuanNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL0Q6LzEwMCUyMHNob3AvTGVhcm5NYXAvdml0ZS5jb25maWcuanNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tICd2aXRlJztcclxuaW1wb3J0IHsgcmVzb2x2ZSB9IGZyb20gJ3BhdGgnO1xyXG5pbXBvcnQgeyBmb3JrIH0gZnJvbSAnY2hpbGRfcHJvY2Vzcyc7XHJcblxyXG5sZXQgc2VydmVyUHJvY2VzcyA9IG51bGw7XHJcblxyXG5mdW5jdGlvbiBleHByZXNzQmFja2VuZFBsdWdpbigpIHtcclxuICBmdW5jdGlvbiBzdGFydFNlcnZlcigpIHtcclxuICAgIGlmIChzZXJ2ZXJQcm9jZXNzKSB7XHJcbiAgICAgIHRyeSB7XHJcbiAgICAgICAgc2VydmVyUHJvY2Vzcy5raWxsKCk7XHJcbiAgICAgIH0gY2F0Y2ggKGUpIHt9XHJcbiAgICAgIHNlcnZlclByb2Nlc3MgPSBudWxsO1xyXG4gICAgfVxyXG4gICAgY29uc29sZS5sb2coJ1tWaXRlIERldl0gRXhwcmVzcyBcdUJDMzFcdUM1RDRcdUI0REMgXHVDMTFDXHVCQzg0KFx1RDNFQ1x1RDJCOCA1MDAwKVx1Qjk3QyBcdUFENkNcdUIzRDlcdUQ1NjlcdUIyQzhcdUIyRTQuLi4nKTtcclxuICAgIHRyeSB7XHJcbiAgICAgIHNlcnZlclByb2Nlc3MgPSBmb3JrKHJlc29sdmUoX19kaXJuYW1lLCAnc2VydmVyLmpzJyksIFtdLCB7XHJcbiAgICAgICAgZW52OiB7IC4uLnByb2Nlc3MuZW52LCBQT1JUOiAnNTAwMCcgfVxyXG4gICAgICB9KTtcclxuICAgIH0gY2F0Y2ggKGUpIHtcclxuICAgICAgY29uc29sZS5lcnJvcignW1ZpdGUgRGV2XSBFeHByZXNzIFx1QkMzMVx1QzVENFx1QjREQyBcdUFENkNcdUIzRDkgXHVDNUQwXHVCN0VDOicsIGUpO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgcmV0dXJuIHtcclxuICAgIG5hbWU6ICdleHByZXNzLWJhY2tlbmQnLFxyXG4gICAgY29uZmlndXJlU2VydmVyKHNlcnZlcikge1xyXG4gICAgICBzdGFydFNlcnZlcigpO1xyXG4gICAgICBzZXJ2ZXIud2F0Y2hlci5vbignY2hhbmdlJywgKGZpbGUpID0+IHtcclxuICAgICAgICBpZiAoZmlsZS5lbmRzV2l0aCgnc2VydmVyLmpzJykgfHwgZmlsZS5lbmRzV2l0aCgnY29uZmlnLmpzb24nKSkge1xyXG4gICAgICAgICAgY29uc29sZS5sb2coJ1tWaXRlIERldl0gc2VydmVyLmpzIFx1QjYxMFx1QjI5NCBjb25maWcuanNvbiBcdUJDQzBcdUFDQkQgXHVBQzEwXHVDOUMwIC0+IEV4cHJlc3MgXHVCQzMxXHVDNUQ0XHVCNERDIFx1QzdBQ1x1QUUzMFx1QjNEOScpO1xyXG4gICAgICAgICAgc3RhcnRTZXJ2ZXIoKTtcclxuICAgICAgICB9XHJcbiAgICAgIH0pO1xyXG4gICAgICBwcm9jZXNzLm9uKCdleGl0JywgKCkgPT4ge1xyXG4gICAgICAgIGlmIChzZXJ2ZXJQcm9jZXNzKSB7XHJcbiAgICAgICAgICB0cnkgeyBzZXJ2ZXJQcm9jZXNzLmtpbGwoKTsgfSBjYXRjaCAoZSkge31cclxuICAgICAgICB9XHJcbiAgICAgIH0pO1xyXG4gICAgfVxyXG4gIH07XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHV0ZjhIZWFkZXJzUGx1Z2luKCkge1xyXG4gIHJldHVybiB7XHJcbiAgICBuYW1lOiAndXRmOC1oZWFkZXJzLXBsdWdpbicsXHJcbiAgICBjb25maWd1cmVTZXJ2ZXIoc2VydmVyKSB7XHJcbiAgICAgIHNlcnZlci5taWRkbGV3YXJlcy51c2UoKHJlcSwgcmVzLCBuZXh0KSA9PiB7XHJcbiAgICAgICAgLy8gL2FkbWluIFx1QjYxMFx1QjI5NCAvYWRtaW4vIFx1QzgxMVx1QzE4RCBcdUMyREMgYWRtaW4uanMgXHVDMThDXHVDMkE0IFx1QjE3OFx1Q0Q5QyBcdUJDMjlcdUM5QzAgXHVCQzBGIGFkbWluLmh0bWwgXHVEMzk4XHVDNzc0XHVDOUMwXHVCODVDIHJld3JpdGVcclxuICAgICAgICBjb25zdCBjbGVhblVybCA9IHJlcS51cmwgPyByZXEudXJsLnNwbGl0KCc/JylbMF0gOiAnJztcclxuICAgICAgICBpZiAoY2xlYW5VcmwgPT09ICcvYWRtaW4nIHx8IGNsZWFuVXJsID09PSAnL2FkbWluLycpIHtcclxuICAgICAgICAgIGNvbnN0IHF1ZXJ5ID0gcmVxLnVybC5pbmNsdWRlcygnPycpID8gJz8nICsgcmVxLnVybC5zcGxpdCgnPycpWzFdIDogJyc7XHJcbiAgICAgICAgICByZXEudXJsID0gJy9hZG1pbi5odG1sJyArIHF1ZXJ5O1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3Qgb3JpZ1NldEhlYWRlciA9IHJlcy5zZXRIZWFkZXI7XHJcbiAgICAgICAgcmVzLnNldEhlYWRlciA9IGZ1bmN0aW9uIChuYW1lLCB2YWwpIHtcclxuICAgICAgICAgIGlmICh0eXBlb2YgbmFtZSA9PT0gJ3N0cmluZycgJiYgbmFtZS50b0xvd2VyQ2FzZSgpID09PSAnY29udGVudC10eXBlJykge1xyXG4gICAgICAgICAgICBpZiAodHlwZW9mIHZhbCA9PT0gJ3N0cmluZycgJiYgKHZhbC5pbmNsdWRlcygnamF2YXNjcmlwdCcpIHx8IHZhbC5pbmNsdWRlcygnaHRtbCcpIHx8IHZhbC5pbmNsdWRlcygnanNvbicpKSAmJiAhdmFsLmluY2x1ZGVzKCdjaGFyc2V0JykpIHtcclxuICAgICAgICAgICAgICB2YWwgPSBgJHt2YWx9OyBjaGFyc2V0PXV0Zi04YDtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgcmV0dXJuIG9yaWdTZXRIZWFkZXIuY2FsbCh0aGlzLCBuYW1lLCB2YWwpO1xyXG4gICAgICAgIH07XHJcbiAgICAgICAgbmV4dCgpO1xyXG4gICAgICB9KTtcclxuICAgIH1cclxuICB9O1xyXG59XHJcblxyXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoe1xyXG4gIGFwcFR5cGU6ICdtcGEnLFxyXG4gIHBsdWdpbnM6IFtleHByZXNzQmFja2VuZFBsdWdpbigpLCB1dGY4SGVhZGVyc1BsdWdpbigpXSxcclxuICBzZXJ2ZXI6IHtcclxuICAgIHBvcnQ6IDMwMDAsXHJcbiAgICBzdHJpY3RQb3J0OiBmYWxzZSxcclxuICAgIHdhdGNoOiB7XHJcbiAgICAgIGlnbm9yZWQ6IFtcclxuICAgICAgICAnKiovc3JjL2RhdGEvKionLFxyXG4gICAgICAgICcqKi9wdWJsaWMvZGF0YS8qKicsXHJcbiAgICAgICAgJyoqL3B1YmxpYy9zcmMvZGF0YS8qKicsXHJcbiAgICAgICAgJyoqL3NjcmF0Y2gvKionLFxyXG4gICAgICAgICcqKi8uYWdlbnRzLyoqJyxcclxuICAgICAgICAnKiovLmdpdC8qKidcclxuICAgICAgXVxyXG4gICAgfSxcclxuICAgIHByb3h5OiB7XHJcbiAgICAgICcvYXBpJzoge1xyXG4gICAgICAgIHRhcmdldDogJ2h0dHA6Ly9sb2NhbGhvc3Q6NTAwMCcsXHJcbiAgICAgICAgY2hhbmdlT3JpZ2luOiB0cnVlLFxyXG4gICAgICAgIHNlY3VyZTogZmFsc2UsXHJcbiAgICAgICAgY29uZmlndXJlOiAocHJveHksIF9vcHRpb25zKSA9PiB7XHJcbiAgICAgICAgICBwcm94eS5vbignZXJyb3InLCAoX2VyciwgX3JlcSwgcmVzKSA9PiB7XHJcbiAgICAgICAgICAgIGlmICghcmVzLmhlYWRlcnNTZW50KSB7XHJcbiAgICAgICAgICAgICAgcmVzLndyaXRlSGVhZCg0MDQsIHsgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyB9KTtcclxuICAgICAgICAgICAgICByZXMuZW5kKEpTT04uc3RyaW5naWZ5KHsgZXJyb3I6ICdCYWNrZW5kIHByb3h5IHRhcmdldCB1bnJlYWNoYWJsZScsIGZhbGxiYWNrOiB0cnVlIH0pKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgfSk7XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgfSxcclxuICBidWlsZDoge1xyXG4gICAgcm9sbHVwT3B0aW9uczoge1xyXG4gICAgICBpbnB1dDoge1xyXG4gICAgICAgIG1haW46IHJlc29sdmUoX19kaXJuYW1lLCAnaW5kZXguaHRtbCcpLFxyXG4gICAgICAgIGFkbWluOiByZXNvbHZlKF9fZGlybmFtZSwgJ2FkbWluLmh0bWwnKVxyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgfVxyXG59KTtcclxuXHJcbiJdLAogICJtYXBwaW5ncyI6ICI7QUFBc1AsU0FBUyxvQkFBb0I7QUFDblIsU0FBUyxlQUFlO0FBQ3hCLFNBQVMsWUFBWTtBQUZyQixJQUFNLG1DQUFtQztBQUl6QyxJQUFJLGdCQUFnQjtBQUVwQixTQUFTLHVCQUF1QjtBQUM5QixXQUFTLGNBQWM7QUFDckIsUUFBSSxlQUFlO0FBQ2pCLFVBQUk7QUFDRixzQkFBYyxLQUFLO0FBQUEsTUFDckIsU0FBUyxHQUFHO0FBQUEsTUFBQztBQUNiLHNCQUFnQjtBQUFBLElBQ2xCO0FBQ0EsWUFBUSxJQUFJLCtHQUE4QztBQUMxRCxRQUFJO0FBQ0Ysc0JBQWdCLEtBQUssUUFBUSxrQ0FBVyxXQUFXLEdBQUcsQ0FBQyxHQUFHO0FBQUEsUUFDeEQsS0FBSyxFQUFFLEdBQUcsUUFBUSxLQUFLLE1BQU0sT0FBTztBQUFBLE1BQ3RDLENBQUM7QUFBQSxJQUNILFNBQVMsR0FBRztBQUNWLGNBQVEsTUFBTSxvRUFBaUMsQ0FBQztBQUFBLElBQ2xEO0FBQUEsRUFDRjtBQUVBLFNBQU87QUFBQSxJQUNMLE1BQU07QUFBQSxJQUNOLGdCQUFn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
