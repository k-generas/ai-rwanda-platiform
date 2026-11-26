import { expect, test } from '@playwright/test';

test.describe('AI Education Rwanda — E2E Functional & Security Flows', () => {
  test('Public platform navigation, EN/RW bilingual toggle, and zero uncaught runtime errors', async ({ page }) => {
    const pageErrors: string[] = [];
    const serverErrors: string[] = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));
    page.on('response', (res) => {
      if (res.status() >= 500) {
        serverErrors.push(`${res.status()} ${res.url()}`);
      }
    });

    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Learn AI. Apply AI. Build with AI.' })).toBeVisible();

    // Bilingual switch EN -> RW -> EN
    await page.getByRole('button', { name: 'Kinyarwanda' }).first().click();
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/AI/i);
    await expect(page.getByRole('navigation', { name: 'Primary navigation' })).toContainText(/Amasomo/i);
    await page.getByRole('button', { name: 'English' }).first().click();
    await expect(page.getByRole('heading', { name: 'Learn AI. Apply AI. Build with AI.' })).toBeVisible();

    // Navigate through core public routes via Header
    await page.getByRole('navigation', { name: 'Primary navigation' }).getByRole('button', { name: 'Courses' }).click();
    await expect(page.getByText('28-Day Practical AI Challenge').first()).toBeVisible();

    await page.getByRole('navigation', { name: 'Primary navigation' }).getByRole('button', { name: 'Events' }).click();
    await expect(page.getByRole('heading').first()).toBeVisible();

    await page.getByRole('navigation', { name: 'Primary navigation' }).getByRole('button', { name: 'Projects' }).click();
    await expect(page.getByRole('heading').first()).toBeVisible();

    await page.getByRole('navigation', { name: 'Primary navigation' }).getByRole('button', { name: 'About' }).click();
    await expect(page.getByRole('heading').first()).toBeVisible();

    expect(pageErrors, `Unexpected page errors: ${pageErrors.join('; ')}`).toEqual([]);
    expect(serverErrors, `Unexpected 5xx responses: ${serverErrors.join('; ')}`).toEqual([]);
  });

  test('Mobile navigation drawer works cleanly without horizontal overflow at 375px', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');
    await expect(page.getByRole('button', { name: 'Toggle navigation menu' })).toBeVisible();
    await page.getByRole('button', { name: 'Toggle navigation menu' }).click();
    await page
      .getByRole('dialog', { name: 'Navigation menu' })
      .getByRole('button', { name: 'Courses', exact: true })
      .click();
    await expect(page.getByText('28-Day Practical AI Challenge').first()).toBeVisible();

    const hasHorizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth + 2
    );
    expect(hasHorizontalOverflow).toBe(false);
  });

  test('AuthModal renders Google Sign-In, Email Sign-In, Create Account, and Password Recovery', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Sign In' }).first().click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Continue with Google' })).toBeVisible();

    // Switch to Create Account
    await dialog.getByRole('button', { name: 'Create Account' }).click();
    await expect(dialog.getByPlaceholder('e.g. Aline Uwase')).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Create Account with Email' })).toBeVisible();

    // Switch to Password Recovery
    await dialog.getByRole('button', { name: 'Recover' }).click();
    await expect(dialog.getByRole('button', { name: 'Send Password Reset Link' })).toBeVisible();

    // Close modal cleanly
    await dialog.getByRole('button', { name: 'Close sign-in dialog' }).click();
    await expect(dialog).not.toBeVisible();
  });

  test('Course sample vs locked lesson enforcement via UI and direct deep-link URLs', async ({ page }) => {
    // 1. Direct deep-link to free Sample Day 1 opens full lesson reader + persistent navigator rail
    await page.goto('/?course=challenge-28&day=1');
    await expect(page.getByText(/Free Sample Lesson/i)).toBeVisible();
    await expect(
      page.getByRole('heading', { name: /Day 1: Introduction to Artificial Intelligence/i })
    ).toBeVisible();
    await expect(page.getByRole('button', { name: 'Copy template' })).toBeVisible();
    await expect(page.getByRole('complementary')).toContainText(/Navigator/i);
    await expect(page.getByRole('button', { name: 'W1' })).toBeVisible();

    // 2. Direct deep-link to paid locked Day 3 refuses full content and displays unlock gate
    await page.goto('/?course=challenge-28&day=3');
    await expect(page.getByText(/Sample lessons are open for free preview/i)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign in to enroll' })).toBeVisible();
    await expect(page.getByText('Reusable Prompt / Workflow Template')).not.toBeVisible();

    // 3. Projects explorer displays 6 core projects including Independent Final Project
    await page.goto('/');
    await page.getByRole('navigation', { name: 'Primary navigation' }).getByRole('button', { name: 'Projects' }).click();
    await expect(page.getByRole('heading', { name: /Six Core Course Projects/i })).toBeVisible();
    await expect(page.getByText('Independent Final Project')).toBeVisible();
  });

  test('Public Certificate Verifier validates RW-AI-2026-0042 and rejects invalid IDs', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Verify certificate', exact: true }).click();

    const input = page.getByLabel('Certificate ID');
    await expect(input).toBeVisible();
    await expect(page.getByText('Verified Valid Credential')).toBeVisible();
    await expect(page.getByText('Claudine Mukamana')).toBeVisible();
    await expect(page.getByText('RW-AI-2026-0042').first()).toBeVisible();

    await input.fill('RW-INVALID-9999');
    await page.getByRole('button', { name: 'Verify Certificate', exact: true }).click();
    await expect(page.getByText(/No Matching Certificate Found/i)).toBeVisible();
  });

  test('Unauthorized access to Founder/Admin APIs and Control Center UI is blocked', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Superadmin Control Center')).not.toBeVisible();

    const adminMetricsStatus = await page.evaluate(async () => {
      const r = await fetch('/api/admin/metrics');
      return r.status;
    });
    expect(adminMetricsStatus).toBe(401);

    const paymentVerifyStatus = await page.evaluate(async () => {
      const r = await fetch('/api/payments/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      return r.status;
    });
    expect(paymentVerifyStatus).toBe(401);

    const uploadStatus = await page.evaluate(async () => {
      const r = await fetch('/api/uploads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      return r.status;
    });
    expect(uploadStatus).toBe(401);
  });
});
