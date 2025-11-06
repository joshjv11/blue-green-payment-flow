import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    // Default to jsdom for component tests, but allow per-file overrides
    environment: 'jsdom',
    setupFiles: ['./setup.ts', './setup-react.ts'],
    testTimeout: 30000,
    hookTimeout: 30000,
    // Include both component tests and integration tests
    include: [
      'tests/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
      'src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
    ],
    // Use jsdom for component tests, node for integration tests
    // Note: Component tests should have // @vitest-environment jsdom at the top
    environmentMatchGlobs: [
      ['**/components/**/*.test.{ts,tsx}', 'jsdom'], // Component tests use jsdom
      ['tests/components/**', 'jsdom'], // Component tests use jsdom
    ],
    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'tests/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/dist/',
        '**/build/',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '../src'),
    },
  },
});
