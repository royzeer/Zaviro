import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    // Las pruebas de integración comparten una base de datos: se corren una tras otra.
    fileParallelism: false,
    testTimeout: 20000,
    setupFiles: ['tests/preparar.ts'],
  },
});
