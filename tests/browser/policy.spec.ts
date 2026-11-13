import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

async function choose(page: Page, label: string, query: string): Promise<void> {
  await page.getByRole('combobox', { name: label, exact: true }).fill(query);
  await page.getByRole('listbox', { name: `Pilihan ${label.toLocaleLowerCase('id-ID')}`, exact: true }).getByRole('option').filter({ hasText: query }).first().click();
}
async function open(page: Page): Promise<void> {
  await page.goto('/dashboard/rekomendasi-kebijakan');
  await expect(page.locator('.policy-dashboard')).toBeVisible();
  await expect(page.locator('[data-model-result="young"]')).not.toHaveText('—');
}
const errors = new WeakMap<Page, string[]>();
test.beforeEach(async ({ page }) => { const messages: string[] = []; errors.set(page, messages); page.on('pageerror', error => messages.push(error.message)); await page.route('https://server.arcgisonline.com/**', route => route.abort()); });
test.afterEach(({ page }) => { expect(errors.get(page)).toEqual([]); });

test('policy uses persistent global filters and retains both explicit simulation types', async ({ page }) => {
  await open(page);
  await expect(page.locator('#dashboard-filters')).not.toHaveAttribute('open');
  await expect(page.getByRole('heading', { level: 3 })).toHaveText(['Matriks Respons Kesehatan', 'Simulasi PM2.5 dan Admisi', 'Asumsi Kapasitas Manual', 'Prioritas Studi Ekspansi AQMS', 'Lokasi dan Bukti', 'Prioritas Tindakan']);
  await expect(page.locator('.policy-dashboard')).not.toContainText('→');
  await page.locator('#dashboard-filters summary').click(); await choose(page, 'Wilayah', 'Jakarta');
  await expect(page.locator('.policy-scope')).toContainText('3 stasiun');
  await expect(page.locator('.case-simulator')).toContainText('3/3 faskes');
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

test('PM2.5 simulation uses supported ranges and reports conditional intervals and poor extrapolation', async ({ page }) => {
  await open(page);
  const value = page.locator('[data-model-result="young"]'); const baseline = Number(await value.getAttribute('data-value'));
  const slider = page.getByLabel('Rata-rata PM2.5 skenario (µg/m³)', { exact: true });
  await slider.evaluate(node => { if (!(node instanceof HTMLInputElement)) throw new Error('Missing slider'); node.value = node.max; node.dispatchEvent(new Event('input', { bubbles: true })); });
  expect(Number(await value.getAttribute('data-value'))).toBeGreaterThan(baseline);
  await expect(page.locator('.case-simulator')).toContainText('IK 95%'); await expect(page.locator('.case-simulator')).toContainText('gagal menggeneralisasi');
  await expect(page.locator('[data-chart="policy-model-interval"]')).toBeVisible();
  await page.getByLabel('Tambahan tempat tidur skenario', { exact: true }).fill('1.5'); await expect(value).toHaveText('—');
  await page.getByRole('button', { name: 'Reset model', exact: true }).click(); expect(Number(await value.getAttribute('data-value'))).toBeCloseTo(baseline, 8);
  await page.getByText('Validasi model: latih 2024–2025, uji 2026', { exact: true }).click(); await expect(page.locator('.case-simulator')).toContainText('Seluruh uji: MAE 2.048,43');
  await page.locator('#dashboard-filters summary').click(); await choose(page, 'Stasiun', 'AQMS-BJB-01');
  await expect(value).toHaveText('—'); await expect(slider).toBeDisabled(); await expect(page.locator('[data-result="baseline"]')).not.toHaveText('—');
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

test('failed model has isolated retry and navigation aborts pending policy resources', async ({ page }) => {
  let fail = true; await page.route('**/data/model_coef.json', route => fail ? route.fulfill({ status: 503, body: '{}' }) : route.continue());
  await page.goto('/dashboard/rekomendasi-kebijakan'); await expect(page.getByText('Model belum tersedia', { exact: true })).toBeVisible(); await expect(page.locator('[data-result="baseline"]')).not.toHaveText('—');
  fail = false; await page.getByRole('button', { name: 'Coba lagi model', exact: true }).click(); await expect(page.locator('[data-model-result="young"]')).not.toHaveText('—');
  for (let i = 0; i < 3; i++) { await page.getByRole('link', { name: 'Pola Waktu', exact: true }).click(); await expect(page.locator('.leaflet-container, .feature-host canvas')).toHaveCount(0); await page.getByRole('link', { name: 'Rekomendasi Kebijakan', exact: true }).click(); await expect(page.locator('.policy-dashboard canvas')).toHaveCount(4); }
});

test('case-study controls and layouts fit phones and desktop in both themes', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' }); await open(page); await expect(page.locator('.policy-dashboard canvas')).toHaveCount(4);
  for (const width of [1440, 1024, 768, 375, 320]) { await page.setViewportSize({ width, height: 1000 }); await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true); await page.screenshot({ path: `test-results/case-policy-${width}-light.png`, fullPage: true }); }
  await page.getByRole('button', { name: 'Tema gelap', exact: true }).click(); await page.screenshot({ path: 'test-results/case-policy-320-dark.png', fullPage: true });
});
