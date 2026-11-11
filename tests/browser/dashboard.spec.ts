import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { ROUTES } from '../../dashboard/src/shared/routes';

async function choose(page: Page, label: string, query: string): Promise<void> {
  const input = page.getByRole('combobox', { name: label, exact: true });
  await input.click();
  await input.fill(query);
  await page.getByRole('listbox', { name: `Pilihan ${label.toLocaleLowerCase('id-ID')}`, exact: true }).getByRole('option', { name: query }).first().click();
}

const title = 'DA2026_Dashboard_NasiBakarCumiHitamPakKris_AlfinJayadi';

test.beforeEach(async ({ page }) => {
  await page.route('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/**', route => route.abort());
  await page.route('https://fonts.googleapis.com/**', route => route.abort());
  await page.goto('/dashboard/', { waitUntil: 'domcontentloaded' });
  await expect(page.getByText('27 dari 27 stasiun')).toBeVisible();
});

test('required identity, collapsed filters, synchronized selections, and reset', async ({ page }) => {
  await expect(page).toHaveTitle(title);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(title);
  const filters = page.locator('#dashboard-filters');
  await expect(filters).not.toHaveAttribute('open');
  await filters.locator('summary').click();
  await choose(page, 'Wilayah', 'Jakarta');
  await expect(page.getByText('3 dari 27 stasiun')).toBeVisible();
  await expect(page.locator('.ranking-data li')).toHaveCount(3);
  await expect(page.locator('.leaflet-interactive')).toHaveCount(3);
  await expect(page.locator('#filter-summary')).toContainText('Jakarta');
  await choose(page, 'Stasiun', 'AQMS-JKT-01');
  await expect(page.getByText('1 dari 27 stasiun')).toBeVisible();
  await expect(page.locator('.ranking-data li')).toHaveCount(1);
  await choose(page, 'Wilayah', 'Bogor');
  await expect(page.getByLabel('Stasiun', { exact: true })).toHaveValue('Semua stasiun');
  await expect(page.getByText('2 dari 27 stasiun')).toBeVisible();
  await page.getByRole('button', { name: 'Reset filter', exact: true }).click();
  await expect(page.getByText('27 dari 27 stasiun')).toBeVisible();
  await expect(filters).toHaveAttribute('open');
  await filters.locator('summary').click();
  await expect(filters).not.toHaveAttribute('open');
  await expect(page.getByRole('heading', { name: 'Admisi pernapasan' })).toBeVisible();
});

test('reference content uses current panels and truthful filtered indicators', async ({ page }) => {
  await expect(page.locator('.page-intro .research-label')).toHaveText('Pertanyaan Riset');
  await expect(page.locator('.page-question')).toContainText('Bagaimana status kualitas udara nasional');
  await expect(page.getByRole('heading', { name: 'Indikator Kunci & Distribusi Kualitas Udara Nasional', exact: true })).toBeVisible();
  const exceedance = page.locator('.metric').filter({ has: page.getByRole('heading', { name: 'Persentase Hari Melebihi Batas 24 Jam', exact: true }) });
  await expect(exceedance.locator('.metric-value strong')).toHaveText('17,7');
  const critical = page.locator('.metric-station');
  await expect(critical.locator('.metric-value strong')).toHaveText('AQMS-BJB-01');
  const hospital = page.locator('.metric').filter({ has: page.getByRole('heading', { name: 'Indeks Beban Hospital (Faskes)', exact: true }) });
  await expect(hospital.locator('.metric-value strong')).toHaveText('6,43');
  await page.locator('#dashboard-filters summary').click();
  await choose(page, 'Stasiun', 'AQMS-BJB-01');
  await expect(exceedance.locator('.metric-value strong')).toHaveText('40,1');
  await expect(exceedance).toContainText('rata-rata persentase stasiun terpilih');
  await expect(hospital.locator('.metric-value strong')).toHaveText('6,43');
  await page.getByRole('link', { name: 'Kepatuhan Regulasi', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Audit Kepatuhan Regulasi Udara Nasional (PP 22/2021 & Permen LHK 27/2021)', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Modul Visualisasi Tab 2', exact: true })).toBeVisible();
  await expect(page.getByText('Belum tersedia', { exact: true })).toBeVisible();
});

