import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.route('**/MapServer/tile/**', route => route.abort());
  await page.goto('/dashboard/kepatuhan-regulasi');
});

test('container titles group real charts and the annual comparison marks partial years', async ({ page }) => {
  await expect(page.getByRole('heading', { name: 'Ringkasan Kepatuhan PM2.5', exact: true })).toBeVisible();
  await expect(page.locator('.compliance-summary .metric').first()).toContainText('26');
  await expect(page.locator('.compliance-feature canvas')).toHaveCount(6);
  await expect(page.getByRole('heading', { name: 'Perbandingan Konsentrasi Antarstasiun', exact: true })).toBeVisible();
  await expect(page.locator('.compliance-iku-chart canvas')).toBeVisible();
  await page.getByLabel('Tahun evaluasi', { exact: true }).selectOption('2026');
  await page.getByText('Lihat data tahunan & kelengkapan', { exact: true }).click();
  await expect(page.locator('.panel').filter({ has: page.getByRole('heading', { name: 'Evaluasi Acuan Tahunan', exact: true }) }).locator('table')).toContainText('Data tahunan parsial');
  await page.reload();
  await expect(page.locator('.compliance-summary')).toBeVisible();
});

test('station filters update existing canvases and sparse data show an empty result', async ({ page }) => {
  await expect(page.locator('.compliance-feature canvas')).toHaveCount(6);
  const canvas = await page.locator('.compliance-feature canvas').first().elementHandle();
  if (!canvas) throw new Error('Chart not mounted');
  await page.locator('#dashboard-filters summary').click();
  await expect(page.getByRole('button', { name: 'PM10', exact: true })).toBeEnabled();
  await page.getByRole('combobox', { name: 'Stasiun', exact: true }).fill('JKT-01');
  await page.getByRole('listbox').getByRole('option', { name: /JKT-01/ }).click();
  await expect(page.locator('.compliance-metrics .metric').first().locator('strong')).toHaveText('1');
  await expect(page.locator('.compliance-metrics .metric').nth(3).locator('strong')).not.toHaveText('—');
  expect(await page.locator('.compliance-feature canvas').first().evaluate((node, previous) => node === previous, canvas)).toBe(true);
  await page.getByRole('combobox', { name: 'Stasiun', exact: true }).fill('BJB-01');
  await page.getByRole('listbox').getByRole('option', { name: /BJB-01/ }).click();
  await expect(page.locator('.compliance-metrics .metric').first().locator('strong')).toHaveText('1');
  await page.getByRole('combobox', { name: 'Stasiun', exact: true }).fill('JMB-02');
  await page.getByRole('listbox').getByRole('option', { name: /JMB-02/ }).click();
  await expect(page.getByRole('heading', { name: 'Tidak ada pengamatan', exact: true })).toBeVisible();
  await expect(page.locator('.compliance-metrics .metric').first().locator('strong')).toHaveText('0');
  await page.getByRole('link', { name: 'Ikhtisar Nasional', exact: true }).click();
  await expect(page.locator('.compliance-feature')).toHaveCount(0);
  await page.getByRole('link', { name: 'Kepatuhan Regulasi', exact: true }).click();
  await expect(page.locator('.compliance-feature canvas')).toHaveCount(6);
});

test('failed compliance export shows retry rather than invented values', async ({ page }) => {
  await page.route('**/compliance_daily.json', route => route.abort());
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Data kepatuhan belum dapat dimuat' })).toBeVisible();
  await expect(page.locator('.compliance-feature canvas')).toHaveCount(0);
  await page.unroute('**/compliance_daily.json');
  await page.getByRole('button', { name: 'Coba lagi', exact: true }).click();
  await expect(page.locator('.compliance-feature canvas')).toHaveCount(6);
});

test('date and pollutant filters apply to compliance and persist across tabs', async ({ page }) => {
  await expect(page.locator('.compliance-feature canvas')).toHaveCount(6);
  await page.locator('#dashboard-filters summary').click();
  await page.getByRole('combobox', { name: 'Stasiun', exact: true }).fill('JKT-01');
  await page.getByRole('listbox').getByRole('option', { name: /JKT-01/ }).click();
  await page.getByLabel('Tanggal selesai', { exact: true }).fill('2024-01-03');
  await page.getByLabel('Tanggal selesai', { exact: true }).dispatchEvent('change');
  await expect(page.locator('.compliance-metrics .metric').nth(2).locator('.metric-value strong')).toHaveText('3');
  await page.getByRole('link', { name: 'Ikhtisar Nasional', exact: true }).click();
  await page.locator('#dashboard-filters summary').click();
  await page.getByRole('button', { name: 'PM10', exact: true }).click();
  await page.getByRole('link', { name: 'Kepatuhan Regulasi', exact: true }).click();
  await expect(page.locator('#filter-summary')).toContainText('PM10');
  await page.getByRole('link', { name: 'Ikhtisar Nasional', exact: true }).click();
  await expect(page.locator('#filter-summary')).toContainText('PM10');
});

