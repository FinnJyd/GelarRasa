import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

async function choose(page: Page, label: string, query: string): Promise<void> {
  await page.getByRole('combobox', { name: label, exact: true }).fill(query);
  await page.getByRole('listbox', { name: `Pilihan ${label.toLocaleLowerCase('id-ID')}`, exact: true }).getByRole('option').filter({ hasText: query }).first().click();
}
async function open(page: Page): Promise<void> {
  await page.goto('/dashboard/rekomendasi-kebijakan');
  await expect(page.locator('.policy-dashboard')).toBeVisible();
}
const errors = new WeakMap<Page, string[]>();
test.beforeEach(async ({ page }) => { const messages: string[] = []; errors.set(page, messages); page.on('pageerror', error => messages.push(error.message)); await page.route('https://server.arcgisonline.com/**', route => route.abort()); });
test.afterEach(({ page }) => { expect(errors.get(page)).toEqual([]); });

test('policy uses persistent global filters and retains both explicit simulation types', async ({ page }) => {
  await open(page);
  await expect(page.locator('#dashboard-filters')).not.toHaveAttribute('open');
  await expect(page.getByRole('heading', { level: 3 })).toHaveText(['Matriks Respons Kesehatan', 'Asumsi Kapasitas Manual', 'Prioritas Studi Ekspansi AQMS', 'Lokasi dan Bukti', 'Prioritas Tindakan']);
  await expect(page.locator('.policy-dashboard')).not.toContainText('→');
  await page.locator('#dashboard-filters summary').click(); await choose(page, 'Wilayah', 'Jakarta');
  await expect(page.locator('.policy-scope')).toContainText('3 stasiun');
  const baseline = await page.locator('[data-result="baseline"]').getAttribute('data-value');
  await page.getByRole('button', { name: 'NO2', exact: true }).click();
  await expect(page.locator('.policy-scope')).toContainText('NO2');
  await expect(page.locator('[data-result="baseline"]')).toHaveAttribute('data-value', baseline ?? '');
  await page.getByLabel(/SUSPECT/).check(); await expect(page.locator('.policy-scope')).toContainText('VALID + SUSPECT');
  await page.getByLabel('Tanggal mulai', { exact: true }).fill('2026-10-14'); await page.getByLabel('Tanggal mulai', { exact: true }).blur();
  await expect(page.locator('.admission-scenario-message')).toContainText('1 hari');
  await page.getByRole('link', { name: 'Dampak Kesehatan', exact: true }).click(); await expect(page.locator('.health-scope')).toContainText('3 faskes'); await expect(page.locator('.health-dashboard canvas')).toHaveCount(7);
  await page.goBack(); await expect(page.locator('.policy-scope')).toContainText('NO2'); await expect(page.locator('#dashboard-filters')).not.toHaveAttribute('open');
});

test('response matrix and network weights expose actual evidence without invented coordinates', async ({ page }) => {
  await open(page);
  const matrix = page.getByRole('table', { name: 'PM2.5 · perubahan kasus terhadap paparan rendah 2024 per faskes', exact: true });
  await expect(matrix.locator('tbody tr')).toHaveCount(4);
  const chart = page.locator('[data-chart="policy-network-rank"]'); await expect(chart).toBeVisible(); const initial = await chart.getAttribute('aria-label');
  for (const label of ['Bobot Baseline PM2.5', 'Bobot Lalu lintas', 'Bobot Jarak antarstasiun']) await page.getByLabel(label, { exact: true }).fill('0');
  await expect(chart).not.toBeVisible(); await page.getByLabel('Bobot Jarak antarstasiun', { exact: true }).fill('100');
  await expect(chart).toBeVisible(); expect(await chart.getAttribute('aria-label')).not.toBe(initial);
  await expect(chart).toHaveAttribute('aria-label', /AQMS-MER-01: skor 100/);
  await page.getByLabel('Radius ilustrasi pemantauan (km)', { exact: true }).fill('100'); await expect(page.locator('.policy-dashboard')).toContainText('100 km · asumsi ilustrasi');
  await expect(page.locator('.policy-map path[role="button"]')).toHaveCount(27);
  await expect(page.locator('.policy-dashboard')).toContainText('tidak ada koordinat alat baru');
});

test('station evidence remains collapsed, sortable, keyboard accessible and globally referenced', async ({ page }) => {
  await open(page); const disclosure = page.locator('.policy-table-disclosure').last(); await expect(disclosure).not.toHaveAttribute('open');
  await disclosure.locator('summary').focus(); await disclosure.locator('summary').press('Enter'); await expect(disclosure.locator('tbody tr')).toHaveCount(27);
  await page.getByRole('button', { name: 'Jarak terbesar', exact: true }).click(); await expect(disclosure.locator('tbody tr').first()).toContainText('AQMS-MER-01');
  await page.locator('#dashboard-filters summary').click(); await choose(page, 'Stasiun', 'AQMS-MER-01');
  await expect(disclosure.locator('tbody tr')).toHaveCount(1); await expect(disclosure).toContainText('AQMS-SRG-01');
  expect(Number(await disclosure.locator('[data-nearest-km]').getAttribute('data-nearest-km'))).toBeCloseTo(1318.7, 0);
  await page.getByRole('button', { name: 'Lihat di peta', exact: true }).click(); await expect(page.locator('.leaflet-popup')).toContainText('AQMS-SRG-01');
  await expect(page.getByRole('button', { name: /sebelumnya|berikutnya/i, includeHidden: true })).toHaveCount(0);
});

test('case-study controls and layouts fit phones and desktop in both themes', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' }); await open(page); await expect(page.locator('.policy-dashboard canvas')).toHaveCount(3);
  for (const width of [1440, 1024, 768, 375, 320]) { await page.setViewportSize({ width, height: 1000 }); await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true); await page.screenshot({ path: `test-results/case-policy-${width}-light.png`, fullPage: true }); }
  await page.getByRole('button', { name: 'Tema gelap', exact: true }).click(); await page.screenshot({ path: 'test-results/case-policy-320-dark.png', fullPage: true });
});