test('all tabs navigate, charts and map clean up, and selections survive remount', async ({ page }) => {
  await page.locator('#dashboard-filters summary').click();
  await choose(page, 'Wilayah', 'Jakarta');
  for (const name of ['Kepatuhan Regulasi', 'Pola Waktu', 'Faktor Pemicu', 'Dampak Kesehatan', 'Rekomendasi Kebijakan']) {
    await page.getByRole('link', { name, exact: true }).click();
    await expect(page.getByRole('heading', { level: 2 })).toHaveText(name);
    await expect(page.getByText('Belum tersedia', { exact: true })).toBeVisible();
    await expect(page.locator('.leaflet-container')).toHaveCount(0);
  }
  for (let index = 0; index < 4; index++) {
    await page.getByRole('link', { name: 'Ikhtisar Nasional', exact: true }).click();
    await expect(page.locator('.leaflet-container')).toHaveCount(1);
    await expect(page.locator('.leaflet-interactive')).toHaveCount(3);
    await page.getByRole('link', { name: 'Pola Waktu', exact: true }).click();
  }
  await page.getByRole('link', { name: 'Ikhtisar Nasional', exact: true }).click();
  await expect(page.getByText('3 dari 27 stasiun')).toBeVisible();
});

test('methodology keyboard focus, Escape, and theme changes', async ({ page }) => {
  const opener = page.getByRole('button', { name: 'Metodologi', exact: true });
  await opener.click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(page.getByRole('button', { name: 'Tutup metodologi', exact: true })).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(dialog.getByRole('button', { name: 'Tutup', exact: true })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Tutup metodologi', exact: true })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
  await expect(opener).toBeFocused();
  await page.getByRole('button', { name: 'Ganti tema tampilan' }).click();
  await expect(page.locator('.leaflet-container')).toHaveCount(1);
});

test('missing data shows recovery and leaves navigation usable', async ({ page }) => {
  await page.route('**/tab1_ikhtisar.json', route => route.fulfill({ status: 404, body: '{}' }));
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: 'Ringkasan belum dapat dimuat' })).toBeVisible();
  await page.getByRole('link', { name: 'Pola Waktu', exact: true }).click();
  await expect(page.getByRole('heading', { level: 2 })).toHaveText('Pola Waktu');
  await page.unroute('**/tab1_ikhtisar.json');
  await page.getByRole('link', { name: 'Ikhtisar Nasional', exact: true }).click();
  await page.getByRole('button', { name: 'Coba lagi', exact: true }).click();
  await expect(page.getByText('27 dari 27 stasiun')).toBeVisible();
});

for (const width of [320, 375, 768, 1024, 1440, 1920]) {
  test(`responsive layout at ${width}px in both themes`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    if (width < 768) await expect(page.locator('#app-sidebar')).not.toBeVisible();
    await page.locator('#dashboard-filters summary').click();
    for (let index = 0; index < 2; index++) {
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      const titleBox = await page.getByRole('heading', { level: 1 }).boundingBox();
      expect(titleBox?.width).toBeGreaterThan(100);
      await expect(page.getByLabel('Wilayah', { exact: true })).toBeVisible();
      await page.getByRole('button', { name: 'Ganti tema tampilan' }).click();
    }
  });
}

test('mobile navigation opens and returns to the selected content', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  const menu = page.getByRole('button', { name: 'Buka navigasi' });
  await menu.click();
  await expect(page.getByRole('dialog', { name: 'Navigasi dashboard' })).toBeVisible();
  await expect(page.getByRole('dialog', { name: 'Navigasi dashboard' }).getByRole('button', { name: 'Tutup navigasi', exact: true })).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(page.getByRole('link', { name: 'Rekomendasi Kebijakan', exact: true })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('dialog', { name: 'Navigasi dashboard' }).getByRole('button', { name: 'Tutup navigasi', exact: true })).toBeFocused();
  await page.getByRole('link', { name: 'Pola Waktu', exact: true }).click();
  await expect(page.getByRole('heading', { level: 2 })).toHaveText('Pola Waktu');
  await expect(menu).toHaveAttribute('aria-expanded', 'false');
});