test('compliance fits mobile and desktop in both themes and charts survive theme updates', async ({ page }) => {
  await expect(page.locator('.compliance-feature canvas')).toHaveCount(6);
  const canvas = await page.locator('.compliance-feature canvas').first().elementHandle();
  if (!canvas) throw new Error('Chart not mounted');
  for (const width of [320, 375, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const theme of ['light', 'dark']) {
      await page.evaluate(value => { document.documentElement.dataset['theme'] = value; }, theme);
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await expect(page.locator('.compliance-feature canvas')).toHaveCount(6);
      expect(await page.locator('.compliance-feature canvas').first().evaluate((node, original) => node === original, canvas)).toBe(true);
    }
  }
  await page.screenshot({ path: 'test-results/compliance-desktop.png', fullPage: true });
  await page.setViewportSize({ width: 375, height: 900 });
  await page.screenshot({ path: 'test-results/compliance-mobile.png', fullPage: true });
});

test('category distribution defaults to ten priorities and expands without replacing charts or changing summaries', async ({ page }) => {
  const chart = page.locator('.compliance-category-chart canvas');
  await expect(chart).toHaveAttribute('aria-label', /10 kelompok/);
  await expect(page.locator('#compliance-distribution-scope')).toContainText('10 dari 26');
  const original = await chart.elementHandle();
  if (!original) throw new Error('Distribution chart not mounted');
  const summary = await page.locator('.compliance-metrics').innerText();
  for (const plot of await page.locator('.compliance-subpanel .compliance-plot').all()) {
    const bounds = await plot.boundingBox();
    expect(bounds?.height).toBeLessThanOrEqual(270);
  }
  await page.getByRole('button', { name: 'Semua stasiun', exact: true }).click();
  await expect(chart).toHaveAttribute('aria-label', /26 kelompok/);
  expect(await chart.evaluate((node, previous) => node === previous, original)).toBe(true);
  expect(await page.locator('.compliance-metrics').innerText()).toBe(summary);
  await page.getByRole('button', { name: 'Prioritas', exact: true }).click();
  await expect(chart).toHaveAttribute('aria-label', /10 kelompok/);
  await page.locator('#dashboard-filters summary').click();
  await page.getByRole('combobox', { name: 'Stasiun', exact: true }).fill('JKT-01');
  await page.getByRole('listbox').getByRole('option', { name: /JKT-01/ }).click();
  await expect(chart).toHaveAttribute('aria-label', /1 kelompok/);
  await expect(page.locator('#compliance-distribution-scope')).toContainText('1 dari 1');
});

test('all six pollutants update real results and references without replacing chart instances', async ({ page }) => {
  await page.locator('#dashboard-filters summary').click();
  await page.getByRole('combobox', { name: 'Stasiun', exact: true }).fill('JKT-01');
  await page.getByRole('listbox').getByRole('option', { name: /JKT-01/ }).click();
  const canvas = await page.locator('.compliance-feature canvas').first().elementHandle();
  if (!canvas) throw new Error('Chart not mounted');
  const concentrations = new Set<string>();
  for (const name of ['PM2.5', 'PM10', 'SO2', 'NO2', 'CO', 'O3']) {
    await page.getByRole('button', { name, exact: true }).click();
    await expect(page.getByRole('heading', { name: `Ringkasan Kepatuhan ${name}`, exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: `Distribusi Kategori Harian ${name}`, exact: true })).toBeVisible();
    concentrations.add(await page.locator('.compliance-metrics .metric').nth(3).locator('strong').innerText());
    expect(await page.locator('.compliance-feature canvas').first().evaluate((node, original) => node === original, canvas)).toBe(true);
    if (name === 'CO') await expect(page.getByText('CO: PP 22/2021 tidak menetapkan acuan tahunan', { exact: true })).toBeVisible();
    if (name === 'O3') await expect(page.locator('.compliance-summary')).toContainText('maksimum rata-rata 8 jam');
    if (name === 'SO2') await expect(page.locator('.panel').filter({ has: page.getByRole('heading', { name: 'Evaluasi Acuan Tahunan', exact: true }) })).toContainText('45');
  }
  expect(concentrations.size).toBe(6);
  await page.getByRole('button', { name: 'Reset filter', exact: true }).click();
  await expect(page.locator('#filter-summary')).toContainText('PM2.5');
  await expect(page.locator('.compliance-metrics .metric').first().locator('strong')).toHaveText('26');
});

