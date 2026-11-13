import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

async function choose(page: Page, label: string, query: string): Promise<void> {
  await page.getByRole('combobox', { name: label, exact: true }).fill(query);
  await page.getByRole('listbox', { name: `Pilihan ${label.toLocaleLowerCase('id-ID')}`, exact: true }).getByRole('option').filter({ hasText: query }).first().click();
}
const value = async (page: Page, name: string): Promise<number> => Number(await page.locator(`[data-result="${name}"]`).getAttribute('data-value'));
async function open(page: Page): Promise<void> {
  await page.goto('/dashboard/rekomendasi-kebijakan');
  await expect(page.locator('.policy-dashboard')).toBeVisible();
  await expect(page.locator('.admission-simulation')).toBeVisible();
}
const errors = new WeakMap<Page, string[]>();
test.beforeEach(async ({ page }) => {
  const messages: string[] = []; errors.set(page, messages); page.on('pageerror', error => messages.push(error.message));
  await page.route('https://server.arcgisonline.com/**', route => route.abort());
});
test.afterEach(({ page }) => { expect(errors.get(page)).toEqual([]); });

test('scenario starts at the exact historical baseline and real inputs recalculate both quantities', async ({ page }) => {
  await open(page);
  await expect(page.locator('#dashboard-filters')).not.toHaveAttribute('open');
  expect(await value(page, 'baseline')).toBe(733191 / 1018);
  expect(await value(page, 'admissions')).toBe(await value(page, 'baseline'));
  expect(await value(page, 'load')).toBe((733191 / 1018) / 6280 * 100);
  await page.getByLabel('Kenaikan admisi (%)', { exact: true }).fill('25');
  await page.getByLabel('Tambahan tempat tidur', { exact: true }).fill('100');
  expect(await value(page, 'admissions')).toBeCloseTo((733191 / 1018) * 1.25, 10);
  expect(await value(page, 'load')).toBeCloseTo((733191 / 1018) * 1.25 / 6380 * 100, 10);
  await expect(page.locator('.admission-result').last()).toContainText('6.380');
  await page.getByRole('button', { name: 'P90', exact: true }).click();
  const baselineP90 = await value(page, 'baseline');
  expect(await value(page, 'admissions')).toBeCloseTo(baselineP90 * 1.25, 10);
  await page.getByRole('button', { name: 'Reset skenario', exact: true }).click();
  expect(await value(page, 'admissions')).toBe(733191 / 1018);
  await expect(page.getByRole('button', { name: 'Rata-rata', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.reload(); await expect(page.locator('.policy-dashboard')).toBeVisible();
});

test('invalid assumptions clear outputs and recover without stale values', async ({ page }) => {
  await open(page);
  const input = page.getByLabel('Kenaikan admisi (%)', { exact: true });
  for (const invalid of ['', '-5', '201']) {
    await input.fill(invalid);
    await expect(page.locator('[data-result="admissions"]')).toHaveText('—');
    await expect(input).toHaveAttribute('aria-invalid', 'true');
    await expect(page.locator('[data-chart="admission-scenario-admissions"]')).not.toBeVisible();
  }
  await input.fill('0');
  await page.getByLabel('Tambahan tempat tidur', { exact: true }).fill('1.5');
  await expect(page.locator('[data-result="load"]')).toHaveText('—');
  await page.getByLabel('Tambahan tempat tidur', { exact: true }).fill('100');
  expect(await value(page, 'admissions')).toBe(733191 / 1018);
  expect(await value(page, 'load')).toBeCloseTo((733191 / 1018) / 6380 * 100, 10);
});

test('shared filters update capacity assumptions and persist across tabs', async ({ page }) => {
  await open(page);
  await page.getByLabel('Kenaikan admisi (%)', { exact: true }).fill('50');
  await page.locator('#dashboard-filters summary').click();
  await choose(page, 'Wilayah', 'Jakarta');
  await expect(page.locator('.admission-scenario-message')).toContainText('3 faskes');
  await expect(page.locator('.admission-scenario-message')).toContainText('1018 hari');
  const baseline = await value(page, 'baseline');
  expect(baseline).not.toBe(733191 / 1018);
  expect(await value(page, 'admissions')).toBe(baseline * 1.5);
  await expect(page.getByLabel('Kenaikan admisi (%)', { exact: true })).toHaveValue('50');
  await page.locator('#dashboard-filters summary').click();
  expect(await value(page, 'admissions')).toBe(baseline * 1.5);
  await page.getByRole('link', { name: 'Dampak Kesehatan', exact: true }).click();
  await expect(page.locator('.health-dashboard')).toBeVisible();
  await expect(page.locator('.admission-simulation, .admission-disclosure')).toHaveCount(0);
  await expect(page.locator('.health-scope')).toContainText('3 faskes pilihan');
});

test('charts animate visibly, react to reduced motion, retain canvases and tear down on navigation', async ({ page }) => {
  await open(page);
  const chart = page.locator('[data-chart="admission-scenario-admissions"]');
  await chart.evaluate(node => { node.setAttribute('data-retained', 'true'); });
  await page.getByLabel('Kenaikan admisi (%)', { exact: true }).fill('100');
  await expect(chart).toHaveAttribute('data-animation', 'running');
  const animated = await chart.evaluate(async node => {
    if (!(node instanceof HTMLCanvasElement)) throw new Error('Missing canvas');
    const frames = [];
    for (let i = 0; i < 4; i++) { await new Promise<void>(resolve => requestAnimationFrame(() => resolve())); frames.push(node.toDataURL()); }
    return new Set(frames).size > 1;
  });
  expect(animated).toBe(true);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(chart).toHaveAttribute('data-animation', 'complete');
  await page.getByRole('button', { name: 'Tema gelap', exact: true }).click();
  await expect(chart).toHaveAttribute('data-retained', 'true');
  for (let i = 0; i < 3; i++) {
    await page.getByRole('link', { name: 'Pola Waktu', exact: true }).click();
    await expect(page.locator('.feature-host canvas')).toHaveCount(0);
    await expect(page.locator('.leaflet-container')).toHaveCount(0);
    await page.getByRole('link', { name: 'Rekomendasi Kebijakan', exact: true }).click();
    await expect(page.locator('.policy-dashboard canvas')).toHaveCount(3);
  }
});

test('policy simulator controls fit all widths and remain aligned on desktop', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await open(page);
  await expect(page.getByRole('slider', { name: 'Geser kenaikan admisi' })).toHaveCount(0);
  const controls = [page.getByRole('group', { name: 'Statistik dasar historis', exact: true }),
    page.getByLabel('Kenaikan admisi (%)', { exact: true }), page.getByLabel('Tambahan tempat tidur', { exact: true }),
    page.getByRole('button', { name: 'Reset skenario', exact: true })];
  const boxes = await Promise.all(controls.map(control => control.boundingBox()));
  const first = boxes[0]; if (!first) throw new Error('Missing simulator baseline control');
  for (const box of boxes) {
    if (!box) throw new Error('Missing simulator control');
    expect(Math.abs(box.y - first.y)).toBeLessThan(1);
    expect(Math.abs(box.height - first.height)).toBeLessThan(1);
    expect(box.height).toBeGreaterThanOrEqual(44);
  }
  await page.getByRole('button', { name: 'Tema gelap', exact: true }).click();
  await page.locator('.admission-simulation-controls').screenshot({ path: 'test-results/admission-controls-desktop-dark.png' });
  await page.setViewportSize({ width: 1024, height: 1000 });
  await page.locator('.admission-simulation-controls').screenshot({ path: 'test-results/admission-controls-tablet-dark.png' });
  await page.setViewportSize({ width: 375, height: 1000 });
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.locator('.admission-simulation-controls').screenshot({ path: 'test-results/admission-controls-phone-dark.png' });
});

test('policy simulation entrance remains visible after the opening releases the application', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/dashboard/rekomendasi-kebijakan');
  await expect(page.locator('.admission-simulation')).toBeVisible();
  await expect(page.locator('#opening-screen')).toHaveCount(0);
  const chart = page.locator('[data-chart="admission-scenario-admissions"]');
  await expect(chart).toHaveAttribute('data-animation', 'running');
  await expect(chart).toHaveAttribute('data-animation', 'complete');
});