test('review screenshots and reduced-motion reflow', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1100 });
  await expect.poll(() => page.locator('canvas[data-chart]').evaluateAll(canvases =>
    canvases.every(canvas => canvas.getAttribute('data-animation') === 'complete'),
  )).toBe(true);
  await page.screenshot({ path: '/tmp/prana-desktop-light.png', fullPage: true });
  await page.getByRole('button', { name: 'Ganti tema tampilan' }).click();
  await expect.poll(() => page.locator('canvas[data-chart]').evaluateAll(canvases =>
    canvases.every(canvas => canvas.getAttribute('data-animation') === 'complete'),
  )).toBe(true);
  await page.screenshot({ path: '/tmp/prana-desktop-dark.png', fullPage: true });
  await page.setViewportSize({ width: 375, height: 812 });
  await expect(page.locator('#app-sidebar')).not.toBeVisible();
  await page.screenshot({ path: '/tmp/prana-mobile.png', fullPage: true });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 720, height: 550 });
  await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});


test('Esri street tiles use the public endpoint with provider attribution', async ({ page }) => {
  const tileSources = await page.locator('.station-map img.leaflet-tile').evaluateAll(images =>
    images.map(image => image.getAttribute('src')),
  );
  expect(tileSources.length).toBeGreaterThan(0);
  for (const source of tileSources) {
    expect(source).toMatch(/^https:\/\/server\.arcgisonline\.com\/ArcGIS\/rest\/services\/World_Street_Map\/MapServer\/tile\/\d+\/\d+\/\d+$/);
  }
  await expect(page.locator('.leaflet-control-attribution')).toContainText('Esri');
  await expect(page.locator('.leaflet-control-attribution')).toContainText('GIS User Community');
  await page.getByRole('button', { name: 'Ganti tema tampilan' }).click();
  await expect(page.locator('.leaflet-container')).toHaveCount(1);
  await expect(page.locator('.leaflet-interactive')).toHaveCount(27);
});


test('Chart.js composition animates visibly and canvases survive filtering and themes', async ({ page }) => {
  const composition = page.locator('canvas[data-chart="composition"]');
  await expect(page.locator('#opening-screen')).toHaveCount(0);
  await expect(composition).toHaveAttribute('data-animation', 'running');
  const paintedPixels = () => composition.evaluate(node => {
    if (!(node instanceof HTMLCanvasElement)) throw new Error('Expected a chart canvas');
    const context = node.getContext('2d');
    if (!context) throw new Error('Canvas context unavailable');
    const pixels = context.getImageData(0, 0, node.width, node.height).data;
    let count = 0;
    for (let index = 3; index < pixels.length; index += 4) if ((pixels[index] ?? 0) > 0) count++;
    return count;
  });
  const initial = await paintedPixels();
  await expect(composition).toHaveAttribute('data-animation', 'complete');
  expect(await paintedPixels()).toBeGreaterThan(initial);
  await expect(page.locator('.doughnut-center strong')).toHaveText('27');
  await expect(page.locator('.composition-legend')).toContainText('Sedang');
  const original = await composition.elementHandle();
  if (!original) throw new Error('Missing composition chart');
  await page.locator('#dashboard-filters summary').click();
  await choose(page, 'Wilayah', 'Jakarta');
  await expect(page.locator('.doughnut-center strong')).toHaveText('3');
  await expect(composition).toHaveAttribute('aria-label', /Total 3 stasiun/);
  expect(await original.evaluate(node => node.isConnected)).toBe(true);
  await page.getByRole('button', { name: 'Ganti tema tampilan' }).click();
  expect(await original.evaluate(node => node.isConnected)).toBe(true);
  await expect(page.locator('canvas[data-chart]')).toHaveCount(3);
});

