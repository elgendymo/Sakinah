import { test, expect } from '@playwright/test';

test.describe('Navigation and Dashboard', () => {
  test('should navigate through main pages from home', async ({ page }) => {
    // Start at home page
    await page.goto('/');

    // Verify home page loaded
    await expect(page).toHaveTitle(/Sakinah/);
    await expect(page.getByRole('heading', { name: 'Welcome to Sakinah' })).toBeVisible();

    // Test navigation to onboarding
    await page.getByRole('link', { name: 'Start Your Journey' }).click();
    await expect(page).toHaveURL('/onboarding');
    await expect(page.getByRole('heading', { name: 'Welcome to Sakinah' })).toBeVisible();

    // Go back home
    await page.goto('/');

    // Test navigation to content library
    await page.getByRole('link', { name: 'Content Library' }).click();
    await expect(page).toHaveURL('/content');
    await expect(page.getByRole('heading', { name: '📚 Content Library' })).toBeVisible();

    // Go back home
    await page.goto('/');

    // Test navigation to Tazkiyah
    await page.getByRole('link', { name: 'Start Tazkiyah' }).click();
    await expect(page).toHaveURL('/tazkiyah');
    await expect(page.getByRole('heading', { name: 'Begin Your Tazkiyah Journey' })).toBeVisible();

    // Go back home
    await page.goto('/');

    // Test navigation to habits
    await page.getByRole('link', { name: 'Track Habits' }).click();
    await expect(page).toHaveURL('/habits');
    await expect(page.getByRole('heading', { name: 'Today\'s Habits' })).toBeVisible();

    // Go back home
    await page.goto('/');

    // Test navigation to checkin
    await page.getByRole('link', { name: 'Daily Muhasabah' }).click();
    await expect(page).toHaveURL('/checkin');
    await expect(page.getByRole('heading', { name: 'Daily Muhasabah' })).toBeVisible();
  });

  test('should display home page content correctly', async ({ page }) => {
    await page.goto('/');

    // Check welcome section
    await expect(page.getByText('Welcome to Sakinah')).toBeVisible();
    await expect(page.getByText('Your personal journey to spiritual purification')).toBeVisible();

    // Check feature highlights
    await expect(page.getByRole('heading', { name: 'Privacy-First' })).toBeVisible();
    await expect(page.getByText('All your data stays private between you and Allah')).toBeVisible();

    await expect(page.getByRole('heading', { name: 'Shariah-Compliant' })).toBeVisible();
    await expect(page.getByText('Based on authentic Quran & Sunnah teachings')).toBeVisible();

    await expect(page.getByRole('heading', { name: 'Soul Purification' })).toBeVisible();
    await expect(page.getByText('Gentle guidance for your spiritual growth')).toBeVisible();

    // Check dashboard preview section
    await expect(page.getByText('Dashboard Preview')).toBeVisible();
    await expect(page.getByText('See what your spiritual journey looks like')).toBeVisible();

    // Check prayer times component - use more specific selector for home page
    await expect(page.locator('.font-medium.text-sm.text-fg').filter({ hasText: 'Fajr' }).first()).toBeVisible();
    await expect(page.locator('.font-medium.text-sm').filter({ hasText: 'Dhuhr' }).first()).toBeVisible();
    await expect(page.locator('.font-medium.text-sm').filter({ hasText: 'Asr' }).first()).toBeVisible();
    await expect(page.locator('.font-medium.text-sm').filter({ hasText: 'Maghrib' }).first()).toBeVisible();
    await expect(page.locator('.font-medium.text-sm').filter({ hasText: 'Isha' }).first()).toBeVisible();

    // Check sample habit list
    await expect(page.getByText('Morning Dhikr')).toBeVisible();
    await expect(page.getByText('Evening Du\'a')).toBeVisible();

    // Check spiritual focus areas
    await expect(page.getByText('Choose Your Focus')).toBeVisible();
    await expect(page.getByText('Virtues to Cultivate:')).toBeVisible();
    await expect(page.getByText('Areas for Improvement:')).toBeVisible();

    // Check quick access links
    await expect(page.getByRole('link', { name: 'Content Library' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Start Tazkiyah' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Track Habits' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Daily Muhasabah' })).toBeVisible();

    // Check footer
    await expect(page.getByText('Privacy-first • Shariah-compliant • Designed for inner peace')).toBeVisible();
  });

  test('should display dashboard correctly', async ({ page }) => {
    await page.goto('/dashboard');

    // Check dashboard header
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
    await expect(page.getByText('Your spiritual progress today')).toBeVisible();

    // Check prayer times at top - use more specific selector
    await expect(page.locator('.font-medium.text-sm.text-fg').filter({ hasText: 'Fajr' }).first()).toBeVisible();
    await expect(page.getByText('5:30')).toBeVisible();

    // Check morning check-in card
    await expect(page.getByRole('heading', { name: 'Morning Check-in' })).toBeVisible();
    await expect(page.getByText('Set your spiritual intention')).toBeVisible();

    // Check evening check-in card
    await expect(page.getByRole('heading', { name: 'Evening Reflection' })).toBeVisible();
    await expect(page.getByText('Muhasabah & gratitude')).toBeVisible();

    // Check main dashboard sections
    await expect(page.getByRole('heading', { name: 'Today\'s Plan' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Today\'s Habits' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Morning Du\'a' })).toBeVisible();

    // Check quick actions section
    await expect(page.getByRole('heading', { name: 'Quick Actions' })).toBeVisible();
    await expect(page.locator('h4').filter({ hasText: 'Tazkiyah' }).first()).toBeVisible();
    await expect(page.locator('h4').filter({ hasText: 'Check-in' }).first()).toBeVisible();
    await expect(page.locator('h4').filter({ hasText: 'Quran' }).first()).toBeVisible();

    // Check navigation links in header - use exact match to avoid duplicates
    await expect(page.getByRole('link', { name: 'Habits', exact: true }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: 'Journal', exact: true }).first()).toBeVisible();
  });

  test('should handle check-in cards time-based behavior', async ({ page }) => {
    await page.goto('/dashboard');

    // Wait for dashboard to load
    await page.waitForTimeout(2000);

    // Morning check-in should always be available
    await expect(page.getByText('Set Today\'s Intention')).toBeVisible();

    // Evening check-in availability depends on time
    const currentHour = new Date().getHours();

    if (currentHour >= 18) {
      // After 6 PM, evening reflection should be available
      await expect(page.getByText('Complete Evening Reflection')).toBeVisible();
    } else {
      // Before 6 PM, should show "available after" message
      await expect(page.getByText('Available after Asr prayer (6 PM)')).toBeVisible();
      await expect(page.getByText('Focus on your current intentions for now')).toBeVisible();
    }
  });

  test('should navigate from dashboard check-in cards', async ({ page }) => {
    await page.goto('/dashboard');

    // Wait for dashboard to load
    await page.waitForTimeout(2000);

    // Click morning check-in
    await page.getByRole('link', { name: 'Set Today\'s Intention' }).click();
    await expect(page).toHaveURL('/checkin');

    // Go back to dashboard
    await page.goto('/dashboard');

    // If evening check-in is available, test it
    const currentHour = new Date().getHours();
    if (currentHour >= 18) {
      await page.getByRole('link', { name: 'Complete Evening Reflection' }).click();
      await expect(page).toHaveURL('/checkin');
    }
  });

  test('should handle responsive design elements', async ({ page }) => {
    // Test desktop view
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/');

    // All elements should be visible
    await expect(page.getByRole('heading', { name: 'Privacy-First' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Shariah-Compliant' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Soul Purification' })).toBeVisible();

    // Test mobile view
    await page.setViewportSize({ width: 375, height: 667 });

    // Content should still be accessible (though layout might change)
    await expect(page.getByText('Welcome to Sakinah')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Start Your Journey' })).toBeVisible();

    // Reset viewport
    await page.setViewportSize({ width: 1280, height: 720 });
  });

  test('should display Arabic content correctly', async ({ page }) => {
    await page.goto('/');

    // Check Arabic text is displayed - use more specific selector
    await expect(page.locator('[lang="ar"]').filter({ hasText: 'وَاصْبِرْ نَفْسَكَ مَعَ الَّذِينَ يَدْعُونَ رَبَّهُم' }).first()).toBeVisible();

    // Check translation is provided
    await expect(page.getByText('Keep yourself patiently with those who call on their Lord')).toBeVisible();

    // Check source attribution
    await expect(page.getByText('Surah Al-Kahf 18:28')).toBeVisible();

    // Go to checkin page and check Arabic content there
    await page.goto('/checkin');
    await expect(page.getByText('حاسبوا أنفسكم قبل أن تحاسبوا')).toBeVisible();
    await expect(page.getByText('إِنَّ اللَّهَ لَا يُغَيِّرُ مَا بِقَوْمٍ')).toBeVisible();
  });
});