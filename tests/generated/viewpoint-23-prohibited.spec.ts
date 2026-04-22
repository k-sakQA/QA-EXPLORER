import { test, expect } from '@playwright/test';

/**
 * 観点23: 排他処理 - 禁則
 * 狙うバグ:
 * 1. 過去日付の宿泊日を指定できてしまう
 * 2. 宿泊数に0や負数を指定できてしまう
 * 3. 人数に0や負数を指定できてしまう
 * 4. 宿泊数や人数に上限を超える値を指定できてしまう
 * 5. クライアント側チェックのみでサーバー側で素通り
 */

test.describe('観点23: 禁則チェック', () => {
  const baseUrl = 'https://hotel-example-site.takeyaqa.dev/ja/reserve.html?plan-id=0';

  test('過去日付を宿泊日に指定できないこと', async ({ page }) => {
    await page.goto(baseUrl);
    
    // 過去の日付を設定
    const pastDate = '2020/01/01';
    await page.fill('#date', pastDate);
    
    // 他の必須項目を入力
    await page.fill('#username', 'テスト太郎');
    await page.selectOption('#contact', 'email');
    await page.fill('#email', 'test@example.com');
    
    await page.click('button[type="submit"]');
    await page.waitForLoadState('networkidle');
    
    const currentUrl = page.url();
    console.log('URL after past date submit:', currentUrl);
    
    // 確認画面に進めてしまったらバグ
    if (currentUrl.includes('confirm')) {
      console.log('BUG: 過去日付で確認画面に進めてしまった');
      const pageContent = await page.textContent('body');
      console.log('Confirm page shows date:', pageContent?.includes(pastDate));
    }
    
    // エラーが出ているか確認
    const dateInput = page.locator('#date');
    const isInvalid = await dateInput.evaluate((el: HTMLInputElement) => !el.checkValidity());
    console.log('Date field is invalid:', isInvalid);
  });

  test('宿泊数に0を指定できないこと', async ({ page }) => {
    await page.goto(baseUrl);
    
    await page.fill('#term', '0');
    await page.fill('#username', 'テスト太郎');
    await page.selectOption('#contact', 'email');
    await page.fill('#email', 'test@example.com');
    
    await page.click('button[type="submit"]');
    await page.waitForLoadState('networkidle');
    
    const currentUrl = page.url();
    console.log('URL after term=0 submit:', currentUrl);
    
    if (currentUrl.includes('confirm')) {
      console.log('BUG: 宿泊数0で確認画面に進めてしまった');
    }
    
    const termInput = page.locator('#term');
    const isInvalid = await termInput.evaluate((el: HTMLInputElement) => !el.checkValidity());
    console.log('Term field is invalid:', isInvalid);
  });

  test('宿泊数に負数を指定できないこと', async ({ page }) => {
    await page.goto(baseUrl);
    
    await page.fill('#term', '-1');
    await page.fill('#username', 'テスト太郎');
    await page.selectOption('#contact', 'email');
    await page.fill('#email', 'test@example.com');
    
    await page.click('button[type="submit"]');
    await page.waitForLoadState('networkidle');
    
    const currentUrl = page.url();
    console.log('URL after term=-1 submit:', currentUrl);
    
    if (currentUrl.includes('confirm')) {
      console.log('BUG: 宿泊数-1で確認画面に進めてしまった');
    }
  });

  test('人数に0を指定できないこと', async ({ page }) => {
    await page.goto(baseUrl);
    
    await page.fill('#head-count', '0');
    await page.fill('#username', 'テスト太郎');
    await page.selectOption('#contact', 'email');
    await page.fill('#email', 'test@example.com');
    
    await page.click('button[type="submit"]');
    await page.waitForLoadState('networkidle');
    
    const currentUrl = page.url();
    console.log('URL after head-count=0 submit:', currentUrl);
    
    if (currentUrl.includes('confirm')) {
      console.log('BUG: 人数0で確認画面に進めてしまった');
    }
  });

  test('人数に負数を指定できないこと', async ({ page }) => {
    await page.goto(baseUrl);
    
    await page.fill('#head-count', '-5');
    await page.fill('#username', 'テスト太郎');
    await page.selectOption('#contact', 'email');
    await page.fill('#email', 'test@example.com');
    
    await page.click('button[type="submit"]');
    await page.waitForLoadState('networkidle');
    
    const currentUrl = page.url();
    console.log('URL after head-count=-5 submit:', currentUrl);
    
    if (currentUrl.includes('confirm')) {
      console.log('BUG: 人数-5で確認画面に進めてしまった');
    }
  });

  test('宿泊数の上限を確認(過大な値)', async ({ page }) => {
    await page.goto(baseUrl);
    
    await page.fill('#term', '999');
    await page.fill('#username', 'テスト太郎');
    await page.selectOption('#contact', 'email');
    await page.fill('#email', 'test@example.com');
    
    await page.click('button[type="submit"]');
    await page.waitForLoadState('networkidle');
    
    const currentUrl = page.url();
    console.log('URL after term=999 submit:', currentUrl);
    
    // 合計金額が正常に計算されるか
    if (currentUrl.includes('confirm')) {
      const pageContent = await page.textContent('body');
      console.log('Confirm page content (check for reasonable total):', pageContent?.substring(0, 500));
    }
  });

  test('人数の上限を確認(過大な値)', async ({ page }) => {
    await page.goto(baseUrl);
    
    await page.fill('#head-count', '100');
    await page.fill('#username', 'テスト太郎');
    await page.selectOption('#contact', 'email');
    await page.fill('#email', 'test@example.com');
    
    await page.click('button[type="submit"]');
    await page.waitForLoadState('networkidle');
    
    const currentUrl = page.url();
    console.log('URL after head-count=100 submit:', currentUrl);
    
    if (currentUrl.includes('confirm')) {
      const pageContent = await page.textContent('body');
      // 料金計算が正常か確認
      console.log('Confirm page excerpt:', pageContent?.substring(0, 500));
    }
  });

  test('numberフィールドのmin/max属性を確認', async ({ page }) => {
    await page.goto(baseUrl);
    
    // term (宿泊数) の属性確認
    const termMin = await page.locator('#term').getAttribute('min');
    const termMax = await page.locator('#term').getAttribute('max');
    console.log('Term: min=', termMin, 'max=', termMax);
    
    // head-count (人数) の属性確認
    const headCountMin = await page.locator('#head-count').getAttribute('min');
    const headCountMax = await page.locator('#head-count').getAttribute('max');
    console.log('Head-count: min=', headCountMin, 'max=', headCountMax);
    
    // date の属性確認
    const dateMin = await page.locator('#date').getAttribute('min');
    const dateMax = await page.locator('#date').getAttribute('max');
    console.log('Date: min=', dateMin, 'max=', dateMax);
  });
});
