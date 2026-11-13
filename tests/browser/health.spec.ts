import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

async function choose(page: Page, label: string, query: string): Promise<void> {
  const input = page.getByRole('combobox', { name: label, exact: true });
  await input.fill(query);
  await page.getByRole('listbox', { name: `Pilihan ${label.toLocaleLowerCase('id-ID')}`, exact: true }).getByRole('option').filter({ hasText: query }).first().click();
}
async function openHealth(page: Page): Promise<void> {
  await page.goto('/dashboard/dampak-kesehatan');
  await expect(page.locator('.health-dashboard')).toBeVisible();
}
const firstMetric = (page: Page) => page.locator('.health-metrics .metric').first();
const browserErrors = new WeakMap<Page, string[]>();
test.beforeEach(async ({ page }) => {
  const errors: string[] = [];
  browserErrors.set(page, errors);
  page.on('pageerror', error => errors.push(error.message));
  await page.route('https://server.arcgisonline.com/**', route => route.abort());
});
test.afterEach(({ page }) => { expect(browserErrors.get(page)).toEqual([]); });


test('health direct route, filters and outcome selection work', async ({ page }) => {
  await openHealth(page);
  await expect(page).toHaveTitle('DA2026_Dashboard_NasiBakarCumiHitamPakKris_AlfinJayadi');
  await expect(page.locator('#dashboard-filters')).not.toHaveAttribute('open');
  await expect(page.locator('.health-dashboard canvas')).toHaveCount(7);
  await expect(firstMetric(page).locator('strong')).toHaveText('720,23');
  await expect(page.locator('.health-scope')).toContainText('27 faskes pilihan');
  await choose(page, 'Indikator kesehatan', 'Kematian');
  await expect(firstMetric(page).getByRole('heading')).toHaveText('Kematian');
  await expect(firstMetric(page).locator('strong')).toHaveText('53,66');
  const input = page.getByRole('combobox', { name: 'Indikator kesehatan', exact: true });
  await input.fill('PPOK');
  await input.press('Escape');
  await expect(input).toHaveValue('Kematian');
  await expect(page.getByText('Data & Cara Membaca', { exact: true })).toHaveCount(0);
  await expect(page.locator('.health-dashboard footer')).toHaveCount(0);
  await page.reload();
  await expect(page.locator('.health-dashboard')).toBeVisible();
  await expect(page.locator('#dashboard-filters')).not.toHaveAttribute('open');
});

test('shared selections survive routes; pollutant and QC update charts without replacing canvases', async ({ page }) => {
  await page.route('https://server.arcgisonline.com/**', route => route.abort());
  await page.goto('/dashboard');
  await expect(page.locator('.doughnut-center strong')).toHaveText('26');
  await page.locator('#dashboard-filters summary').click();
  await choose(page, 'Wilayah', 'Jakarta');
  await page.getByRole('link', { name: 'Dampak Kesehatan', exact: true }).click();
  await expect(page.locator('#filter-summary')).toContainText('Jakarta');
  await expect(page.locator('.health-scope')).toContainText('3 faskes pilihan');
  await expect(page.locator('#dashboard-filters')).not.toHaveAttribute('open');
  const canvas = page.locator('[data-chart="health-exposure"]');
  await canvas.evaluate(node => { node.setAttribute('data-identity', 'retained'); });
  const admissions = await firstMetric(page).locator('strong').textContent();
  await page.locator('#dashboard-filters summary').click();
  await page.getByRole('button', { name: 'NO2', exact: true }).click();
  await expect(page.locator('#filter-summary')).toContainText('NO2');
  await expect(page.locator('.health-scope')).toContainText('NO2');
  await page.getByLabel(/SUSPECT/).check();
  await expect(page.locator('#filter-summary')).toContainText('VALID + SUSPECT');
  await expect(page.locator('.health-scope')).toContainText('VALID + SUSPECT');
  await expect(firstMetric(page).locator('strong')).toHaveText(admissions ?? '');
  await expect(canvas).toHaveAttribute('data-identity', 'retained');
  await page.getByRole('link', { name: 'Ikhtisar Nasional', exact: true }).click();
  await expect(page.locator('.doughnut-center strong')).toHaveText('3');
  await expect(page.locator('#filter-summary')).toContainText('NO2');
  await page.goBack();
  await expect(page.locator('#filter-summary')).toContainText('Jakarta');
});

