/**
 * Test Setup Configuration
 * Loads environment variables and configures test environment
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Load .env from root
config({ path: resolve(__dirname, '../.env') });

// Validate required env vars (only for integration tests)
// Component tests don't need these, so we make them optional
const required = [
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
];

// Only throw error if we're running integration tests (node environment)
// Component tests (jsdom) don't need Supabase env vars
if (process.env.VITEST_ENVIRONMENT === 'node') {
  for (const key of required) {
    if (!process.env[key]) {
      console.warn(`⚠️  Missing environment variable: ${key}`);
      console.warn('   Component tests will work, but integration tests may fail.');
      // Don't throw - let tests fail gracefully if they need these vars
      break;
    }
  }
}

console.log('✅ Test environment configured');
console.log(`📍 Supabase URL: ${process.env.VITE_SUPABASE_URL}`);
