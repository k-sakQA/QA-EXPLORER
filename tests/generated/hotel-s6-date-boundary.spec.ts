import { test, expect } from '@playwright/test';

const BASE = 'https://hotel-example-site.takeyaqa.dev/ja';

function futureDate(daysAhead: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
}

test.describe('日付境界値: 91-99日の精密特定', () => {
  for (const days of [92, 93, 94, 95, 96, 97, 98, 99]) {
    test(`+${days}日 → 予約可能か`, async ({ page }) => {
      await page.goto(`${BASE}/reserve.html?plan-id=0`);
      await page.locator('#date').fill(futureDate(days));
      await page.keyboard.press('Escape');
      await page.locator('#term').fill('1');
      await page.locator('#head-count').fill('1');
      const username = page.locator('#username');
      if (await username.isVisible()) {
        await username.fill('テスト太郎');
      }
      await page.locator('#contact').selectOption('no');
      await page.getByRole('button', { name: '予約内容を確認する' }).click();
      await page.waitForLoadState('networkidle');
      const passed = page.url().includes('confirm.html');
      console.log(`[日付精密] +${days}日 (${futureDate(days)}): ${passed ? '予約可能' : '弾かれた'}`);
    });
  }
});
