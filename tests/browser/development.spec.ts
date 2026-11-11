import { readFile, writeFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import { ROUTES } from '../../dashboard/src/shared/routes';

async function temporaryEdit(path: string, transform: (source: string) => string, check: () => Promise<void>): Promise<void> {
  const source = await readFile(path, 'utf8');
  const edited = transform(source);
  expect(edited).not.toBe(source);
  try {
    await writeFile(path, edited);
    await check();
  } finally {
    if (await readFile(path, 'utf8') !== edited) throw new Error(`Concurrent edit detected in ${path}; refusing to overwrite it.`);
    await writeFile(path, source);
  }
}

test('known routes, asset base, canonical redirects and missing routes work', async ({ page, request }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const path of Object.values(ROUTES)) {
    const response = await page.goto(path);
    expect(response?.status()).toBe(200);
    await expect(page.locator('h1')).toHaveText('DA2026_Dashboard_NasiBakarCumiHitamPakKris_AlfinJayadi');
    await page.reload();
    await expect(page.getByRole('link', { name: /Dampak Kesehatan/, exact: true })).toBeVisible();
  }
  for (const path of ['/', '/dashboard/', '/dashboard/index.html']) {
    const response = await request.get(path, { maxRedirects: 0 });
    expect(response.status()).toBe(308);
    expect(response.headers()['location']).toBe('/dashboard');
  }
  expect((await request.get('/dashboard/unknown')).status()).toBe(404);
  expect((await request.get('/assets/Prana%20Textual.png')).status()).toBe(200);
  expect((await request.get('/dashboard/data/health_outcomes.json')).status()).toBe(200);
  expect((await request.get('/dashboard/fonts/inter-latin-variable.woff2')).status()).toBe(200);
});

test.describe('Vite live updates', () => {
  test.skip(process.env['PRANA_TEST_MODE'] === 'production', 'Source watching is development-only.');
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/dashboard/dampak-kesehatan');
    await expect(page.locator('.health-dashboard')).toBeVisible();
  });

  test('TypeScript edits reload the running dashboard automatically', async ({ page }) => {
    await temporaryEdit('dashboard/src/features/health/view.ts', source => source.replace(
      'Telusuri hubungan polutan dengan kasus harian di faskes pilihan.', 'Pembaruan otomatis Vite terverifikasi.',
    ), async () => { await expect(page.locator('.health-orientation')).toHaveText('Pembaruan otomatis Vite terverifikasi.'); });
  });

  test('Tailwind CSS edits update styles without discarding current selections', async ({ page }) => {
    await page.getByRole('combobox', { name: 'Indikator kesehatan', exact: true }).fill('Kematian');
    await page.getByRole('option', { name: 'Kematian', exact: true }).click();
    await page.evaluate(() => { document.body.dataset['cssProbe'] = 'retained'; });
    await temporaryEdit('dashboard/styles.css', source => `${source}\n.health-orientation { @apply tracking-[0.123em]; }\n:root { --chart-accent: #ff00ff; }\n`, async () => {
      await expect.poll(() => page.locator('.health-orientation').evaluate(node => Number.parseFloat(getComputedStyle(node).letterSpacing))).toBeGreaterThan(1);
      await expect.poll(() => page.locator('[data-chart="health-admissions"]').evaluate(node => {
        if (!(node instanceof HTMLCanvasElement)) throw new Error('Expected chart canvas');
        const ctx = node.getContext('2d');
        if (!ctx) throw new Error('Canvas context unavailable');
        const pixels = ctx.getImageData(0, 0, node.width, node.height).data;
        for (let i = 0; i < pixels.length; i += 4) {
          if ((pixels[i] ?? 0) > 220 && (pixels[i + 1] ?? 255) < 80 && (pixels[i + 2] ?? 0) > 220 && (pixels[i + 3] ?? 0) > 0) return true;
        }
        return false;
      })).toBe(true);
      await expect(page.locator('body')).toHaveAttribute('data-css-probe', 'retained');
      await expect(page.getByRole('combobox', { name: 'Indikator kesehatan', exact: true })).toHaveValue('Kematian');
    });
  });

  test('exported JSON changes reload deep links without changing measurements', async ({ page }) => {
    await page.evaluate(() => { document.documentElement.dataset['exportProbe'] = 'old'; });
    await temporaryEdit('dashboard/data/health_outcomes.json', source => `${source}\n`, async () => {
      await expect(page.locator('html')).not.toHaveAttribute('data-export-probe');
      await expect(page.locator('.health-metrics .metric').first().locator('strong')).toHaveText('720,23');
    });
  });

  test('HTML edits reload a canonical deep link', async ({ page }) => {
    await temporaryEdit('dashboard/entry.html', source => source.replace('PRANA — jelajahi', 'Vite HTML reload — jelajahi'), async () => {
      await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /^Vite HTML reload/);
      await expect(page).toHaveURL(/\/dashboard\/dampak-kesehatan$/);
      await expect(page.locator('.health-dashboard')).toBeVisible();
    });
  });

  test('route-registry edits restart Vite automatically and restore the same deep link', async ({ page }) => {
    await page.evaluate(() => { document.documentElement.dataset['routeProbe'] = 'old'; });
    await temporaryEdit('dashboard/routes.json', source => `${source}\n`, async () => {
      await expect(page.locator('html')).not.toHaveAttribute('data-route-probe');
      await expect(page.locator('.health-dashboard')).toBeVisible();
      await expect(page).toHaveURL(/\/dashboard\/dampak-kesehatan$/);
    });
  });

  test('development server does not expose raw analytical datasets', async ({ request }) => {
    const response = await request.get('/dataset/raw/health/HLT-01_health_outcomes_daily.csv');
    expect(response.status()).toBe(403);
  });
});
