import { expect, test } from '@playwright/test';

test('chat action directives apply filters, navigate, and never show in the bubble', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  const sse = (payload: unknown) => `data: ${JSON.stringify(payload)}\n\n`;
  await page.route('**/api/chat', route => route.fulfill({
    status: 200,
    contentType: 'text/event-stream',
    body: sse({ delta: 'Baik, filter Jakarta dengan polutan NO2 saya terapkan.\n' })
      + sse({ delta: 'Membuka tab Kepatuhan Regulasi.\n[[FILTER: region=Jakarta; pollutant=NO2]]\n[[NAVIGASI: compliance]]' })
      + 'data: [DONE]\n\n',
  }));
  await page.route('**/MapServer/tile/**', route => route.abort());
  await page.goto('/dashboard');
  await expect(page.locator('#filter-summary')).toBeVisible();
  await page.locator('.chat-launcher').click();
  await page.locator('.chat-input').fill('Filter Jakarta polutan NO2 lalu buka Kepatuhan');
  await page.locator('.chat-input').press('Enter');
  await expect(page).toHaveURL(/\/dashboard\/kepatuhan-regulasi/);
  await expect(page.locator('.chat-drawer.is-open')).toHaveCount(0);
  await expect(page.locator('#filter-summary')).toContainText('Jakarta');
  await expect(page.locator('#filter-summary')).toContainText('NO2');
  await page.locator('.chat-launcher').click();
  const bubble = page.locator('.chat-message.assistant .chat-bubble');
  await expect(bubble).toContainText('filter Jakarta');
  await expect(bubble).not.toContainText('[[');
  expect(errors).toEqual([]);
});