test('sidebar width transitions smoothly and dropdown icons are centered', async ({ page }) => {
  const sidebar = page.locator('#app-sidebar');
  const initial = await sidebar.evaluate(node => node.getBoundingClientRect().width);
  await page.getByRole('button', { name: 'Perkecil navigasi' }).click();
  await expect.poll(async () => {
    const width = await sidebar.evaluate(node => node.getBoundingClientRect().width);
    return width > 104 && width < initial;
  }, { intervals: [20, 20, 40, 80] }).toBe(true);
  await expect.poll(() => sidebar.evaluate(node => node.getBoundingClientRect().width)).toBe(104);
  await page.getByRole('button', { name: 'Perbesar navigasi' }).click();
  await expect.poll(() => sidebar.evaluate(node => node.getBoundingClientRect().width)).toBe(initial);
  await page.locator('#dashboard-filters summary').click();
  await expect(page.getByLabel('Wilayah', { exact: true })).toBeVisible();
  const offsets = await page.locator('.search-select').evaluateAll(nodes => nodes.map(node => {
    const select = node.querySelector('input')?.getBoundingClientRect();
    const arrow = node.querySelector('svg')?.getBoundingClientRect();
    if (!select || !arrow) throw new Error('Incomplete dropdown');
    return Math.abs(select.y + select.height / 2 - arrow.y - arrow.height / 2);
  }));
  expect(offsets.every(offset => offset < 1)).toBe(true);
  const disclosureOffset = await page.locator('.filter-disclosure').evaluate(node => {
    const text = node.querySelector('.when-open')?.getBoundingClientRect();
    const arrow = node.querySelector('svg')?.getBoundingClientRect();
    if (!text || !arrow) throw new Error('Incomplete disclosure');
    return Math.abs(text.y + text.height / 2 - arrow.y - arrow.height / 2);
  });
  expect(disclosureOffset).toBeLessThan(1);
});

test('haze opening is branded, skippable, and releases delayed data access', async ({ page }) => {
  let release: () => void = () => undefined;
  const ready = new Promise<void>(resolve => { release = resolve; });
  await page.route('**/tab1_ikhtisar.json', async route => { await ready; await route.continue(); });
  try {
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.locator('#opening-screen')).toBeVisible();
    await expect(page.locator('.opening-wordmark')).toHaveAttribute('alt', 'PRANA');
    await expect(page.locator('.opening-brand')).toHaveCSS('filter', 'blur(0px)');
    await page.screenshot({ path: '/tmp/prana-opening.png' });
    await page.getByRole('button', { name: 'Lihat dashboard' }).click();
    await expect(page.locator('#opening-screen')).toHaveCount(0);
    expect(await page.locator('#app').evaluate(node => node instanceof HTMLElement && node.inert)).toBe(false);
    await expect(page.getByRole('heading', { name: 'Memuat ringkasan stasiun…' })).toBeVisible();
  } finally { release(); }
  await expect(page.getByText('27 dari 27 stasiun')).toBeVisible();
  await expect(page.locator('canvas[data-chart]')).toHaveCount(3);
});

test('opening never traps slow loading and reduced motion disables all chart transitions', async ({ page }) => {
  let release: () => void = () => undefined;
  const ready = new Promise<void>(resolve => { release = resolve; });
  await page.route('**/tab1_ikhtisar.json', async route => { await ready; await route.continue(); });
  try {
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.locator('#opening-screen')).toHaveCount(0, { timeout: 3500 });
    expect(await page.locator('#app').evaluate(node => node instanceof HTMLElement && node.inert)).toBe(false);
  } finally { release(); }
  await expect(page.getByText('27 dari 27 stasiun')).toBeVisible();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.locator('#opening-screen')).toHaveCount(0, { timeout: 500 });
  await expect(page.getByText('27 dari 27 stasiun')).toBeVisible();
  await expect.poll(() => page.locator('canvas[data-chart]').evaluateAll(nodes =>
    nodes.length === 3 && nodes.every(node => node.getAttribute('data-animation') === 'complete'),
  )).toBe(true);
  await expect(page.locator('.app-layout')).toHaveCSS('transition-duration', '0s');
  await page.getByRole('button', { name: 'Ganti tema tampilan' }).click();
  await expect.poll(() => page.locator('canvas[data-chart]').evaluateAll(nodes =>
    nodes.every(node => node.getAttribute('data-animation') === 'complete'),
  )).toBe(true);
});

