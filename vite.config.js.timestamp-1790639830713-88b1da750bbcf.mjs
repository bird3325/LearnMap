// vite.config.js
import { defineConfig } from "file:///D:/100%20shop/LearnMap/node_modules/vite/dist/node/index.js";
import { resolve } from "path";
import { fork } from "child_process";
var __vite_injected_original_dirname = "D:\\100 shop\\LearnMap";
var serverProcess = null;
function expressBackendPlugin() {
  return {
    name: "express-backend",
    configureServer() {
      if (!serverProcess) {
        console.log("[Vite Dev] Express \uBC31\uC5D4\uB4DC \uC11C\uBC84(\uD3EC\uD2B8 5000)\uB97C \uAD6C\uB3D9\uD569\uB2C8\uB2E4...");
        try {
          serverProcess = fork(resolve(__vite_injected_original_dirname, "server.js"), [], {
            env: { ...process.env, PORT: "5000" }
          });
          process.on("exit", () => {
            if (serverProcess) serverProcess.kill();
          });
        } catch (e) {
          console.error("[Vite Dev] Express \uBC31\uC5D4\uB4DC \uAD6C\uB3D9 \uC5D0\uB7EC:", e);
        }
      }
    }
  };
}
var vite_config_default = defineConfig({
  plugins: [expressBackendPlugin()],
  server: {
    port: 3e3,
    strictPort: false,
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
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcuanMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJEOlxcXFwxMDAgc2hvcFxcXFxMZWFybk1hcFwiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiRDpcXFxcMTAwIHNob3BcXFxcTGVhcm5NYXBcXFxcdml0ZS5jb25maWcuanNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL0Q6LzEwMCUyMHNob3AvTGVhcm5NYXAvdml0ZS5jb25maWcuanNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tICd2aXRlJztcclxuaW1wb3J0IHsgcmVzb2x2ZSB9IGZyb20gJ3BhdGgnO1xyXG5pbXBvcnQgeyBmb3JrIH0gZnJvbSAnY2hpbGRfcHJvY2Vzcyc7XHJcblxyXG5sZXQgc2VydmVyUHJvY2VzcyA9IG51bGw7XHJcblxyXG5mdW5jdGlvbiBleHByZXNzQmFja2VuZFBsdWdpbigpIHtcclxuICByZXR1cm4ge1xyXG4gICAgbmFtZTogJ2V4cHJlc3MtYmFja2VuZCcsXHJcbiAgICBjb25maWd1cmVTZXJ2ZXIoKSB7XHJcbiAgICAgIGlmICghc2VydmVyUHJvY2Vzcykge1xyXG4gICAgICAgIGNvbnNvbGUubG9nKCdbVml0ZSBEZXZdIEV4cHJlc3MgXHVCQzMxXHVDNUQ0XHVCNERDIFx1QzExQ1x1QkM4NChcdUQzRUNcdUQyQjggNTAwMClcdUI5N0MgXHVBRDZDXHVCM0Q5XHVENTY5XHVCMkM4XHVCMkU0Li4uJyk7XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgIHNlcnZlclByb2Nlc3MgPSBmb3JrKHJlc29sdmUoX19kaXJuYW1lLCAnc2VydmVyLmpzJyksIFtdLCB7XHJcbiAgICAgICAgICAgIGVudjogeyAuLi5wcm9jZXNzLmVudiwgUE9SVDogJzUwMDAnIH1cclxuICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgcHJvY2Vzcy5vbignZXhpdCcsICgpID0+IHtcclxuICAgICAgICAgICAgaWYgKHNlcnZlclByb2Nlc3MpIHNlcnZlclByb2Nlc3Mua2lsbCgpO1xyXG4gICAgICAgICAgfSk7XHJcbiAgICAgICAgfSBjYXRjaCAoZSkge1xyXG4gICAgICAgICAgY29uc29sZS5lcnJvcignW1ZpdGUgRGV2XSBFeHByZXNzIFx1QkMzMVx1QzVENFx1QjREQyBcdUFENkNcdUIzRDkgXHVDNUQwXHVCN0VDOicsIGUpO1xyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgfVxyXG4gIH07XHJcbn1cclxuXHJcbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZyh7XHJcbiAgcGx1Z2luczogW2V4cHJlc3NCYWNrZW5kUGx1Z2luKCldLFxyXG4gIHNlcnZlcjoge1xyXG4gICAgcG9ydDogMzAwMCxcclxuICAgIHN0cmljdFBvcnQ6IGZhbHNlLFxyXG4gICAgcHJveHk6IHtcclxuICAgICAgJy9hcGknOiB7XHJcbiAgICAgICAgdGFyZ2V0OiAnaHR0cDovL2xvY2FsaG9zdDo1MDAwJyxcclxuICAgICAgICBjaGFuZ2VPcmlnaW46IHRydWUsXHJcbiAgICAgICAgc2VjdXJlOiBmYWxzZSxcclxuICAgICAgICBjb25maWd1cmU6IChwcm94eSwgX29wdGlvbnMpID0+IHtcclxuICAgICAgICAgIHByb3h5Lm9uKCdlcnJvcicsIChfZXJyLCBfcmVxLCByZXMpID0+IHtcclxuICAgICAgICAgICAgaWYgKCFyZXMuaGVhZGVyc1NlbnQpIHtcclxuICAgICAgICAgICAgICByZXMud3JpdGVIZWFkKDQwNCwgeyAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nIH0pO1xyXG4gICAgICAgICAgICAgIHJlcy5lbmQoSlNPTi5zdHJpbmdpZnkoeyBlcnJvcjogJ0JhY2tlbmQgcHJveHkgdGFyZ2V0IHVucmVhY2hhYmxlJywgZmFsbGJhY2s6IHRydWUgfSkpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICB9KTtcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgIH1cclxuICB9LFxyXG4gIGJ1aWxkOiB7XHJcbiAgICByb2xsdXBPcHRpb25zOiB7XHJcbiAgICAgIGlucHV0OiB7XHJcbiAgICAgICAgbWFpbjogcmVzb2x2ZShfX2Rpcm5hbWUsICdpbmRleC5odG1sJyksXHJcbiAgICAgICAgYWRtaW46IHJlc29sdmUoX19kaXJuYW1lLCAnYWRtaW4uaHRtbCcpXHJcbiAgICAgIH1cclxuICAgIH1cclxuICB9XHJcbn0pO1xyXG5cclxuIl0sCiAgIm1hcHBpbmdzIjogIjtBQUFzUCxTQUFTLG9CQUFvQjtBQUNuUixTQUFTLGVBQWU7QUFDeEIsU0FBUyxZQUFZO0FBRnJCLElBQU0sbUNBQW1DO0FBSXpDLElBQUksZ0JBQWdCO0FBRXBCLFNBQVMsdUJBQXVCO0FBQzlCLFNBQU87QUFBQSxJQUNMLE1BQU07QUFBQSxJQUNOLGtCQUFrQjtBQUNoQixVQUFJLENBQUMsZUFBZTtBQUNsQixnQkFBUSxJQUFJLCtHQUE4QztBQUMxRCxZQUFJO0FBQ0YsMEJBQWdCLEtBQUssUUFBUSxrQ0FBVyxXQUFXLEdBQUcsQ0FBQyxHQUFHO0FBQUEsWUFDeEQsS0FBSyxFQUFFLEdBQUcsUUFBUSxLQUFLLE1BQU0sT0FBTztBQUFBLFVBQ3RDLENBQUM7QUFDRCxrQkFBUSxHQUFHLFFBQVEsTUFBTTtBQUN2QixnQkFBSSxjQUFlLGVBQWMsS0FBSztBQUFBLFVBQ3hDLENBQUM7QUFBQSxRQUNILFNBQVMsR0FBRztBQUNWLGtCQUFRLE1BQU0sb0VBQWlDLENBQUM7QUFBQSxRQUNsRDtBQUFBLE1BQ0Y7QUFBQSxJQUNGO0FBQUEsRUFDRjtBQUNGO0FBRUEsSUFBTyxzQkFBUSxhQUFhO0FBQUEsRUFDMUIsU0FBUyxDQUFDLHFCQUFxQixDQUFDO0FBQUEsRUFDaEMsUUFBUTtBQUFBLElBQ04sTUFBTTtBQUFBLElBQ04sWUFBWTtBQUFBLElBQ1osT0FBTztBQUFBLE1BQ0wsUUFBUTtBQUFBLFFBQ04sUUFBUTtBQUFBLFFBQ1IsY0FBYztBQUFBLFFBQ2QsUUFBUTtBQUFBLFFBQ1IsV0FBVyxDQUFDLE9BQU8sYUFBYTtBQUM5QixnQkFBTSxHQUFHLFNBQVMsQ0FBQyxNQUFNLE1BQU0sUUFBUTtBQUNyQyxnQkFBSSxDQUFDLElBQUksYUFBYTtBQUNwQixrQkFBSSxVQUFVLEtBQUssRUFBRSxnQkFBZ0IsbUJBQW1CLENBQUM7QUFDekQsa0JBQUksSUFBSSxLQUFLLFVBQVUsRUFBRSxPQUFPLG9DQUFvQyxVQUFVLEtBQUssQ0FBQyxDQUFDO0FBQUEsWUFDdkY7QUFBQSxVQUNGLENBQUM7QUFBQSxRQUNIO0FBQUEsTUFDRjtBQUFBLElBQ0Y7QUFBQSxFQUNGO0FBQUEsRUFDQSxPQUFPO0FBQUEsSUFDTCxlQUFlO0FBQUEsTUFDYixPQUFPO0FBQUEsUUFDTCxNQUFNLFFBQVEsa0NBQVcsWUFBWTtBQUFBLFFBQ3JDLE9BQU8sUUFBUSxrQ0FBVyxZQUFZO0FBQUEsTUFDeEM7QUFBQSxJQUNGO0FBQUEsRUFDRjtBQUNGLENBQUM7IiwKICAibmFtZXMiOiBbXQp9Cg==
