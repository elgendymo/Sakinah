import { test, expect, Page } from '@playwright/test';

test.describe('Tazkiyah Onboarding Survey Flow', () => {

  test.describe('Authentication and Signup', () => {
    test('should complete email/password signup with minimal PII', async ({ page }) => {
      await page.goto('/auth/signup');

      // Verify signup form has correct fields
      await expect(page.getByRole('heading', { name: /Join Sakinah/i })).toBeVisible();

      // Fill out minimal PII - first name and gender
      await page.getByLabel(/First Name/i).fill('Ahmad');

      // Select gender from dropdown (not text input)
      await page.getByLabel(/Gender/i).selectOption('male');

      // Fill email and password
      await page.getByLabel(/Email/i).fill('test.user@example.com');
      await page.getByLabel(/Password/i).fill('SecurePass123!');

      // Submit form
      await page.getByRole('button', { name: /Create Account/i }).click();

      // Should redirect to welcome phase after successful registration
      await expect(page).toHaveURL('/onboarding/welcome');
      await expect(page.getByText(/Welcome|Tazkiyah|استبيان قراءة النفس/i)).toBeVisible();
    });

    test('should validate email format', async ({ page }) => {
      await page.goto('/auth/signup');

      // Enter invalid email
      await page.getByLabel(/Email/i).fill('invalid-email');
      await page.getByLabel(/Password/i).fill('SecurePass123!');
      await page.getByRole('button', { name: /Sign Up/i }).click();

      // Should show validation error
      await expect(page.getByText(/valid email|invalid email/i)).toBeVisible();
    });

    test('should validate password requirements', async ({ page }) => {
      await page.goto('/auth/signup');

      // Enter short password
      await page.getByLabel(/Email/i).fill('test@example.com');
      await page.getByLabel(/Password/i).fill('short');
      await page.getByRole('button', { name: /Sign Up/i }).click();

      // Should show password error
      await expect(page.getByText(/at least 8 characters|password.*8/i)).toBeVisible();
    });

    test('should allow registration without first name', async ({ page }) => {
      await page.goto('/auth/signup');

      // Skip first name field (optional)
      await page.getByLabel(/Gender/i).selectOption('female');
      await page.getByLabel(/Email/i).fill('anon@example.com');
      await page.getByLabel(/Password/i).fill('SecurePass123!');

      await page.getByRole('button', { name: /Sign Up/i }).click();

      // Should still proceed to welcome
      await expect(page).toHaveURL('/onboarding/welcome');
    });
  });

  test.describe('Survey Phase Progression', () => {
    // Helper to complete signup and reach survey
    async function signupAndReachSurvey(page: Page) {
      await page.goto('/auth/signup');
      await page.getByLabel(/First Name/i).fill('Test User');
      await page.getByLabel(/Gender/i).selectOption('male');
      await page.getByLabel(/Email/i).fill(`test${Date.now()}@example.com`);
      await page.getByLabel(/Password/i).fill('SecurePass123!');
      await page.getByRole('button', { name: /Sign Up/i }).click();
      await page.waitForURL('/onboarding/welcome');
    }

    test('should show welcome phase with correct content', async ({ page }) => {
      await signupAndReachSurvey(page);

      // Check welcome content - focused on Tazkiyah and habit plans
      await expect(page.getByText(/Tazkiyah|تزكية/)).toBeVisible();
      await expect(page.getByText(/habit.*plan|spiritual.*development/i)).toBeVisible();

      // Check progress indicator - Step 1 of 4
      await expect(page.getByText(/Step 1|1.*4|25%/)).toBeVisible();

      // Should have continue button
      await expect(page.getByRole('button', { name: /Continue|Begin|Start/i })).toBeVisible();
    });

    test('should progress through Phase 1 - Inner Heart Diseases', async ({ page }) => {
      await signupAndReachSurvey(page);

      // Click continue from welcome
      await page.getByRole('button', { name: /Continue|Begin/i }).click();
      await expect(page).toHaveURL('/onboarding/phase1');

      // Verify Phase 1 questions are present (4 questions)
      await expect(page.getByText(/envy|حسد/i)).toBeVisible();
      await expect(page.getByText(/arrogance|كبر|pride/i)).toBeVisible();
      await expect(page.getByText(/self.*deception|غرور/i)).toBeVisible();
      await expect(page.getByText(/lust|شهوة/i)).toBeVisible();

      // Check bilingual display
      const questionCards = page.locator('[data-testid*="question"]');
      await expect(questionCards).toHaveCount(4);

      // Answer all 4 questions with Likert scale
      await page.locator('[data-testid="envy-score-3"]').click();
      await page.locator('[data-testid="arrogance-score-2"]').click();
      await page.locator('[data-testid="self-deception-score-4"]').click();
      await page.locator('[data-testid="lust-score-1"]').click();

      // Optional: Add notes to a question
      await page.getByPlaceholder(/note|reflection/i).first().fill('Personal reflection on envy');

      // Progress should update to 50%
      await expect(page.getByText(/50%|Step 2/)).toBeVisible();

      // Continue to Phase 2
      await page.getByRole('button', { name: /Continue|Next/i }).click();
      await expect(page).toHaveURL('/onboarding/phase2');
    });

    test('should progress through Phase 2 - Behavioral Manifestations', async ({ page }) => {
      await signupAndReachSurvey(page);

      // Navigate to Phase 2
      await page.getByRole('button', { name: /Continue/i }).click();
      await page.waitForURL('/onboarding/phase1');

      // Quick fill Phase 1
      await page.locator('[data-testid="envy-score-3"]').click();
      await page.locator('[data-testid="arrogance-score-2"]').click();
      await page.locator('[data-testid="self-deception-score-4"]').click();
      await page.locator('[data-testid="lust-score-1"]').click();
      await page.getByRole('button', { name: /Continue/i }).click();

      await page.waitForURL('/onboarding/phase2');

      // Verify Phase 2 questions (7 questions)
      await expect(page.getByText(/anger|غضب/i)).toBeVisible();
      await expect(page.getByText(/malice|حقد/i)).toBeVisible();
      await expect(page.getByText(/backbiting|غيبة/i)).toBeVisible();
      await expect(page.getByText(/suspicion|سوء الظن/i)).toBeVisible();
      await expect(page.getByText(/love.*dunya|حب الدنيا/i)).toBeVisible();
      await expect(page.getByText(/laziness|كسل/i)).toBeVisible();
      await expect(page.getByText(/despair|يأس/i)).toBeVisible();

      // Answer all 7 questions
      await page.locator('[data-testid="anger-score-4"]').click();
      await page.locator('[data-testid="malice-score-2"]').click();
      await page.locator('[data-testid="backbiting-score-3"]').click();
      await page.locator('[data-testid="suspicion-score-2"]').click();
      await page.locator('[data-testid="love-of-dunya-score-5"]').click();
      await page.locator('[data-testid="laziness-score-3"]').click();
      await page.locator('[data-testid="despair-score-1"]').click();

      // Progress should update to 75%
      await expect(page.getByText(/75%|Step 3/)).toBeVisible();

      // Continue to Reflection
      await page.getByRole('button', { name: /Continue/i }).click();
      await expect(page).toHaveURL('/onboarding/reflection');
    });

    test('should complete reflection phase with validation', async ({ page }) => {
      await signupAndReachSurvey(page);

      // Navigate quickly to reflection phase
      await navigateToReflection(page);

      // Verify reflection questions
      await expect(page.getByText(/strongest.*struggle/i)).toBeVisible();
      await expect(page.getByText(/daily.*habit.*develop/i)).toBeVisible();

      // Test minimum character validation (10 chars)
      await page.getByLabel(/strongest.*struggle/i).fill('Too short');
      await page.getByRole('button', { name: /Continue/i }).click();
      await expect(page.getByText(/at least 10 characters/i)).toBeVisible();

      // Test maximum character validation (500 chars)
      const longText = 'a'.repeat(501);
      await page.getByLabel(/strongest.*struggle/i).fill(longText);
      await expect(page.getByText(/maximum.*500/i)).toBeVisible();

      // Fill with valid responses
      await page.getByLabel(/strongest.*struggle/i).fill(
        'My strongest struggle is with anger management, especially in stressful situations at work.'
      );
      await page.getByLabel(/daily.*habit/i).fill(
        'I want to develop a consistent morning dhikr practice to start my day with remembrance of Allah.'
      );

      // Should show AI preview
      await expect(page.getByText(/personalized.*habit|todo.*list/i)).toBeVisible();
      await expect(page.getByText(/takhl|تخلية/i)).toBeVisible();
      await expect(page.getByText(/tahl|تحلية/i)).toBeVisible();

      // Progress should be 100%
      await expect(page.getByText(/100%|Step 4|Complete/i)).toBeVisible();

      // Continue to results
      await page.getByRole('button', { name: /View Results|Continue/i }).click();
      await expect(page).toHaveURL('/onboarding/results');
    });

    test('should display comprehensive results dashboard', async ({ page }) => {
      await signupAndReachSurvey(page);
      await navigateToResults(page);

      // Check radar chart visualization
      await expect(page.locator('[data-testid="radar-chart"]')).toBeVisible();

      // Check disease categorization
      await expect(page.getByText(/critical|high.*risk/i)).toBeVisible();
      await expect(page.getByText(/moderate.*risk/i)).toBeVisible();
      await expect(page.getByText(/strengths/i)).toBeVisible();

      // Check Takhliyah recommendations (for high scores)
      await expect(page.getByText(/takhliyah|removal|purification/i)).toBeVisible();

      // Check Tahliyah recommendations (for low scores)
      await expect(page.getByText(/tahliyah|virtue|cultivation/i)).toBeVisible();

      // Check personalized habits section
      await expect(page.getByText(/personalized.*habit|recommended.*practice/i)).toBeVisible();

      // Check export options
      await expect(page.getByRole('button', { name: /Export.*PDF/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /Export.*JSON/i })).toBeVisible();

      // Check integration with dashboard
      await expect(page.getByRole('link', { name: /Dashboard|Continue.*Journey/i })).toBeVisible();
    });
  });

  test.describe('Phase Skipping Prevention', () => {
    async function signupAndReachSurvey(page: Page) {
      await page.goto('/auth/signup');
      await page.getByLabel(/First Name/i).fill('Test User');
      await page.getByLabel(/Gender/i).selectOption('male');
      await page.getByLabel(/Email/i).fill(`test${Date.now()}@example.com`);
      await page.getByLabel(/Password/i).fill('SecurePass123!');
      await page.getByRole('button', { name: /Sign Up/i }).click();
      await page.waitForURL('/onboarding/welcome');
    }

    test('should prevent direct navigation to Phase 2', async ({ page }) => {
      await signupAndReachSurvey(page);

      // Try to navigate directly to Phase 2
      await page.goto('/onboarding/phase2');

      // Should redirect back to Phase 1
      await expect(page).toHaveURL('/onboarding/phase1');
      await expect(page.getByText(/complete.*phase.*1.*first/i)).toBeVisible();
    });

    test('should prevent skipping to reflection phase', async ({ page }) => {
      await signupAndReachSurvey(page);

      // Try to navigate directly to reflection
      await page.goto('/onboarding/reflection');

      // Should redirect to current incomplete phase
      await expect(page).toHaveURL(/phase1|phase2/);
    });

    test('should prevent accessing results before completion', async ({ page }) => {
      await signupAndReachSurvey(page);

      // Try to navigate directly to results
      await page.goto('/onboarding/results');

      // Should redirect to incomplete phase
      await expect(page).not.toHaveURL('/onboarding/results');
      await expect(page.getByText(/complete.*survey.*first/i)).toBeVisible();
    });
  });

  test.describe('Auto-save and State Persistence', () => {
    test('should auto-save responses immediately', async ({ page }) => {
      const uniqueEmail = `test${Date.now()}@example.com`;

      // Complete signup
      await page.goto('/auth/signup');
      await page.getByLabel(/Email/i).fill(uniqueEmail);
      await page.getByLabel(/Password/i).fill('SecurePass123!');
      await page.getByLabel(/Gender/i).selectOption('male');
      await page.getByRole('button', { name: /Sign Up/i }).click();
      await page.waitForURL('/onboarding/welcome');

      // Navigate to Phase 1
      await page.getByRole('button', { name: /Continue/i }).click();

      // Answer one question
      await page.locator('[data-testid="envy-score-4"]').click();

      // Check localStorage for auto-save
      const savedState = await page.evaluate(() => {
        return localStorage.getItem('sakinah_survey_state');
      });
      expect(savedState).toBeTruthy();
      expect(JSON.parse(savedState!)).toMatchObject({
        currentPhase: 1,
        responses: {
          phase1: {
            envyScore: 4
          }
        }
      });
    });

    test('should restore survey progress on page reload', async ({ page }) => {
      const uniqueEmail = `test${Date.now()}@example.com`;

      // Complete signup and start survey
      await page.goto('/auth/signup');
      await page.getByLabel(/Email/i).fill(uniqueEmail);
      await page.getByLabel(/Password/i).fill('SecurePass123!');
      await page.getByLabel(/Gender/i).selectOption('female');
      await page.getByRole('button', { name: /Sign Up/i }).click();
      await page.waitForURL('/onboarding/welcome');

      // Progress to Phase 1 and answer some questions
      await page.getByRole('button', { name: /Continue/i }).click();
      await page.locator('[data-testid="envy-score-3"]').click();
      await page.locator('[data-testid="arrogance-score-5"]').click();
      await page.getByPlaceholder(/note/i).first().fill('Test note');

      // Reload the page
      await page.reload();

      // Should restore to Phase 1 with saved answers
      await expect(page).toHaveURL('/onboarding/phase1');
      await expect(page.locator('[data-testid="envy-score-3"][aria-checked="true"]')).toBeVisible();
      await expect(page.locator('[data-testid="arrogance-score-5"][aria-checked="true"]')).toBeVisible();
      await expect(page.getByPlaceholder(/note/i).first()).toHaveValue('Test note');
    });

    test('should handle session expiration gracefully', async ({ page, context }) => {
      const uniqueEmail = `test${Date.now()}@example.com`;

      // Complete signup
      await page.goto('/auth/signup');
      await page.getByLabel(/Email/i).fill(uniqueEmail);
      await page.getByLabel(/Password/i).fill('SecurePass123!');
      await page.getByLabel(/Gender/i).selectOption('male');
      await page.getByRole('button', { name: /Sign Up/i }).click();
      await page.waitForURL('/onboarding/welcome');

      // Start survey
      await page.getByRole('button', { name: /Continue/i }).click();
      await page.locator('[data-testid="envy-score-3"]').click();

      // Clear auth cookies to simulate session expiration
      await context.clearCookies();

      // Try to continue survey
      await page.getByRole('button', { name: /Continue/i }).click();

      // Should redirect to login with message
      await expect(page).toHaveURL('/auth/login');
      await expect(page.getByText(/session.*expired|please.*login/i)).toBeVisible();

      // After re-login, should restore progress
      await page.getByLabel(/Email/i).fill(uniqueEmail);
      await page.getByLabel(/Password/i).fill('SecurePass123!');
      await page.getByRole('button', { name: /Login/i }).click();

      // Should return to Phase 1 with saved data
      await expect(page).toHaveURL('/onboarding/phase1');
      await expect(page.locator('[data-testid="envy-score-3"][aria-checked="true"]')).toBeVisible();
    });
  });

  test.describe('Visual Design and UX', () => {
    test('should display Islamic design elements', async ({ page }) => {
      await page.goto('/onboarding/welcome');

      // Check for Islamic visual elements
      await expect(page.locator('[data-islamic-pattern]')).toBeVisible();

      // Check for appropriate color scheme
      const backgroundColor = await page.evaluate(() => {
        return window.getComputedStyle(document.body).backgroundColor;
      });
      expect(backgroundColor).toMatch(/rgb|rgba/);
    });

    test('should support RTL for Arabic content', async ({ page }) => {
      await page.goto('/onboarding/phase1');

      // Check Arabic content has RTL direction
      const arabicElements = page.locator('[lang="ar"]');
      const count = await arabicElements.count();

      for (let i = 0; i < count; i++) {
        const dir = await arabicElements.nth(i).evaluate(el =>
          window.getComputedStyle(el).direction
        );
        expect(dir).toBe('rtl');
      }
    });

    test('should have smooth animations and transitions', async ({ page }) => {
      await page.goto('/onboarding/welcome');

      // Check for transition styles
      const hasTransitions = await page.evaluate(() => {
        const elements = document.querySelectorAll('*');
        return Array.from(elements).some(el => {
          const styles = window.getComputedStyle(el);
          return styles.transition !== 'none' || styles.animation !== 'none';
        });
      });

      expect(hasTransitions).toBeTruthy();
    });

    test('should be responsive on mobile', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });

      await page.goto('/onboarding/welcome');

      // Check content is visible and accessible
      await expect(page.getByText(/Tazkiyah/i)).toBeVisible();
      await expect(page.getByRole('button', { name: /Continue/i })).toBeVisible();

      // Navigate to Phase 1
      await page.getByRole('button', { name: /Continue/i }).click();

      // Question cards should stack vertically on mobile
      const questionCards = page.locator('[data-testid*="question"]');
      const firstCard = questionCards.first();
      const secondCard = questionCards.nth(1);

      const firstBox = await firstCard.boundingBox();
      const secondBox = await secondCard.boundingBox();

      // Second card should be below first card (vertical stacking)
      expect(secondBox!.y).toBeGreaterThan(firstBox!.y + firstBox!.height);
    });
  });

  test.describe('Export Functionality', () => {
    test('should export results as PDF', async ({ page, context }) => {
      // Complete full survey flow
      await completeFullSurvey(page);

      // Set up download promise before clicking
      const downloadPromise = page.waitForEvent('download');

      // Click PDF export
      await page.getByRole('button', { name: /Export.*PDF/i }).click();

      // Wait for download
      const download = await downloadPromise;

      // Verify download
      expect(download.suggestedFilename()).toMatch(/tazkiyah.*results.*\.pdf/i);
    });

    test('should export results as JSON', async ({ page }) => {
      // Complete full survey flow
      await completeFullSurvey(page);

      // Set up download promise
      const downloadPromise = page.waitForEvent('download');

      // Click JSON export
      await page.getByRole('button', { name: /Export.*JSON/i }).click();

      // Wait for download
      const download = await downloadPromise;

      // Verify download and content
      expect(download.suggestedFilename()).toMatch(/tazkiyah.*results.*\.json/i);

      // Read and verify JSON structure
      const content = await download.path().then(path =>
        require('fs').readFileSync(path!, 'utf8')
      );
      const data = JSON.parse(content);

      expect(data).toHaveProperty('diseaseScores');
      expect(data).toHaveProperty('personalizedHabits');
      expect(data).toHaveProperty('tazkiyahPlan');
    });
  });

  test.describe('Integration with Dashboard', () => {
    test('should display survey results in dashboard after completion', async ({ page }) => {
      // Complete full survey
      await completeFullSurvey(page);

      // Navigate to dashboard
      await page.getByRole('link', { name: /Dashboard|Continue/i }).click();
      await expect(page).toHaveURL('/dashboard');

      // Check for survey results card
      await expect(page.getByText(/Survey Results|Tazkiyah Assessment/i)).toBeVisible();

      // Check for personalized habits integration
      await expect(page.getByText(/Personalized Habits/i)).toBeVisible();

      // Check for Tazkiyah plan integration
      await expect(page.getByText(/Tazkiyah Plan|Spiritual Development/i)).toBeVisible();
    });
  });
});

