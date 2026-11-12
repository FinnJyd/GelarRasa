import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.route('**/MapServer/tile/**', route => route.abort());
  await page.goto('/dashboard');
  await expect(page.locator('.doughnut-center strong')).toHaveText('26');
});

test('unmeasured station stays on the map and table but does not become a clean doughnut slice', async ({ page }) => {
  await expect(page.locator('.leaflet-interactive')).toHaveCount(27);
  await expect(page.locator('.doughnut-center strong')).toHaveText('26');
  await expect(page.locator('.map-legend')).toContainText('Data tidak mencukupi');
  const marker = page.locator('.leaflet-interactive[aria-label="AQMS-JMB-02 · Data tidak mencukupi"]');
  await expect(marker).toHaveAttribute('fill', '#7b8794');
  await expect(marker).toHaveAttribute('stroke-dasharray', /3/);
  await page.getByText('Lihat tabel data · 27 stasiun', { exact: true }).click();
  const row = page.locator('.overview-table tbody tr').filter({ hasText: 'AQMS-JMB-02' });
  await expect(row).toContainText('Tidak tersedia'); await expect(row).toContainText('Data tidak mencukupi');
  await expect(row).toContainText('0 / 1.018 hari terukur');
  await page.getByRole('button', { name: 'Acuan Tahunan (PP 22/2021)', exact: true }).click();
  await expect(marker).toHaveAttribute('fill', '#7b8794');
});

test('selecting JMB-02 shows missing air indicators and preserves its hospital and location', async ({ page }) => {
  await page.locator('#dashboard-filters summary').click();
  await page.getByRole('combobox', { name: 'Stasiun', exact: true }).fill('JMB-02');
  await page.getByRole('listbox', { name: 'Pilihan stasiun', exact: true }).getByRole('option', { name: /JMB-02/ }).click();
  await expect(page.locator('.doughnut-center strong')).toHaveText('0');
  for (const i of [0, 1, 2]) await expect(page.locator('.overview .metric').nth(i).locator('.metric-value strong')).toHaveText('—');
  await expect(page.locator('.overview .metric').nth(3).locator('.metric-value strong')).not.toHaveText('—');
  await expect(page.getByRole('heading', { name: 'Data kategori tidak tersedia', exact: true })).toBeVisible();
  await expect(page.locator('.leaflet-interactive')).toHaveCount(1);
  await page.locator('.leaflet-interactive').click();
  await expect(page.locator('.station-popup')).toContainText('Data tidak mencukupi');
  await expect(page.locator('.station-popup')).toContainText('0 / 1.018 hari terukur');
  await page.getByLabel('Sertakan data SUSPECT', { exact: true }).check();
  await expect(page.locator('.doughnut-center strong')).toHaveText('0');
  await page.getByRole('button', { name: 'Reset filter', exact: true }).click();
  await expect(page.locator('.doughnut-center strong')).toHaveText('26');
});

test('partial observations show coverage and layouts remain usable in both themes', async ({ page }) => {
  await page.locator('#dashboard-filters summary').click();
  await page.getByRole('combobox', { name: 'Stasiun', exact: true }).fill('MDN-01');
  await page.getByRole('listbox', { name: 'Pilihan stasiun', exact: true }).getByRole('option', { name: /MDN-01/ }).click();
  await expect(page.locator('.doughnut-center strong')).toHaveText('1');
  await page.getByText('Lihat tabel data · 1 stasiun', { exact: true }).click();
  await expect(page.locator('.overview-table tbody')).toContainText('371 / 1.018 hari terukur');
  await page.locator('.leaflet-interactive').click();
  await expect(page.locator('.station-popup')).toContainText('371 / 1.018 hari terukur');
  for (const width of [320, 375, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const theme of ['light', 'dark']) {
      await page.evaluate(value => { document.documentElement.dataset['theme'] = value; }, theme);
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
  }
});
