import path from "path";
import react from "@vitejs/plugin-react-swc";
import { defineConfig } from "vite";
export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./src"),
        },
    },
    server: {
        proxy: {
            '/api': {
                target: 'http://localhost:8001',
                changeOrigin: true,
                secure: false,
                rewrite: function (path) { return path.replace(/^\/api/, ''); }
            }
        },
        host: true,
        port: 5173,
        strictPort: true
    }
});