// Helper functions
async function navigateToReflection(page: Page) {
  // Navigate from welcome to reflection quickly
  await page.getByRole('button', { name: /Continue/i }).click();

  // Quick fill Phase 1
  await page.locator('[data-testid="envy-score-3"]').click();
  await page.locator('[data-testid="arrogance-score-2"]').click();
  await page.locator('[data-testid="self-deception-score-4"]').click();
  await page.locator('[data-testid="lust-score-1"]').click();
  await page.getByRole('button', { name: /Continue/i }).click();

  // Quick fill Phase 2
  await page.locator('[data-testid="anger-score-4"]').click();
  await page.locator('[data-testid="malice-score-2"]').click();
  await page.locator('[data-testid="backbiting-score-3"]').click();
  await page.locator('[data-testid="suspicion-score-2"]').click();
  await page.locator('[data-testid="love-of-dunya-score-5"]').click();
  await page.locator('[data-testid="laziness-score-3"]').click();
  await page.locator('[data-testid="despair-score-1"]').click();
  await page.getByRole('button', { name: /Continue/i }).click();

  await page.waitForURL('/onboarding/reflection');
}

async function navigateToResults(page: Page) {
  await navigateToReflection(page);

  // Fill reflection
  await page.getByLabel(/strongest.*struggle/i).fill(
    'My strongest struggle is with anger management in stressful situations.'
  );
  await page.getByLabel(/daily.*habit/i).fill(
    'I want to develop a consistent morning dhikr practice daily.'
  );

  await page.getByRole('button', { name: /View Results|Continue/i }).click();
  await page.waitForURL('/onboarding/results');
}

async function completeFullSurvey(page: Page) {
  // Signup
  await page.goto('/auth/signup');
  await page.getByLabel(/First Name/i).fill('Test User');
  await page.getByLabel(/Gender/i).selectOption('male');
  await page.getByLabel(/Email/i).fill(`test${Date.now()}@example.com`);
  await page.getByLabel(/Password/i).fill('SecurePass123!');
  await page.getByRole('button', { name: /Sign Up/i }).click();
  await page.waitForURL('/onboarding/welcome');

  // Complete all phases and reach results
  await navigateToResults(page);
}