import { defineConfig } from 'vitest/config';

export default defineConfig({
  // La API no usa CSS: así Vite no busca el PostCSS de la app en la carpeta de arriba.
  css: { postcss: { plugins: [] } },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    // Las pruebas de integración comparten una base de datos: se corren una tras otra.
    fileParallelism: false,
    testTimeout: 20000,
    setupFiles: ['tests/preparar.ts'],
  },
});
