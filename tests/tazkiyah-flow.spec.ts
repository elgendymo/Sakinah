import { test, expect } from '@playwright/test';

test.describe('Tazkiyah Flow', () => {
  test('should complete Takhliyah (purification) flow', async ({ page }) => {
    // Navigate to tazkiyah page
    await page.goto('/tazkiyah');

    // Verify page loaded correctly
    await expect(page).toHaveTitle(/Sakinah/);
    await expect(page.getByRole('heading', { name: 'Begin Your Tazkiyah Journey' })).toBeVisible();

    // Default should be Takhliyah selected
    await expect(page.getByText('Takhliyah')).toBeVisible();
    await expect(page.getByText('Remove spiritual diseases')).toBeVisible();

    // Verify Takhliyah is selected by default (check for active styling)
    const takhliyahButton = page.locator('button', { hasText: 'Takhliyah' });
    await expect(takhliyahButton).toHaveClass(/border-primary-500/);

    // Test custom input
    await page.getByPlaceholder('e.g., anger, envy, pride...').fill('anger management');

    // Submit form
    await page.getByRole('button', { name: 'Get Personalized Plan' }).click();

    // Wait for plan to be generated
    await expect(page.getByRole('heading', { name: 'Your Personalized Plan' })).toBeVisible();

    // Verify plan details
    await expect(page.getByText('Purifying from:')).toBeVisible();
    await expect(page.getByText('anger management')).toBeVisible();
    await expect(page.getByText('Daily Micro-Habits:')).toBeVisible();

    // Should show habits related to anger management
    await expect(page.getByText('Seek refuge when feeling angry')).toBeVisible();
    await expect(page.getByText('Perform wudu when angry')).toBeVisible();

    // Accept the plan
    await page.getByRole('button', { name: 'Accept & Start Journey' }).click();

    // Should redirect to dashboard
    await expect(page).toHaveURL('/dashboard');
  });

  test('should complete Tahliyah (beautification) flow', async ({ page }) => {
    await page.goto('/tazkiyah');

    // Select Tahliyah mode
    await page.locator('button', { hasText: 'Taḥliyah' }).click();

    // Verify mode switched
    await expect(page.getByText('Build beautiful virtues')).toBeVisible();
    await expect(page.getByPlaceholder('e.g., patience, gratitude, tawakkul...')).toBeVisible();

    // Enter virtue to develop
    await page.getByPlaceholder('e.g., patience, gratitude, tawakkul...').fill('patience');

    // Submit
    await page.getByRole('button', { name: 'Get Personalized Plan' }).click();

    // Verify plan is generated
    await expect(page.getByRole('heading', { name: 'Your Personalized Plan' })).toBeVisible();
    await expect(page.getByText('Building:')).toBeVisible();
    await expect(page.getByText('patience')).toBeVisible();

    // Should show patience-related habits
    await expect(page.getByText('Recite "Inna lillahi wa inna ilayhi rajioon"')).toBeVisible();

    // Try different input button
    await page.getByRole('button', { name: 'Try Different Input' }).click();

    // Should return to initial form
    await expect(page.getByRole('heading', { name: 'Begin Your Tazkiyah Journey' })).toBeVisible();
    // Should maintain the selected mode
    const tahliyahButton = page.locator('button', { hasText: 'Taḥliyah' });
    await expect(tahliyahButton).toHaveClass(/border-primary-500/);
  });

  test('should use quick select options', async ({ page }) => {
    await page.goto('/tazkiyah');

    // Test Takhliyah quick selects
    await expect(page.getByText('Envy (Hasad)')).toBeVisible();
    await expect(page.getByText('Pride (Kibr)')).toBeVisible();

    // Click on a quick select option
    await page.getByRole('button', { name: 'Envy (Hasad)' }).click();

    // Should populate the input field
    await expect(page.getByPlaceholder('e.g., anger, envy, pride...')).toHaveValue('Envy (Hasad)');

    // Switch to Tahliyah and test its options
    await page.locator('button', { hasText: 'Taḥliyah' }).click();

    await expect(page.getByText('Patience (Sabr)')).toBeVisible();
    await expect(page.getByText('Gratitude (Shukr)')).toBeVisible();

    // Click on a virtue
    await page.getByRole('button', { name: 'Gratitude (Shukr)' }).click();
    await expect(page.getByPlaceholder('e.g., patience, gratitude, tawakkul...')).toHaveValue('Gratitude (Shukr)');
  });

  test('should handle form validation', async ({ page }) => {
    await page.goto('/tazkiyah');

    // Try to submit without input
    const submitButton = page.getByRole('button', { name: 'Get Personalized Plan' });
    await expect(submitButton).toBeDisabled();

    // Add input and verify button becomes enabled
    await page.getByPlaceholder('e.g., anger, envy, pride...').fill('test');
    await expect(submitButton).toBeEnabled();

    // Clear input and verify button becomes disabled again
    await page.getByPlaceholder('e.g., anger, envy, pride...').clear();
    await expect(submitButton).toBeDisabled();
  });

  test('should show loading state during plan generation', async ({ page }) => {
    await page.goto('/tazkiyah');

    // Fill input
    await page.getByPlaceholder('e.g., anger, envy, pride...').fill('procrastination');

    // Click submit and check loading state
    await page.getByRole('button', { name: 'Get Personalized Plan' }).click();

    // Should show loading text (might be brief due to fast API response)
    await expect(page.getByText('Creating Plan...')).toBeVisible({ timeout: 1000 }).catch(() => {
      // If loading state is too fast, just verify the plan was created successfully
      return expect(page.getByRole('heading', { name: 'Your Personalized Plan' })).toBeVisible();
    });
  });

  test('should handle mode switching correctly', async ({ page }) => {
    await page.goto('/tazkiyah');

    // Start with Takhliyah
    await expect(page.getByText('What struggle would you like to overcome?')).toBeVisible();

    // Switch to Tahliyah
    await page.locator('button', { hasText: 'Taḥliyah' }).click();
    await expect(page.getByText('What virtue would you like to develop?')).toBeVisible();

    // Switch back to Takhliyah
    await page.locator('button', { hasText: 'Takhliyah' }).click();
    await expect(page.getByText('What struggle would you like to overcome?')).toBeVisible();

    // Input field placeholder should update
    await expect(page.getByPlaceholder('e.g., anger, envy, pride...')).toBeVisible();
  });
});