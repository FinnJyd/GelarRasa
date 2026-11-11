import { expect, test } from '@playwright/test';
import { AIR_POLLUTION_FACTS } from '../../dashboard/src/data/air-pollution-facts';
import { ROUTES } from '../../dashboard/src/shared/routes';

test.beforeEach(async ({ page }) => {
  await page.route('**/MapServer/tile/**', route => route.abort());
  await page.goto('/dashboard');
  await expect(page.locator('.doughnut-center strong')).toHaveText('27');
});

test('general ticker moves, pauses, and preserves its content and instance across filters and tabs', async ({ page }) => {
  const ticker = page.getByRole('complementary', { name: 'Fakta umum polusi udara' });
  await expect(page.locator('.app-header .header-ticker-host .fact-ticker')).toHaveCount(1);
  const bar = await page.locator('.topbar').boundingBox();
  const strip = await ticker.boundingBox();
  if (!bar || !strip) throw new Error('Header/ticker geometry unavailable');
  expect(Math.abs(strip.y - bar.y - bar.height)).toBeLessThanOrEqual(1);
  expect(strip.height).toBeLessThanOrEqual(30);
  await page.evaluate(() => window.scrollTo(0, 500));
  expect(await page.locator('.app-header').evaluate(node => Math.abs(node.getBoundingClientRect().top))).toBeLessThanOrEqual(1);
  const track = ticker.locator('.fact-ticker-track');
  const facts = ticker.locator('.fact-ticker-list').first();
  await expect(facts.locator('li')).toHaveText([...AIR_POLLUTION_FACTS]);
  await expect(ticker.getByRole('link')).toHaveCount(0);
  const instance = await ticker.elementHandle();
  if (!instance) throw new Error('Ticker instance unavailable');
  await ticker.hover();
  await expect(track).toHaveCSS('animation-play-state', 'running');
  const before = await track.evaluate(node => getComputedStyle(node).transform);
  await expect.poll(() => track.evaluate(node => getComputedStyle(node).transform)).not.toBe(before);
  await page.getByRole('button', { name: 'Jeda ticker fakta', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Lanjutkan ticker fakta', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(track).toHaveCSS('animation-play-state', 'paused');
  const stopped = await track.evaluate(node => getComputedStyle(node).transform);
  await page.waitForTimeout(150);
  expect(await track.evaluate(node => getComputedStyle(node).transform)).toBe(stopped);
  await page.getByRole('button', { name: 'Lanjutkan ticker fakta', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Jeda ticker fakta', exact: true })).toBeFocused();
  await expect(track).toHaveCSS('animation-play-state', 'running');
  await expect.poll(() => track.evaluate(node => getComputedStyle(node).transform)).not.toBe(stopped);
  await page.getByRole('button', { name: 'Jeda ticker fakta', exact: true }).click();
  await page.locator('#dashboard-filters summary').click();
  await page.getByRole('combobox', { name: 'Stasiun', exact: true }).fill('JKT-01');
  await page.getByRole('listbox').getByRole('option', { name: /JKT-01/ }).click();
  await expect(page.locator('.doughnut-center strong')).toHaveText('1');
  await expect(facts.locator('li')).toHaveText([...AIR_POLLUTION_FACTS]);
  for (const title of ['Kepatuhan Regulasi', 'Pola Waktu', 'Faktor Pemicu', 'Dampak Kesehatan', 'Rekomendasi Kebijakan', 'Ikhtisar Nasional']) {
    await page.getByRole('link', { name: title, exact: true }).click();
    await expect(ticker).toHaveCount(1);
    expect(await ticker.evaluate((node, original) => node === original, instance)).toBe(true);
    await expect(facts.locator('li')).toHaveText([...AIR_POLLUTION_FACTS]);
    await expect(track).toHaveCSS('animation-play-state', 'paused');
  }
});

test('general facts are available on every direct tab URL without measurement data', async ({ page }) => {
  await page.route('**/tab1_ikhtisar.json', route => route.abort());
  for (const path of Object.values(ROUTES)) {
    await page.goto(path);
    await expect(page.locator('.fact-ticker-list').first().locator('li')).toHaveText([...AIR_POLLUTION_FACTS]);
  }
});

for (const width of [320, 1440]) {
  test(`ticker handles live reduced motion and fits both themes at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const ticker = page.locator('.fact-ticker');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await expect(ticker).toHaveAttribute('data-reduced-motion', 'true');
    await expect(ticker.locator('.fact-ticker-toggle')).toBeHidden();
    await expect(ticker.locator('.fact-ticker-copy')).toBeHidden();
    await expect(ticker.locator('.fact-ticker-track')).toHaveCSS('animation-name', 'none');
    const viewport = ticker.locator('.fact-ticker-viewport');
    await viewport.focus();
    await viewport.press('ArrowRight');
    await expect.poll(() => viewport.evaluate(node => node.scrollLeft)).toBeGreaterThan(0);
    for (const theme of ['light', 'dark']) {
      await page.evaluate(value => { document.documentElement.dataset['theme'] = value; }, theme);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      for (const fact of await ticker.locator('.fact-ticker-list').first().locator('li').all()) {
        expect(await fact.evaluate(node => node.scrollWidth <= node.clientWidth + 1)).toBe(true);
      }
    }
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await expect(ticker.locator('.fact-ticker-toggle')).toBeVisible();
    await expect(ticker.locator('.fact-ticker-track')).toHaveCSS('animation-name', 'fact-scroll');
  });
}
