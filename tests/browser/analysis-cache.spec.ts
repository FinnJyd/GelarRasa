import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

test.setTimeout(90000);

async function observeCalculations(page: Page): Promise<void> {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.route('**/tile/**', route => route.abort());
  await page.addInitScript(() => {
    const NativeWorker = window.Worker;
    window.Worker = class extends NativeWorker {
      constructor(url: string | URL, options?: WorkerOptions) {
        super(url, options);
        const root = document.documentElement;
        root.dataset['calculationsStarted'] = String(Number(root.dataset['calculationsStarted'] ?? 0) + 1);
        this.addEventListener('message', () => {
          root.dataset['calculationsFinished'] = String(Number(root.dataset['calculationsFinished'] ?? 0) + 1);
        });
      }
    };
  });
}

test('opening the overview prepares both tabs once; navigation reuses them and a filter change prepares the next scope', async ({ page }) => {
  await observeCalculations(page);
  let requests = 0;
  page.on('request', request => { if (request.url().includes('/data/hourly/')) requests++; });
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('/dashboard');
  await expect(page.locator('.overview')).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('data-calculations-finished', '1', { timeout: 60000 });
  const initialRequests = requests;
  expect(initialRequests).toBeGreaterThan(1);
  for (const id of ['temporal', 'drivers', 'overview', 'temporal', 'drivers']) {
    await page.locator(`a[data-feature="${id}"]`).click();
    if (id !== 'overview') {
      await expect(page.locator('.analysis-dashboard')).toBeVisible();
      await expect(page.locator('.feature-host')).not.toHaveAttribute('aria-busy', 'true');
      await expect(page.getByText('Memuat analisis pilihan…', { exact: true })).toHaveCount(0);
    }
  }
  expect(requests).toBe(initialRequests);
  await expect(page.locator('html')).toHaveAttribute('data-calculations-started', '1');

  await page.locator('a[data-feature="overview"]').click();
  await page.locator('#dashboard-filters summary').click();
  await page.locator('#dashboard-filters').getByRole('button', { name: 'CO', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('data-calculations-finished', '2', { timeout: 60000 });
  const updatedRequests = requests;
  expect(updatedRequests).toBeGreaterThan(initialRequests);
  // Selecting the same effective scope must not restart either calculation.
  await page.locator('#dashboard-filters').getByRole('button', { name: 'CO', exact: true }).click();
  for (const id of ['temporal', 'drivers']) {
    await page.locator(`a[data-feature="${id}"]`).click();
    await expect(page.locator('.analysis-dashboard')).toHaveAttribute('data-pollutant', 'CO');
    await expect(page.locator('.feature-host')).not.toHaveAttribute('aria-busy', 'true');
  }
  await expect(page.locator('html')).toHaveAttribute('data-calculations-started', '2');
  expect(requests).toBe(updatedRequests);
  expect(errors).toEqual([]);
});

test('switching tabs during startup keeps the same pending calculation alive', async ({ page }) => {
  await observeCalculations(page);
  let release: () => void = () => { throw new Error('Startup gate missing'); };
  const gate = new Promise<void>(resolve => { release = resolve; });
  let manifests = 0;
  await page.route('**/data/hourly/manifest.json', async route => {
    manifests++; await gate; await route.continue();
  });
  await page.goto('/dashboard');
  await expect(page.locator('.overview')).toBeVisible();
  await expect.poll(() => manifests).toBe(1);
  try {
    for (const id of ['temporal', 'drivers', 'overview', 'temporal']) {
      await page.locator(`a[data-feature="${id}"]`).click();
      if (id !== 'overview') await expect(page.locator('.feature-host')).toHaveAttribute('aria-busy', 'true');
    }
    await expect(page.locator('html')).toHaveAttribute('data-calculations-started', '1');
    expect(manifests).toBe(1);
  } finally { release(); }
  await expect(page.locator('.temporal-dashboard')).toBeVisible({ timeout: 60000 });
  await expect(page.locator('.feature-host')).not.toHaveAttribute('aria-busy', 'true');
  await page.locator('a[data-feature="drivers"]').click();
  await expect(page.locator('.drivers-dashboard')).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('data-calculations-started', '1');
});
