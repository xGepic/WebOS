import { defineConfig } from 'vitest/config';

// Tests build local dates and compare them with other time zones (World Clock, Sun), so they
// run in one fixed zone, whichever machine runs them. The test workers inherit it.
(globalThis as unknown as { process: { env: Record<string, string> } }).process.env['TZ'] = 'Europe/Vienna';

export default defineConfig({
  test: {
    include: ['src/core/**/*.spec.ts'],
    environment: 'node',
    globals: true,
  },
});
