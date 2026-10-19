import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
    build: {
      // Production: минификация включена, sourcemap отключены (не отдаём исходники клиентам).
      sourcemap: false,
      minify: true,
      rollupOptions: {
        output: {
          // Three.js и React вынесены в отдельные чанки: они редко меняются
          // и кэшируются браузером отдельно от бизнес-кода.
          manualChunks: {
            three: ['three'],
            react_vendor: ['react', 'react-dom'],
          },
        },
      },
    },
  };
});
