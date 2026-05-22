import { test, expect, Page } from '@playwright/test';

/**
 * Session 6: 追加深掘り
 * 1. plan-id=1 の再テスト (head-count=2で)
 * 2. 日付境界値の絞り込み (90-180日)
 * 3. plan-id=8 カップル限定の特殊制約テスト
 */

const BASE = 'https://hotel-example-site.takeyaqa.dev/ja';

function futureDate(daysAhead: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
}

async function fillValidFormForPlan(page: Page, planId: number) {
  await page.locator('#date').fill(futureDate(2));
  await page.keyboard.press('Escape');
  await page.locator('#term').fill('1');
  // plan-id=1,8は人数min=2
  const headMin = await page.locator('#head-count').getAttribute('min') || '1';
  await page.locator('#head-count').fill(headMin);
  const username = page.locator('#username');
  if (await username.isVisible()) {
    await username.fill('テスト太郎');
  }
  await page.locator('#contact').selectOption('no');
}

// ========================================
// plan-id=1 再テスト (head-count=2)
// ========================================
test.describe('plan-id=1 プレミアムプラン: 正しいmin値で再テスト', () => {

  test('plan-id=1: JS改ざん(宿泊数0) — head-count=2で', async ({ page }) => {
    await page.goto(`${BASE}/reserve.html?plan-id=1`);
    await fillValidFormForPlan(page, 1);

    await page.locator('#term').evaluate((el: HTMLInputElement) => {
      el.removeAttribute('min'); el.value = '0';
    });
    await page.locator('#term').dispatchEvent('change');
    await page.getByRole('button', { name: '予約内容を確認する' }).click();
    await page.waitForLoadState('networkidle');
    const passed = page.url().includes('confirm.html');
    console.log(`[再テスト] plan-id=1 宿泊数0: ${passed ? '★通過★' : '弾かれた'}`);
  });

  test('plan-id=1: 全角スペース氏名 — head-count=2で', async ({ page }) => {
    await page.goto(`${BASE}/reserve.html?plan-id=1`);
    await fillValidFormForPlan(page, 1);
    await page.locator('#username').fill('\u3000\u3000');
    await page.getByRole('button', { name: '予約内容を確認する' }).click();
    await page.waitForLoadState('networkidle');
    const passed = page.url().includes('confirm.html');
    console.log(`[再テスト] plan-id=1 全角スペース: ${passed ? '★通過★' : '弾かれた'}`);
  });

  test('plan-id=1: hidden料金改ざん — head-count=2で', async ({ page }) => {
    await page.goto(`${BASE}/reserve.html?plan-id=1`);
    await fillValidFormForPlan(page, 1);

    const originalBill = await page.locator('#room-bill-hidden').inputValue();
    await page.locator('#room-bill-hidden').evaluate(
      (el: HTMLInputElement) => { el.value = '0'; }
    );
    await page.getByRole('button', { name: '予約内容を確認する' }).click();
    await page.waitForLoadState('networkidle');

    if (page.url().includes('confirm.html')) {
      const bodyText = await page.locator('body').textContent() || '';
      const priceMatch = bodyText.match(/合計\s*([\d,]+)円/);
      console.log(`[再テスト] plan-id=1 料金改ざん: 元=${originalBill} → ${priceMatch?.[1]}円`);
    } else {
      console.log(`[再テスト] plan-id=1 料金改ざん: 弾かれた`);
    }
  });
});

// ========================================
// plan-id=8 カップル限定: 特殊制約テスト
// ========================================
test.describe('plan-id=8 カップル限定: 特殊制約テスト', () => {

  test('head-count=2(固定)でJS改ざん(宿泊数0)', async ({ page }) => {
    await page.goto(`${BASE}/reserve.html?plan-id=8`);
    await fillValidFormForPlan(page, 8);

    await page.locator('#term').evaluate((el: HTMLInputElement) => {
      el.removeAttribute('min'); el.value = '0';
    });
    await page.locator('#term').dispatchEvent('change');
    await page.getByRole('button', { name: '予約内容を確認する' }).click();
    await page.waitForLoadState('networkidle');
    const passed = page.url().includes('confirm.html');
    console.log(`[カップル] 宿泊数0: ${passed ? '★通過★' : '弾かれた'}`);
  });

  test('人数をJS改ざんで1人に(min=max=2を回避)', async ({ page }) => {
    await page.goto(`${BASE}/reserve.html?plan-id=8`);
    await fillValidFormForPlan(page, 8);

    await page.locator('#head-count').evaluate((el: HTMLInputElement) => {
      el.removeAttribute('min'); el.removeAttribute('max'); el.value = '1';
    });
    await page.locator('#head-count').dispatchEvent('change');
    await page.getByRole('button', { name: '予約内容を確認する' }).click();
    await page.waitForLoadState('networkidle');

    if (page.url().includes('confirm.html')) {
      const bodyText = await page.locator('body').textContent() || '';
      console.log(`[カップル] ★★ BUG: カップル限定なのに1人予約が通過 ★★`);
      const priceMatch = bodyText.match(/合計\s*([\d,]+)円/);
      console.log(`[カップル] 1人の場合の金額: ${priceMatch?.[1]}円`);
    } else {
      console.log(`[カップル] 1人予約は弾かれた`);
    }
  });

  test('宿泊数をJS改ざんで3泊に(max=2を回避)', async ({ page }) => {
    await page.goto(`${BASE}/reserve.html?plan-id=8`);
    await fillValidFormForPlan(page, 8);

    await page.locator('#term').evaluate((el: HTMLInputElement) => {
      el.removeAttribute('max'); el.value = '3';
    });
    await page.locator('#term').dispatchEvent('change');
    await page.getByRole('button', { name: '予約内容を確認する' }).click();
    await page.waitForLoadState('networkidle');

    if (page.url().includes('confirm.html')) {
      const bodyText = await page.locator('body').textContent() || '';
      const priceMatch = bodyText.match(/合計\s*([\d,]+)円/);
      console.log(`[カップル] ★★ BUG: カップル限定(max=2泊)なのに3泊が通過 金額=${priceMatch?.[1]}円 ★★`);
    } else {
      console.log(`[カップル] 3泊は弾かれた`);
    }
  });
});

// ========================================
// 日付境界値の絞り込み (90-180日)
// ========================================
test.describe('日付境界値: 90-180日の絞り込み', () => {
  // 90日OK、180日NGなので、120, 150を試す
  const narrowDates = [
    { days: 91, label: '91日後' },
    { days: 100, label: '100日後' },
    { days: 120, label: '120日後' },
    { days: 150, label: '150日後' },
  ];

  for (const { days, label } of narrowDates) {
    test(`${label}(+${days}日) → 予約可能か`, async ({ page }) => {
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
      console.log(`[日付絞込] ${label}(+${days}日): ${passed ? '予約可能' : '弾かれた'}`);
    });
  }
});