test('converted gas loggers show exposures while sparse stations retain explicit missing analyses', async ({ page }) => {
  await openHealth(page);
  await page.locator('#dashboard-filters summary').click();
  await choose(page, 'Stasiun', 'AQMS-BJB-01');
  await expect(page.locator('[data-chart="health-exposure"]')).toBeVisible();
  await page.getByRole('button', { name: 'CO', exact: true }).click();
  await expect(page.locator('.health-quality')).not.toContainText('satuan logger');
  await expect(page.locator('.health-coverage')).not.toContainText('(0%)');
  await expect(firstMetric(page).locator('strong')).not.toHaveText('—');
  await expect(page.locator('[data-chart="health-exposure"]')).toBeVisible();
  await expect(page.locator('[data-chart="health-admissions"]')).toBeVisible();
  await expect(page.locator('[data-chart="health-lag"]')).toBeVisible();
  await choose(page, 'Stasiun', 'AQMS-JMB-02');
  await expect(page.locator('.health-coverage')).toContainText('(0%)');
  await choose(page, 'Stasiun', 'AQMS-JKT-01');
  await expect(page.locator('[data-chart="health-exposure"]')).toBeVisible();
  await page.getByLabel('Tanggal mulai', { exact: true }).fill('2026-10-14');
  await page.getByLabel('Tanggal mulai', { exact: true }).blur();
  await expect(page.locator('[data-chart="health-lag"]')).not.toBeVisible();
  await expect(firstMetric(page).locator('strong')).not.toHaveText('—');
});

test('overview includes converted gas loggers without changing selected hospital coverage', async ({ page }) => {
  await page.goto('/dashboard');
  await expect(page.locator('.doughnut-center strong')).toHaveText('26');
  await page.locator('#dashboard-filters summary').click();
  await choose(page, 'Stasiun', 'AQMS-BJB-01');
  const hospital = page.locator('.metric').filter({ has: page.getByRole('heading', { name: 'Indeks Beban Hospital (Faskes)', exact: true }) }).locator('strong');
  const before = await hospital.textContent();
  await page.getByRole('button', { name: 'CO', exact: true }).click();
  await expect(page.locator('.doughnut-center strong')).toHaveText('1');
  await expect(page.getByText(/1 stasiun pilihan belum memiliki konversi logger CO/)).not.toBeVisible();
  await expect(hospital).toHaveText(before ?? '');
});

test('health errors offer a working retry and navigation removes the view', async ({ page }) => {
  test.setTimeout(60000);
  let fail = true;
  await page.route('**/data/health_exposure.json', route => fail ? route.fulfill({ status: 503, body: '{}' }) : route.continue());
  await page.goto('/dashboard/dampak-kesehatan');
  await expect(page.getByRole('alert')).toContainText('Data kesehatan belum dapat dimuat');
  fail = false;
  await page.getByRole('button', { name: 'Coba lagi', exact: true }).click();
  await expect(page.locator('.health-dashboard')).toBeVisible();
  await page.getByRole('link', { name: 'Pola Waktu', exact: true }).click();
  await expect(page.locator('.health-dashboard')).toHaveCount(0);
  await expect(page.locator('.feature-host canvas[data-chart^="health-"]')).toHaveCount(0);
  await expect(page.locator('.temporal-dashboard')).toBeVisible({ timeout: 60000 });
});