test('IKU follows dates, region, site, station and QC while retaining NO2/SO2 scope', async ({ page }) => {
  const canvas = page.locator('.compliance-iku-chart canvas');
  await expect(canvas).toBeVisible();
  await page.getByText('Lihat seluruh estimasi & cakupan IKU', { exact: true }).click();
  const table = page.getByRole('region', { name: 'Tabel estimasi IKU; geser horizontal bila diperlukan' }).locator('table');
  await expect(table.locator('tbody tr')).toHaveCount(27);
  const original = await canvas.elementHandle(); if (!original) throw new Error('IKU chart not mounted');
  const initial = await table.innerText();
  await page.locator('#dashboard-filters summary').click();
  await page.getByRole('button', { name: 'CO', exact: true }).click();
  expect(await table.innerText()).toBe(initial);
  await page.getByRole('combobox', { name: 'Wilayah', exact: true }).fill('Jakarta');
  await page.getByRole('listbox').getByRole('option', { name: 'Jakarta', exact: true }).click();
  await expect(table.locator('tbody tr')).toHaveCount(3);
  await expect(page.locator('#compliance-iku-scope')).toContainText('3/3');
  await page.getByRole('combobox', { name: 'Tipe lokasi', exact: true }).fill('Urban Background');
  await page.getByRole('listbox').getByRole('option', { name: 'Urban Background', exact: true }).click();
  await expect(page.locator('#compliance-iku-scope')).toContainText('1/1');
  await page.getByRole('combobox', { name: 'Stasiun', exact: true }).fill('JKT-01');
  await page.getByRole('listbox').getByRole('option', { name: /JKT-01/ }).click();
  const beforeDate = await table.innerText();
  await page.getByLabel('Tanggal selesai', { exact: true }).fill('2024-01-30');
  await page.getByLabel('Tanggal selesai', { exact: true }).dispatchEvent('change');
  await expect.poll(() => table.innerText()).not.toBe(beforeDate);
  const beforeQC = await table.innerText();
  await page.getByLabel('Sertakan data SUSPECT', { exact: true }).check();
  await expect.poll(() => table.innerText()).not.toBe(beforeQC);
  expect(await canvas.evaluate((node, previous) => node === previous, original)).toBe(true);
  await page.getByRole('button', { name: 'Reset filter', exact: true }).click();
  await page.getByRole('combobox', { name: 'Stasiun', exact: true }).fill('BJB-01');
  await page.getByRole('listbox').getByRole('option', { name: /BJB-01/ }).click();
  await expect(canvas).toBeVisible();
  await expect(page.locator('#compliance-iku-scope')).toContainText('1/1');
  await expect(table).not.toContainText('Tidak tersedia');
  await page.getByRole('button', { name: 'NO2', exact: true }).click();
  await expect(page.locator('.compliance-metrics .metric').first().locator('strong')).toHaveText('1');
  await page.getByRole('combobox', { name: 'Stasiun', exact: true }).fill('JMB-02');
  await page.getByRole('listbox').getByRole('option', { name: /JMB-02/ }).click();
  await expect(page.getByRole('heading', { name: 'Estimasi IKU tidak tersedia', exact: true })).toBeVisible();
  await expect(table).toContainText('Tidak tersedia');
  await expect(canvas).not.toBeVisible();
  await page.getByRole('button', { name: 'NO2', exact: true }).click();
  await expect(page.locator('.compliance-metrics .metric').first().locator('strong')).toHaveText('0');
});

