import { describe, expect, it } from 'vitest';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';

const apiRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

describe('env boot validation', () => {
  it('exits non-zero with clear message when JWT_SECRET is missing', () => {
    const result = spawnSync(
      'npx',
      ['tsx', '-e', "import('./src/env.ts')"],
      {
        cwd: apiRoot,
        env: {
          ...process.env,
          JWT_SECRET: '',
          JWTSECRET: '',
          DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
          NODE_ENV: 'test',
        },
        encoding: 'utf8',
      }
    );

    expect(result.status).not.toBe(0);
    expect(result.stderr).toMatch(/JWT_SECRET is required/);
  });

  it('accepts DATABASEURL alias', () => {
    const result = spawnSync(
      'npx',
      ['tsx', '-e', "import('./src/env.ts'); console.log('ok')"],
      {
        cwd: apiRoot,
        env: {
          ...process.env,
          JWT_SECRET: 'test-secret',
          DATABASE_URL: '',
          DATABASEURL: 'postgresql://test:test@localhost:5432/test',
          NODE_ENV: 'test',
        },
        encoding: 'utf8',
      }
    );

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('ok');
  });

  it('exits non-zero when DATABASE_URL is missing', () => {
    const result = spawnSync(
      'npx',
      ['tsx', '-e', "import('./src/env.ts')"],
      {
        cwd: apiRoot,
        env: {
          ...process.env,
          JWT_SECRET: 'test-secret',
          DATABASE_URL: '',
          NODE_ENV: 'test',
        },
        encoding: 'utf8',
      }
    );

    expect(result.status).not.toBe(0);
    expect(result.stderr).toMatch(/DATABASE_URL is required/);
  });
});