test('map views preserve station scope and product copy contains no phase commentary', async ({ page }) => {
  await page.getByRole('button', { name: 'Konsentrasi', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Konsentrasi', exact: true })).toHaveAttribute('aria-pressed', 'true');
  const widths = await page.locator('.leaflet-interactive').evaluateAll(nodes => nodes.map(node => Math.round(node.getBoundingClientRect().width)));
  expect(new Set(widths).size).toBeGreaterThan(1);
  await page.locator('#dashboard-filters summary').click();
  await choose(page, 'Wilayah', 'Jakarta');
  await expect(page.locator('.leaflet-interactive')).toHaveCount(3);
  await page.getByRole('button', { name: 'Kategori', exact: true }).click();
  await expect(page.locator('.leaflet-interactive')).toHaveCount(3);
  expect(await page.locator('body').innerText()).not.toMatch(/\b(preliminary|round|kompetisi|perlombaan|executive cockpit)\b/i);
  await page.getByRole('button', { name: 'Metodologi', exact: true }).click();
  expect(await page.getByRole('dialog').innerText()).not.toMatch(/\b(preliminary|round|kompetisi|perlombaan|executive cockpit)\b/i);
});

test('searchable filters support typing, no matches, keyboard selection, and cancellation', async ({ page }) => {
  await page.locator('#dashboard-filters summary').click();
  const region = page.getByRole('combobox', { name: 'Wilayah', exact: true });
  await region.click();
  await region.fill('jAkArTa');
  await expect(page.getByRole('listbox', { name: 'Pilihan wilayah', exact: true }).getByRole('option')).toHaveCount(1);
  await expect(page.getByText('27 dari 27 stasiun')).toBeVisible();
  await region.press('Enter');
  await expect(region).toHaveValue('Jakarta');
  await expect(page.getByText('3 dari 27 stasiun')).toBeVisible();
  const station = page.getByRole('combobox', { name: 'Stasiun', exact: true });
  await station.click();
  await station.fill('no-such-station');
  await expect(page.getByText('Tidak ada stasiun yang cocok.', { exact: true })).toBeVisible();
  await expect(page.getByText('3 dari 27 stasiun')).toBeVisible();
  await station.press('Escape');
  await expect(station).toHaveValue('Semua stasiun');
  await expect(station).toHaveAttribute('aria-expanded', 'false');
  await choose(page, 'Stasiun', 'JKT-03');
  await expect(page.getByText('1 dari 27 stasiun')).toBeVisible();
  await choose(page, 'Wilayah', 'Bogor');
  await expect(station).toHaveValue('Semua stasiun');
  await expect(page.getByText('2 dari 27 stasiun')).toBeVisible();
  await choose(page, 'Tipe lokasi', 'Traffic');
  await expect(page.getByText('1 dari 27 stasiun')).toBeVisible();
  await region.click();
  await region.fill('sumatera');
  const second = await page.getByRole('listbox', { name: 'Pilihan wilayah', exact: true }).getByRole('option').nth(1).innerText();
  await region.press('ArrowDown');
  await region.press('Enter');
  await expect(region).toHaveValue(second);
  await page.getByRole('button', { name: 'Reset filter', exact: true }).click();
  await expect(page.getByText('27 dari 27 stasiun')).toBeVisible();
});

test('chevron stays to the right of the logo in both desktop states', async ({ page }) => {
  const geometry = () => page.locator('.sidebar-brand-row').evaluate(node => {
    const logo = node.querySelector('.brand-emblem')?.getBoundingClientRect();
    const toggle = node.querySelector('.sidebar-collapse')?.getBoundingClientRect();
    if (!logo || !toggle) throw new Error('Missing sidebar controls');
    return { right: toggle.left >= logo.right, centered: Math.abs(logo.y + logo.height / 2 - toggle.y - toggle.height / 2) < 1 };
  });
  expect(await geometry()).toEqual({ right: true, centered: true });
  await page.getByRole('button', { name: 'Perkecil navigasi' }).click();
  await expect.poll(() => page.locator('#app-sidebar').evaluate(node => node.getBoundingClientRect().width)).toBe(104);
  expect(await geometry()).toEqual({ right: true, centered: true });
  await expect(page.locator('.sidebar-collapse path')).toHaveAttribute('d', 'm9 5 7 7-7 7');
  await page.screenshot({ path: '/tmp/prana-sidebar-chevron.png' });
});

test('mobile search popup fits the viewport and closes with the filter panel', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.locator('#dashboard-filters summary').click();
  const station = page.getByRole('combobox', { name: 'Stasiun', exact: true });
  await station.click();
  await station.fill('Jakarta');
  const popup = page.locator('.search-popup:visible');
  const bounds = await popup.boundingBox();
  expect(bounds).not.toBeNull();
  if (!bounds) throw new Error('Missing search popup');
  expect(bounds.x).toBeGreaterThanOrEqual(8);
  expect(bounds.x + bounds.width).toBeLessThanOrEqual(367);
  await expect(page.locator('.search-select.is-open .combobox-toggle svg')).toHaveCSS('transform', 'matrix(-1, 0, 0, -1, 0, 0)');
  await page.screenshot({ path: '/tmp/prana-search-filters.png' });
  await station.press('Escape');
  await page.locator('#dashboard-filters summary').click();
  await expect(page.locator('.search-popup:visible')).toHaveCount(0);
});

test('canonical entry and history navigation use tab paths and preserve selections', async ({ page, request }) => {
  await page.goto('/dashboard/index.html');
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByText('27 dari 27 stasiun')).toBeVisible();
  await page.locator('#dashboard-filters summary').click();
  await choose(page, 'Wilayah', 'Jakarta');
  await page.getByRole('link', { name: 'Pola Waktu', exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard\/pola-waktu$/);
  await page.getByRole('link', { name: 'Dampak Kesehatan', exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard\/dampak-kesehatan$/);
  await page.goBack();
  await expect(page.getByRole('heading', { level: 2 })).toHaveText('Pola Waktu');
  await page.goBack();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByText('3 dari 27 stasiun')).toBeVisible();
  await page.goForward();
  await expect(page).toHaveURL(/\/dashboard\/pola-waktu$/);
  expect((await request.get('/dashboard/not-a-tab')).status()).toBe(404);
  await page.goto('/');
  await expect(page).toHaveURL(/\/dashboard$/);
});

const routeTitles: Record<string, string> = {
  overview: 'Ikhtisar Nasional', compliance: 'Kepatuhan Regulasi', temporal: 'Pola Waktu',
  drivers: 'Faktor Pemicu', health: 'Dampak Kesehatan', recommendations: 'Rekomendasi Kebijakan',
};
for (const [id, path] of Object.entries(ROUTES)) {
  test(`direct access and refresh: ${path}`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const response = await page.goto(path, { waitUntil: 'domcontentloaded' });
    expect(response?.status()).toBe(200);
    await expect(page.getByRole('heading', { level: 2 })).toHaveText(routeTitles[id] ?? '');
    await expect(page.getByRole('link', { name: routeTitles[id] ?? '', exact: true })).toHaveAttribute('aria-current', 'page');
    await page.reload({ waitUntil: 'domcontentloaded' });
    expect(new URL(page.url()).pathname).toBe(path);
    await expect(page.getByRole('heading', { level: 2 })).toHaveText(routeTitles[id] ?? '');
    await page.getByRole('link', { name: 'Ikhtisar Nasional', exact: true }).click();
    await expect(page.getByText('27 dari 27 stasiun')).toBeVisible();
  });
}
