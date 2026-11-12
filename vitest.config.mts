import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/core/**/*.spec.ts'],
    environment: 'node',
    globals: true,
  },
});
