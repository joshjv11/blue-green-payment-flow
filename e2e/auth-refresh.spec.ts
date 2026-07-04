import { test, expect } from '@playwright/test';

test('session bootstrap calls /auth/refresh after hard reload', async ({ page, context }) => {
  let refreshCalls = 0;

  await page.route('**/auth/refresh', async (route) => {
    refreshCalls += 1;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        token: 'mock-access-token',
        user: {
          id: '11111111-1111-1111-1111-111111111111',
          email: 'playwright@test.com',
          full_name: 'Playwright User',
          org_id: '22222222-2222-2222-2222-222222222222',
          role: 'owner',
          plan: 'free',
          verified: false,
        },
      }),
    });
  });

  await context.addCookies([
    {
      name: 'refresh_token',
      value: 'mock-refresh-token-for-e2e',
      domain: 'localhost',
      path: '/auth',
      httpOnly: true,
      secure: false,
      sameSite: 'Lax',
    },
  ]);

  await page.goto('/auth');
  await page.waitForLoadState('networkidle');

  const callsBeforeReload = refreshCalls;
  await page.reload();
  await page.waitForLoadState('networkidle');

  expect(refreshCalls).toBeGreaterThan(callsBeforeReload);
});