test('charts honor live reduced-motion changes and theme changes; normal updates finish animating', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openHealth(page);
  for (const canvas of await page.locator('.health-dashboard canvas').all()) await expect(canvas).toHaveAttribute('data-animation', 'complete');
  await page.getByRole('button', { name: 'Tema gelap', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await choose(page, 'Indikator kesehatan', 'Admisi PPOK');
  const animated = page.locator('[data-chart="health-admissions"]');
  await expect(animated).toHaveAttribute('data-animation', 'running');
  const visiblyChanges = await animated.evaluate(async node => {
    if (!(node instanceof HTMLCanvasElement)) throw new Error('Expected chart canvas');
    const frames: string[] = [];
    for (let i = 0; i < 4; i++) {
      await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
      frames.push(node.toDataURL());
    }
    return new Set(frames).size > 1;
  });
  expect(visiblyChanges).toBe(true);
  await expect(animated).toHaveAttribute('data-animation', 'complete');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(page.locator('[data-chart="health-admissions"]')).toHaveAttribute('data-animation', 'complete');
});

test('responsive layouts remain readable and fit the viewport in both themes', async ({ page }) => {
  await page.addInitScript(() => {
    const original = CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.fillText = function (text, x, y, maxWidth) {
      if (this.canvas.dataset['chart'] === 'health-age-comparison') {
        const previous: unknown = JSON.parse(this.canvas.dataset['paintedLabels'] ?? '[]');
        const labels: string[] = Array.isArray(previous) ? previous.filter((value): value is string => typeof value === 'string') : [];
        this.canvas.dataset['paintedLabels'] = JSON.stringify([...labels, text].slice(-50));
      }
      if (maxWidth === undefined) original.call(this, text, x, y);
      else original.call(this, text, x, y, maxWidth);
    };
  });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openHealth(page);
  for (const width of [1440, 1024, 768, 375, 320]) {
    await page.locator('[data-chart="health-age-comparison"]').evaluate(node => { node.setAttribute('data-painted-labels', '[]'); });
    await page.setViewportSize({ width, height: 1000 });
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await expect(page.locator('[data-chart="health-admissions"]')).toBeVisible();
    for (const label of ['Balita', 'Lansia', 'P1', 'P5']) await expect(page.locator('[data-chart="health-age-comparison"]')).toHaveAttribute('data-painted-labels', new RegExp(label));
    await page.screenshot({ path: `test-results/health-${width}-light.png`, fullPage: true });
  }
  await page.getByRole('button', { name: 'Tema gelap', exact: true }).click();
  await page.screenshot({ path: 'test-results/health-320-dark.png', fullPage: true });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({ path: 'test-results/health-1440-dark.png', fullPage: true });
});

test('repeated tab changes destroy charts and avoid detached canvas painting', async ({ page }) => {
  test.setTimeout(60000);
  await page.addInitScript(() => {
    const clear = CanvasRenderingContext2D.prototype.clearRect;
    CanvasRenderingContext2D.prototype.clearRect = function (x, y, width, height) {
      if (!this.canvas.isConnected) document.documentElement.dataset['detachedPaint'] = 'true';
      return clear.call(this, x, y, width, height);
    };
  });
  await openHealth(page);
  for (let i = 0; i < 4; i++) {
    await page.getByRole('link', { name: 'Pola Waktu', exact: true }).click();
    await expect(page.locator('.feature-host canvas[data-chart^="health-"]')).toHaveCount(0);
    await expect(page.locator('.temporal-dashboard')).toBeVisible({ timeout: i === 0 ? 60000 : 5000 });
    await page.getByRole('link', { name: 'Dampak Kesehatan', exact: true }).click();
    await expect(page.locator('.health-dashboard canvas')).toHaveCount(7);
  }
  await expect(page.locator('[data-chart="health-admissions"]')).toHaveAttribute('data-animation', 'complete');
  await expect(page.locator('html')).not.toHaveAttribute('data-detached-paint', 'true');
});

test('navigating away during a pending health request prevents stale rendering', async ({ page }) => {
  test.setTimeout(60000);
  let release = (): void => undefined;
  const gate = new Promise<void>(resolve => { release = resolve; });
  const intercepted = page.waitForRequest('**/data/health_exposure.json');
  await page.route('**/data/health_exposure.json', async route => {
    await gate;
    await route.continue().catch(() => undefined);
  });
  await page.goto('/dashboard/dampak-kesehatan');
  await intercepted;
  await page.getByRole('link', { name: 'Pola Waktu', exact: true }).click();
  release();
  await expect(page.getByRole('heading', { level: 2 })).toHaveText('Pola Waktu');
  await expect(page.locator('.health-dashboard')).toHaveCount(0);
  await expect(page.locator('.feature-host canvas[data-chart^="health-"]')).toHaveCount(0);
  await expect(page.locator('.temporal-dashboard')).toBeVisible({ timeout: 60000 });
  await page.unroute('**/data/health_exposure.json');
  await page.getByRole('link', { name: 'Dampak Kesehatan', exact: true }).click();
  await expect(page.locator('.health-dashboard')).toBeVisible();
});


test('case-study health panels react to dates without inventing sparse event results', async ({ page }) => {
  await openHealth(page);
  await expect(page.locator('[data-chart="health-age-comparison"]')).toBeVisible();
  await expect(page.locator('[data-chart="health-events"]')).toBeVisible();
  await expect(page.locator('[data-chart="health-strain"]')).toBeVisible();
  await expect(page.locator('.health-dashboard')).toContainText('Korelasi tertinggi pada jeda');
  await expect(page.locator('.health-dashboard')).toContainText('belum dideduplikasi');
  await page.locator('#dashboard-filters summary').click();
  await page.getByLabel('Tanggal mulai', { exact: true }).fill('2026-10-14');
  await page.getByLabel('Tanggal mulai', { exact: true }).blur();
  await expect(page.locator('[data-chart="health-age-comparison"]')).not.toBeVisible();
  await expect(page.locator('[data-chart="health-events"]')).not.toBeVisible();
  await expect(page.locator('[data-chart="health-strain"]')).toBeVisible();
});
