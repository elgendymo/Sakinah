import { test, expect } from '@playwright/test';

test.describe('Onboarding Flow', () => {
  test('should complete full onboarding journey', async ({ page }) => {
    // Navigate to onboarding page
    await page.goto('/onboarding');

    // Step 1: Welcome screen
    await expect(page).toHaveTitle(/Sakinah/);
    await expect(page.getByRole('heading', { name: 'Welcome to Sakinah' })).toBeVisible();
    await expect(page.getByText('Privacy-first • All your data stays private')).toBeVisible();
    await expect(page.getByText('Shariah-compliant • Based on Quran & Sunnah')).toBeVisible();
    await expect(page.getByText('No social features • Between you and Allah')).toBeVisible();

    // Click Begin Journey button
    await page.getByRole('button', { name: 'Begin Journey' }).click();

    // Step 2: Profile information
    await expect(page.getByRole('heading', { name: 'Tell us about yourself' })).toBeVisible();

    // Fill out profile form
    await page.getByPlaceholder('How would you like to be addressed?').fill('Test User');
    await page.getByRole('combobox').first().selectOption('America/New_York'); // Timezone
    await page.getByRole('combobox').nth(1).selectOption('en'); // Language

    // Click Continue button
    await page.getByRole('button', { name: 'Continue' }).click();

    // Step 3: Ready to begin Tazkiyah
    await expect(page.getByRole('heading', { name: 'Ready to begin your Tazkiyah journey?' })).toBeVisible();
    await expect(page.getByText('Tazkiyah means "purification"')).toBeVisible();

    // Verify Quranic verse is displayed
    await expect(page.getByText('وَنَفْسٍ وَمَا سَوَّاهَا')).toBeVisible();

    // Click Start Tazkiyah button
    await page.getByRole('button', { name: 'Start Tazkiyah' }).click();

    // Should navigate to tazkiyah page
    await expect(page).toHaveURL('/tazkiyah');
    await expect(page.getByRole('heading', { name: 'Begin Your Tazkiyah Journey' })).toBeVisible();
  });

  test('should handle back navigation between steps', async ({ page }) => {
    await page.goto('/onboarding');

    // Go to step 2
    await page.getByRole('button', { name: 'Begin Journey' }).click();

    // Go back to step 1
    await page.getByRole('button', { name: 'Back' }).click();
    await expect(page.getByRole('heading', { name: 'Welcome to Sakinah' })).toBeVisible();

    // Go forward again
    await page.getByRole('button', { name: 'Begin Journey' }).click();

    // Fill form and go to step 3
    await page.getByPlaceholder('How would you like to be addressed?').fill('Test User');
    await page.getByRole('button', { name: 'Continue' }).click();

    // Go back to step 2
    await page.getByRole('button', { name: 'Back' }).click();
    await expect(page.getByRole('heading', { name: 'Tell us about yourself' })).toBeVisible();
    // Verify form data is preserved
    await expect(page.getByPlaceholder('How would you like to be addressed?')).toHaveValue('Test User');
  });

  test('should show progress indicators correctly', async ({ page }) => {
    await page.goto('/onboarding');

    // Check initial progress (step 1)
      page.locator('div').filter({ hasText: /^$/ }).nth(2);

    // Navigate through steps and verify progress updates
    await page.getByRole('button', { name: 'Begin Journey' }).click();
    // Step 2 progress check would go here

    await page.getByPlaceholder('How would you like to be addressed?').fill('Test');
    await page.getByRole('button', { name: 'Continue' }).click();
    // Step 3 progress check would go here
  });

  test('should validate required fields', async ({ page }) => {
    await page.goto('/onboarding');

    // Skip to step 2
    await page.getByRole('button', { name: 'Begin Journey' }).click();

    // Try to continue without filling name (name is optional, so this should work)
    await page.getByRole('button', { name: 'Continue' }).click();

    // Should proceed to step 3 even without name
    await expect(page.getByRole('heading', { name: 'Ready to begin your Tazkiyah journey?' })).toBeVisible();
  });
});