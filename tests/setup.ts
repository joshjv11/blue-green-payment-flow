/**
 * Test Setup Configuration
 * Loads environment variables and configures test environment
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Load .env from root
config({ path: resolve(__dirname, '../.env') });

// Validate required env vars
const required = [
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
];

for (const key of required) {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}

console.log('✅ Test environment configured');
console.log(`📍 Supabase URL: ${process.env.VITE_SUPABASE_URL}`);