test('grouped year comparison shows four station defaults with a complete table and fixed comparison dates', async ({ page }) => {
  const chart = page.locator('.compliance-years-chart canvas');
  await expect(chart).toBeVisible();
  await expect(page.getByRole('group', { name: 'Legenda tahun pembanding' })).toContainText('2024');
  await page.getByText('Lihat perbandingan seluruh stasiun', { exact: true }).click();
  const table = page.getByRole('region', { name: 'Tabel perbandingan antar-tahun; geser horizontal bila diperlukan' }).locator('table');
  await expect(table.locator('tbody tr')).toHaveCount(27);
  const labels = page.locator('.compliance-years-chart .sr-only li');
  const count = await labels.count(); expect(count).toBe(4);
  await expect(chart).toHaveAttribute('aria-label', new RegExp(`${count} kelompok`));
  await expect(labels.filter({ hasText: 'PLB-01' })).toHaveCount(1);
  await expect(labels.filter({ hasText: 'KTG-02' })).toHaveCount(0);
  await expect(table.getByRole('columnheader', { name: 'Pada grafik', exact: true })).toHaveCount(0);
  await expect(table.locator('thead th')).toHaveCount(8);
  await expect(table.locator('tbody tr').filter({ hasText: 'AQMS-JMB-02' })).toContainText('Data tidak lengkap');
  const original = await chart.elementHandle(); if (!original) throw new Error('Year comparison not mounted');
  const before = await table.innerText();
  const chosenName = await labels.first().innerText();
  const station = `AQMS-${chosenName.split(':')[0] ?? ''}`; if (!station) throw new Error('Example station missing');
  await page.locator('#dashboard-filters summary').click();
  await page.getByLabel('Tanggal selesai', { exact: true }).fill('2024-01-03');
  await page.getByLabel('Tanggal selesai', { exact: true }).dispatchEvent('change');
  expect(await table.innerText()).toBe(before);
  await page.getByRole('combobox', { name: 'Stasiun', exact: true }).fill(station);
  await page.getByRole('listbox').getByRole('option', { name: new RegExp(station) }).click();
  await expect(table.locator('tbody tr')).toHaveCount(1);
  await expect(chart).toHaveAttribute('aria-label', /1 kelompok/);
  expect(await chart.evaluate((node, previous) => node === previous, original)).toBe(true);
  await page.getByRole('combobox', { name: 'Stasiun', exact: true }).fill('JMB-02');
  await page.getByRole('listbox').getByRole('option', { name: /JMB-02/ }).click();
  await expect(page.getByRole('heading', { name: 'Data pembanding tidak tersedia', exact: true })).toBeVisible();
  await expect(chart).not.toBeVisible();
  await expect(table).toContainText('Tidak tersedia');
});

test('year bars are vertical and paired chart panels fill equal heights without a footer gap', async ({ page }) => {
  await expect(page.locator('.compliance-years-chart canvas')).toBeVisible();
  for (const width of [1440, 375]) {
    await page.setViewportSize({ width, height: 1000 });
    const panels = page.locator('.compliance-analysis-pair > .panel');
    await expect.poll(async () => {
      const left = await panels.nth(0).boundingBox(); const right = await panels.nth(1).boundingBox();
      return Math.abs((left?.height ?? 0) - (right?.height ?? 0));
    }).toBeLessThan(2);
    for (const panel of await panels.all()) {
      const bounds = await panel.boundingBox(); const footer = await panel.locator('.data-disclosure').last().boundingBox();
      if (!bounds || !footer) throw new Error('Panel geometry unavailable');
      expect(bounds.y + bounds.height - footer.y - footer.height).toBeLessThanOrEqual(24);
      expect(bounds.height).toBeLessThan(510);
    }
  }
  const shape = await page.locator('.compliance-years-chart canvas').evaluate(node => {
    if (!(node instanceof HTMLCanvasElement)) throw new Error('Expected canvas');
    const ctx = node.getContext('2d'); if (!ctx) throw new Error('Canvas context unavailable');
    const pixels = ctx.getImageData(0, 0, node.width, node.height).data;
    const blue = (x: number, y: number): boolean => { const i = (y * node.width + x) * 4; return pixels[i] === 2 && pixels[i + 1] === 132 && pixels[i + 2] === 199; };
    const columns: number[] = [];
    for (let x = 0; x < node.width; x++) for (let y = 0; y < node.height; y++) if (blue(x, y)) { columns.push(x); break; }
    const first = columns[0]; if (first === undefined) throw new Error('Year bar color missing');
    const occupied = new Set(columns); let last = first;
    while (occupied.has(last + 1)) last++;
    let top = node.height; let bottom = 0;
    for (let x = first; x <= last; x++) for (let y = 0; y < node.height; y++) if (blue(x, y)) { top = Math.min(top, y); bottom = Math.max(bottom, y); }
    return { width: last - first + 1, height: bottom - top + 1 };
  });
  expect(shape.height).toBeGreaterThan(shape.width * 2);
});

