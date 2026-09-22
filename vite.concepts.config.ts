import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'node:path';
export default defineConfig({ plugins: [react()], resolve: { alias: { '@': path.resolve(__dirname, 'src'), 'lenis': path.resolve(__dirname, 'src/concepts/os/node_modules/lenis') } }, server: { host: '127.0.0.1', port: 8081 }, build: { outDir: 'dist/concepts', rollupOptions: { input: ['concepts.html', 'os.html', 'practice.html'] } } });
