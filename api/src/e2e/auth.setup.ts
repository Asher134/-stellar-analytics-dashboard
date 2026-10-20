import { test as setup, expect } from '@playwright/test';

const authFile = 'playwright/.auth/user.json';

/**
 * Global authentication setup for E2E tests (#452)
 * Simulates wallet connection / authentication and saves storage state.
 */
setup('authenticate as test user', async ({ page }) => {
  await page.goto('/login');

  // Perform mock wallet connect or sign-in action
  const connectWalletBtn = page.locator('button:has-text("Connect Wallet"), [data-testid="connect-wallet-btn"]');
  if (await connectWalletBtn.isVisible()) {
    await connectWalletBtn.click();
  }

  // Handle mock approval or session token injection
  await page.evaluate(() => {
    localStorage.setItem('stellar_auth_session', JSON.stringify({ token: 'mock-jwt-token-authenticated', address: 'GA...MOCKUSER' }));
  });

  await page.goto('/dashboard');
  
  // Verify we reached the authenticated dashboard
  await expect(page.locator('.dashboard-container, [data-testid="dashboard"]')).toBeVisible();

  // Save storage state to file for reuse in tests
  await page.context().storageState({ path: authFile });
});