test('local comparison picker supports four distinct searchable choices without changing other panels', async ({ page }) => {
  const chart = page.locator('.compliance-years-chart canvas');
  await expect(chart).toHaveAttribute('aria-label', /4 kelompok/);
  const original = await chart.elementHandle(); if (!original) throw new Error('Comparison chart not mounted');
  const metrics = await page.locator('.compliance-metrics').innerText();
  const iku = await page.locator('#compliance-iku-scope').innerText();
  const labels = page.locator('.compliance-years-chart .sr-only li');
  await page.getByText('Pilih stasiun pembanding', { exact: true }).click();
  for (const [slot, code] of [[1, 'SM2-01'], [2, 'KTG-01'], [3, 'PLB-01'], [4, 'BJB-01']] as const) await expect(page.getByRole('combobox', { name: `Pembanding ${slot}`, exact: true })).toHaveValue(new RegExp(code));
  const first = page.getByRole('combobox', { name: 'Pembanding 1', exact: true });
  await first.fill('BJB-01');
  await expect(page.getByRole('listbox', { name: 'Pilihan pembanding 1', exact: true }).getByRole('option', { name: /BJB-01/ })).toHaveCount(0);
  await first.press('Escape'); await expect(first).toHaveValue(/SM2-01/);
  await first.fill('BGR-01');
  await expect(labels.filter({ hasText: 'SM2-01' })).toHaveCount(1);
  await first.press('Escape');
  await first.fill('BGR-01');
  await page.getByRole('listbox', { name: 'Pilihan pembanding 1', exact: true }).getByRole('option', { name: /BGR-01/ }).click();
  await expect(labels.filter({ hasText: 'BGR-01' })).toHaveCount(1);
  await expect(labels.filter({ hasText: 'SM2-01' })).toHaveCount(0);
  expect(await page.locator('.compliance-metrics').innerText()).toBe(metrics);
  expect(await page.locator('#compliance-iku-scope').innerText()).toBe(iku);
  expect(await chart.evaluate((node, previous) => node === previous, original)).toBe(true);
  await page.locator('#dashboard-filters summary').click();
  await page.getByRole('button', { name: 'PM10', exact: true }).click();
  await expect(first).toHaveValue(/BGR-01/);
  await page.getByRole('combobox', { name: 'Wilayah', exact: true }).fill('Jakarta');
  await page.getByRole('listbox', { name: 'Pilihan wilayah', exact: true }).getByRole('option', { name: 'Jakarta', exact: true }).click();
  await expect(labels).toHaveCount(3);
  await expect(labels.first()).toContainText('JKT-01');
  for (const slot of [1, 2, 3]) {
    await page.getByRole('combobox', { name: `Pembanding ${slot}`, exact: true }).fill('Tidak dipilih');
    await page.getByRole('listbox', { name: `Pilihan pembanding ${slot}`, exact: true }).getByRole('option', { name: 'Tidak dipilih', exact: true }).click();
  }
  await expect(page.getByRole('heading', { name: 'Pilih stasiun pembanding', exact: true })).toBeVisible();
  await expect(chart).not.toBeVisible();
  await first.fill('JKT-02');
  await page.getByRole('listbox', { name: 'Pilihan pembanding 1', exact: true }).getByRole('option', { name: /JKT-02/ }).click();
  await expect(chart).toBeVisible(); await expect(labels).toHaveCount(1);
});

