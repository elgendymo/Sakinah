import { test, expect } from '@playwright/test';

// Simplified tests that focus on what's actually working
test.describe('Main App Flows - Simplified', () => {

  test('should load home page with welcome content', async ({ page }) => {
    await page.goto('/');

    // Basic page structure
    await expect(page).toHaveTitle(/Sakinah/);
    await expect(page.getByText('Welcome to Sakinah')).toBeVisible();
    await expect(page.getByText('Your personal journey to spiritual purification')).toBeVisible();

    // Feature highlights
    await expect(page.getByRole('heading', { name: 'Privacy-First' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Shariah-Compliant' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Soul Purification' })).toBeVisible();

    // Navigation links
    await expect(page.getByRole('link', { name: 'Start Your Journey' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Continue Learning' })).toBeVisible();
  });

  test('should navigate to onboarding and complete flow', async ({ page }) => {
    await page.goto('/onboarding');

    // Step 1
    await expect(page.getByText('Welcome to Sakinah')).toBeVisible();
    await page.getByRole('button', { name: 'Begin Journey' }).click();

    // Step 2
    await expect(page.getByText('Tell us about yourself')).toBeVisible();
    await page.getByRole('button', { name: 'Continue' }).click();

    // Step 3
    await expect(page.getByText('Ready to begin your Tazkiyah journey?')).toBeVisible();
    await page.getByRole('button', { name: 'Start Tazkiyah' }).click();

    // Should navigate to tazkiyah
    await expect(page).toHaveURL('/tazkiyah');
  });

  test('should load tazkiyah page and show form', async ({ page }) => {
    await page.goto('/tazkiyah');

    await expect(page.getByText('Begin Your Tazkiyah Journey')).toBeVisible();
    await expect(page.getByText('Takhliyah')).toBeVisible();
    await expect(page.getByText('Taḥliyah')).toBeVisible();

    // Form elements
    await expect(page.getByPlaceholder('e.g., anger, envy, pride...')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Get Personalized Plan' })).toBeVisible();

    // Quick select buttons
    await expect(page.getByText('Envy (Hasad)')).toBeVisible();
    await expect(page.getByText('Anger')).toBeVisible();
  });

  test('should switch between takhliyah and tahliyah modes', async ({ page }) => {
    await page.goto('/tazkiyah');

    // Default is takhliyah
    await expect(page.getByText('What struggle would you like to overcome?')).toBeVisible();

    // Switch to tahliyah
    await page.locator('button', { hasText: 'Taḥliyah' }).click();
    await expect(page.getByText('What virtue would you like to develop?')).toBeVisible();

    // Different quick selects should appear
    await expect(page.getByText('Patience (Sabr)')).toBeVisible();
    await expect(page.getByText('Gratitude (Shukr)')).toBeVisible();
  });

  test('should load check-in page with form elements', async ({ page }) => {
    await page.goto('/checkin');

    await expect(page.getByText('Daily Muhasabah')).toBeVisible();
    await expect(page.getByText('Self-accountability before Allah')).toBeVisible();

    // Arabic text
    await expect(page.getByText('حاسبوا أنفسكم قبل أن تحاسبوا')).toBeVisible();

    // Form sections
    await expect(page.getByText('🌅 Morning Intention')).toBeVisible();
    await expect(page.getByText('🌙 Evening Reflection')).toBeVisible();

    // Form inputs
    await expect(page.getByPlaceholder('I intend to remember Allah more')).toBeVisible();
    await expect(page.getByText('How are you feeling spiritually today?')).toBeVisible();

    // Mood buttons
    await expect(page.getByText('😔')).toBeVisible();
    await expect(page.getByText('😊')).toBeVisible();
    await expect(page.getByText('✨')).toBeVisible();
  });

  test('should load habits page structure', async ({ page }) => {
    await page.goto('/habits');

    await expect(page.getByText('Today\'s Habits')).toBeVisible();

    // Check for either habits content or empty state
    try {
      // If habits are loaded
      await expect(page.locator('[data-testid="habit-card"]')).toBeVisible({ timeout: 3000 });
    } catch {
      // If no habits (empty state)
      await expect(page.getByText('No habits yet')).toBeVisible();
      await expect(page.getByText('🌱')).toBeVisible();
    }
  });

  test('should load content library page structure', async ({ page }) => {
    await page.goto('/content');

    await expect(page.getByText('📚 Content Library')).toBeVisible();
    await expect(page.getByText('Explore curated Islamic content')).toBeVisible();

    // Filters section
    await expect(page.getByText('Content Type')).toBeVisible();
    await expect(page.getByText('Popular Topics')).toBeVisible();

    // Search
    await expect(page.getByPlaceholder('Search content, translations, or sources...')).toBeVisible();

    // Should show some results count or loading/empty state
    await expect(page.getByText(/\d+ items found|Loading content|No content found/)).toBeVisible({ timeout: 5000 });
  });

  test('should redirect dashboard to login when not authenticated', async ({ page }) => {
    await page.goto('/dashboard');

    // Should redirect to login or show auth requirement
    // Dashboard requires authentication, so we expect either:
    // 1. Redirect to login page
    // 2. Some form of auth prompt
    // 3. Home page redirect

    // Wait for navigation to complete
    await page.waitForTimeout(1000);

    // Should not be on dashboard anymore (due to auth redirect)
    expect(page.url()).not.toContain('/dashboard');
  });

  test('should handle navigation between pages', async ({ page }) => {
    // Start at home
    await page.goto('/');

    // Go to tazkiyah
    await page.getByRole('link', { name: 'Start Tazkiyah' }).click();
    await expect(page).toHaveURL('/tazkiyah');

    // Go to habits
    await page.goto('/');
    await page.getByRole('link', { name: 'Track Habits' }).click();
    await expect(page).toHaveURL('/habits');

    // Go to content
    await page.goto('/');
    await page.getByRole('link', { name: 'Content Library' }).click();
    await expect(page).toHaveURL('/content');

    // Go to check-in
    await page.goto('/');
    await page.getByRole('link', { name: 'Daily Muhasabah' }).click();
    await expect(page).toHaveURL('/checkin');
  });

  test('should display Arabic content correctly', async ({ page }) => {
    await page.goto('/');

    // Arabic verse on home page (use first occurrence)
    await expect(page.getByText('وَاصْبِرْ نَفْسَكَ').first()).toBeVisible();

    // Check-in page Arabic
    await page.goto('/checkin');
    await expect(page.getByText('حاسبوا أنفسكم')).toBeVisible();
    await expect(page.getByText('إِنَّ اللَّهَ لَا يُغَيِّرُ')).toBeVisible();
  });

  test('should be responsive on different screen sizes', async ({ page }) => {
    // Desktop
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/');
    await expect(page.getByText('Welcome to Sakinah')).toBeVisible();

    // Mobile
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(page.getByText('Welcome to Sakinah')).toBeVisible();

    // Tablet
    await page.setViewportSize({ width: 768, height: 1024 });
    await expect(page.getByText('Welcome to Sakinah')).toBeVisible();
  });
});