import { test, expect } from '@playwright/test';

/**
 * 観点08: 入力 - 数値(異常値)
 * 狙うバグ:
 * 1. 負数や0が許容される(観点23で確認済み)
 * 2. 上限を超える値で計算エラー
 * 3. 小数点入力で予期しない挙動
 * 4. 文字列入力で予期しない挙動
 * 5. 指数表記で予期しない挙動
 */

test.describe('観点08: 数値(異常値)', () => {
  const baseUrl = 'https://hotel-example-site.takeyaqa.dev/ja/reserve.html?plan-id=0';

  test('宿泊数に小数を入力', async ({ page }) => {
    await page.goto(baseUrl);
    
    await page.fill('#term', '1.5');
    await page.fill('#username', 'テスト太郎');
    await page.selectOption('#contact', 'no');
    
    await page.click('button[type="submit"]');
    await page.waitForLoadState('networkidle');
    
    const currentUrl = page.url();
    console.log('URL after term=1.5:', currentUrl);
    
    // 小数が許容されるか確認
    if (currentUrl.includes('confirm')) {
      console.log('Note: 小数の宿泊数が許容された');
    }
  });

  test('人数に小数を入力', async ({ page }) => {
    await page.goto(baseUrl);
    
    await page.fill('#head-count', '2.5');
    await page.fill('#username', 'テスト太郎');
    await page.selectOption('#contact', 'no');
    
    await page.click('button[type="submit"]');
    await page.waitForLoadState('networkidle');
    
    const currentUrl = page.url();
    console.log('URL after head-count=2.5:', currentUrl);
  });

  test('宿泊数に指数表記を入力', async ({ page }) => {
    await page.goto(baseUrl);
    
    await page.fill('#term', '1e2'); // 100
    await page.fill('#username', 'テスト太郎');
    await page.selectOption('#contact', 'no');
    
    await page.click('button[type="submit"]');
    await page.waitForLoadState('networkidle');
    
    const currentUrl = page.url();
    console.log('URL after term=1e2:', currentUrl);
  });

  test('宿泊数の上限境界を探る(7, 8, 9)', async ({ page }) => {
    await page.goto(baseUrl);
    
    // 7泊
    await page.fill('#term', '7');
    await page.fill('#username', 'テスト太郎');
    await page.selectOption('#contact', 'no');
    await page.click('button[type="submit"]');
    await page.waitForLoadState('networkidle');
    console.log('7泊:', page.url().includes('confirm') ? 'OK' : 'NG');
    
    await page.goto(baseUrl);
    
    // 8泊
    await page.fill('#term', '8');
    await page.fill('#username', 'テスト太郎');
    await page.selectOption('#contact', 'no');
    await page.click('button[type="submit"]');
    await page.waitForLoadState('networkidle');
    console.log('8泊:', page.url().includes('confirm') ? 'OK' : 'NG');
    
    await page.goto(baseUrl);
    
    // 9泊
    await page.fill('#term', '9');
    await page.fill('#username', 'テスト太郎');
    await page.selectOption('#contact', 'no');
    await page.click('button[type="submit"]');
    await page.waitForLoadState('networkidle');
    console.log('9泊:', page.url().includes('confirm') ? 'OK' : 'NG');
  });

  test('人数の上限境界を探る(7, 8, 9)', async ({ page }) => {
    await page.goto(baseUrl);
    
    // 7名
    await page.fill('#head-count', '7');
    await page.fill('#username', 'テスト太郎');
    await page.selectOption('#contact', 'no');
    await page.click('button[type="submit"]');
    await page.waitForLoadState('networkidle');
    console.log('7名:', page.url().includes('confirm') ? 'OK' : 'NG');
    
    await page.goto(baseUrl);
    
    // 8名
    await page.fill('#head-count', '8');
    await page.fill('#username', 'テスト太郎');
    await page.selectOption('#contact', 'no');
    await page.click('button[type="submit"]');
    await page.waitForLoadState('networkidle');
    console.log('8名:', page.url().includes('confirm') ? 'OK' : 'NG');
    
    await page.goto(baseUrl);
    
    // 9名
    await page.fill('#head-count', '9');
    await page.fill('#username', 'テスト太郎');
    await page.selectOption('#contact', 'no');
    await page.click('button[type="submit"]');
    await page.waitForLoadState('networkidle');
    console.log('9名:', page.url().includes('confirm') ? 'OK' : 'NG');
  });

  test('宿泊数に非常に大きな値を入力', async ({ page }) => {
    await page.goto(baseUrl);
    
    await page.fill('#term', '99999999999');
    await page.fill('#username', 'テスト太郎');
    await page.selectOption('#contact', 'no');
    
    await page.click('button[type="submit"]');
    await page.waitForLoadState('networkidle');
    
    const currentUrl = page.url();
    console.log('URL after term=99999999999:', currentUrl);
  });

  test('数値フィールドにNaNを入力', async ({ page }) => {
    await page.goto(baseUrl);
    
    // type=numberフィールドにNaNを直接入力することはできないが、
    // JavaScriptで値を設定することは可能
    await page.evaluate(() => {
      const termInput = document.getElementById('term') as HTMLInputElement;
      termInput.value = 'NaN';
    });
    
    await page.fill('#username', 'テスト太郎');
    await page.selectOption('#contact', 'no');
    
    await page.click('button[type="submit"]');
    await page.waitForLoadState('networkidle');
    
    const currentUrl = page.url();
    console.log('URL after term=NaN:', currentUrl);
  });
});
