import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['__tests__/**/*.test.ts'],
    env: {
      API_KEY_ENCRYPTION_SECRET: 'test-secret-for-vitest-only',
      NEXTAUTH_SECRET: 'test-nextauth-secret',
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
  },
});