test('annual evaluation starts at top ten and expands without changing other charts or the complete table', async ({ page }) => {
  const panel = page.locator('.panel').filter({ has: page.getByRole('heading', { name: 'Evaluasi Acuan Tahunan', exact: true }) });
  const chart = panel.locator('canvas');
  const modes = page.getByRole('group', { name: 'Tampilan evaluasi tahunan', exact: true });
  await expect(modes.getByRole('button', { name: 'Top 10', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(chart).toHaveAttribute('aria-label', /10 stasiun/);
  const scope = page.locator('#compliance-annual-scope');
  await expect(scope).toContainText('10 dari');
  const initialScope = await scope.innerText(); const match = initialScope.match(/10 dari (\d+)/);
  if (!match?.[1]) throw new Error('Annual measured scope missing');
  const total = Number(match[1]); const original = await chart.elementHandle();
  if (!original) throw new Error('Annual chart missing');
  const metrics = await page.locator('.compliance-metrics').innerText();
  const comparisons = await page.locator('.compliance-years-chart .sr-only').innerText();
  await modes.getByRole('button', { name: 'Seluruh stasiun', exact: true }).click();
  await expect(chart).toHaveAttribute('aria-label', new RegExp(`${total} stasiun`));
  await expect(scope).toContainText(`${total} dari ${total}`);
  expect(await chart.evaluate((node, previous) => node === previous, original)).toBe(true);
  expect(await page.locator('.compliance-metrics').innerText()).toBe(metrics);
  expect(await page.locator('.compliance-years-chart .sr-only').innerText()).toBe(comparisons);
  await panel.getByText('Lihat data tahunan & kelengkapan', { exact: true }).click();
  const tableCount = await panel.locator('tbody tr').count();
  await modes.getByRole('button', { name: 'Top 10', exact: true }).click();
  await expect(chart).toHaveAttribute('aria-label', /10 stasiun/);
  await expect(panel.locator('tbody tr')).toHaveCount(tableCount);
  await page.locator('#dashboard-filters summary').click();
  await page.getByRole('combobox', { name: 'Stasiun', exact: true }).fill('JKT-01');
  await page.getByRole('listbox', { name: 'Pilihan stasiun', exact: true }).getByRole('option', { name: /JKT-01/ }).click();
  await expect(scope).toContainText('1 dari 1');
  await page.getByRole('button', { name: 'CO', exact: true }).click();
  await expect(modes.getByRole('button', { name: 'Top 10', exact: true })).toBeDisabled();
  await expect(modes.getByRole('button', { name: 'Seluruh stasiun', exact: true })).toBeDisabled();
  await expect(scope).toContainText('Acuan tahunan tidak tersedia');
});

test('annual partial-data option changes only the plotted scope and exposes full-calendar coverage', async ({ page }) => {
  const panel = page.locator('.panel').filter({ has: page.getByRole('heading', { name: 'Evaluasi Acuan Tahunan', exact: true }) });
  await expect(page.getByRole('heading', { name: 'Perbandingan Pelampauan Antar-Tahun', exact: true })).toBeVisible();
  const partial = panel.getByRole('checkbox', { name: 'Sertakan data parsial', exact: true });
  await expect(partial).not.toBeChecked();
  const scope = page.locator('#compliance-annual-scope');
  await expect(scope).toContainText('data parsial dikecualikan');
  const metrics = await page.locator('.compliance-metrics').innerText();
  const comparison = await page.locator('.compliance-years-chart .sr-only').innerText();
  const chart = panel.locator('canvas'); const original = await chart.elementHandle();
  if (!original) throw new Error('Annual chart missing');
  await panel.getByText('Lihat data tahunan & kelengkapan', { exact: true }).click();
  const tableBefore = await panel.locator('table').innerText();
  await panel.getByRole('button', { name: 'Seluruh stasiun', exact: true }).click();
  await partial.check();
  await expect(chart).toHaveAttribute('aria-label', /26 stasiun/);
  expect(await panel.locator('table').innerText()).toBe(tableBefore);
  expect(await chart.evaluate((node, previous) => node === previous, original)).toBe(true);
  expect(await page.locator('.compliance-metrics').innerText()).toBe(metrics);
  expect(await page.locator('.compliance-years-chart .sr-only').innerText()).toBe(comparison);
  await panel.getByRole('combobox', { name: 'Tahun evaluasi', exact: true }).selectOption('2026');
  await expect(partial).toBeChecked();
  await expect(chart).toBeVisible();
  await partial.uncheck();
  await expect(chart).not.toBeVisible();
  await expect(scope).toContainText('Seluruh data terukur parsial');
  await partial.check();
  await panel.getByRole('combobox', { name: 'Tahun evaluasi', exact: true }).selectOption('2024');
  await expect(panel.locator('.sr-only li').first()).toContainText(/Cakupan: .* \/ 366 hari \([\d,.]+%\)/);
  await expect(panel.locator('.sr-only li').filter({ hasText: 'Data tahunan parsial' })).not.toHaveCount(0);
  await page.locator('#dashboard-filters summary').click();
  await page.getByRole('button', { name: 'CO', exact: true }).click();
  await expect(partial).toBeChecked(); await expect(partial).toBeDisabled();
});
