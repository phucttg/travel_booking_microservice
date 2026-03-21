import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@api': fileURLToPath(new URL('./src/api', import.meta.url)),
      '@hooks': fileURLToPath(new URL('./src/hooks', import.meta.url)),
      '@stores': fileURLToPath(new URL('./src/stores', import.meta.url)),
      '@types': fileURLToPath(new URL('./src/types', import.meta.url)),
      '@components': fileURLToPath(new URL('./src/components', import.meta.url)),
      '@pages': fileURLToPath(new URL('./src/pages', import.meta.url)),
      '@utils': fileURLToPath(new URL('./src/utils', import.meta.url))
    }
  },
  server: {
    port: 5173,
    proxy: {
      '/api/v1/identity': { target: 'http://localhost:3333', changeOrigin: true },
      '/api/v1/user': { target: 'http://localhost:3333', changeOrigin: true },
      '/api/v1/flight': { target: 'http://localhost:3344', changeOrigin: true },
      '/api/v1/seat': { target: 'http://localhost:3344', changeOrigin: true },
      '/api/v1/airport': { target: 'http://localhost:3344', changeOrigin: true },
      '/api/v1/aircraft': { target: 'http://localhost:3344', changeOrigin: true },
      '/api/v1/passenger': { target: 'http://localhost:3355', changeOrigin: true },
      '/api/v1/booking': { target: 'http://localhost:3366', changeOrigin: true },
      '/api/v1/wallet': { target: 'http://localhost:3377', changeOrigin: true },
      '/api/v1/payment': { target: 'http://localhost:3377', changeOrigin: true }
    }
  },
  build: {
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (!id.includes('node_modules')) {
            return undefined;
          }

          if (
            id.includes('/react/') ||
            id.includes('/react-dom/') ||
            id.includes('/scheduler/') ||
            id.includes('/react-router/') ||
            id.includes('/react-router-dom/')
          ) {
            return 'react-core';
          }

          if (id.includes('/@tanstack/react-query') || id.includes('/@tanstack/query-core')) {
            return 'query';
          }

          if (id.includes('/recharts/') || id.includes('/dayjs/')) {
            return 'charts';
          }

          if (id.includes('/@ant-design/icons/')) {
            return 'antd-core';
          }

          if (id.includes('/@rc-component/') || id.includes('/rc-')) {
            return 'antd-rc';
          }

          if (id.includes('/antd/')) {
            return 'antd-core';
          }

          const packagePath = id.split('node_modules/')[1];
          if (!packagePath) {
            return 'vendor';
          }

          const packageName = packagePath.startsWith('@')
            ? packagePath.split('/').slice(0, 2).join('/')
            : packagePath.split('/')[0];

          return `vendor-${packageName.replace('@', '').replace('/', '-')}`;
        }
      }
    }
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    include: ['src/test/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['**/node_modules/**', '**/dist/**', 'e2e/**']
  }
});
