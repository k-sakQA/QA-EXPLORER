import { test, expect } from '@playwright/test';

test.describe('Initial Snapshot - Hotel Reservation Site', () => {
  test('プラン一覧ページの構造を確認', async ({ page }) => {
    await page.goto('https://hotel-example-site.takeyaqa.dev/ja/plans.html');
    
    // ページタイトル確認
    const title = await page.title();
    console.log('Page Title:', title);
    
    // プラン一覧の存在確認
    const plans = await page.locator('[class*="plan"], [class*="card"], article, .room-plan').all();
    console.log('Plans/Cards found:', plans.length);
    
    // 予約ボタン・リンクを探す
    const reserveLinks = await page.locator('a:has-text("予約"), a:has-text("reserve"), button:has-text("予約")').all();
    console.log('Reserve links found:', reserveLinks.length);
    
    // 主要なUI要素をログ
    const headings = await page.locator('h1, h2, h3').allTextContents();
    console.log('Headings:', headings);
    
    // スクリーンショット
    await page.screenshot({ path: 'test-results/initial-plans-page.png', fullPage: true });
  });

  test('予約フォームページの構造を確認', async ({ page }) => {
    await page.goto('https://hotel-example-site.takeyaqa.dev/ja/plans.html');
    
    // 最初のプランの予約リンクをクリック
    const firstReserveLink = page.locator('a:has-text("予約"), a:has-text("このプランで予約")').first();
    if (await firstReserveLink.count() > 0) {
      await firstReserveLink.click();
      await page.waitForLoadState('networkidle');
    } else {
      // 別のセレクタを試す
      const anyLink = page.locator('a[href*="reserve"]').first();
      if (await anyLink.count() > 0) {
        await anyLink.click();
        await page.waitForLoadState('networkidle');
      }
    }
    
    console.log('Current URL:', page.url());
    
    // フォーム要素を探索
    const forms = await page.locator('form').all();
    console.log('Forms found:', forms.length);
    
    // 入力フィールドを列挙
    const inputs = await page.locator('input, select, textarea').all();
    console.log('Input fields found:', inputs.length);
    
    for (const input of inputs) {
      const name = await input.getAttribute('name');
      const type = await input.getAttribute('type');
      const id = await input.getAttribute('id');
      const required = await input.getAttribute('required');
      const placeholder = await input.getAttribute('placeholder');
      console.log(`  - ${name || id || '(unnamed)'}: type=${type}, required=${required !== null}, placeholder=${placeholder}`);
    }
    
    // ラベルを列挙
    const labels = await page.locator('label').allTextContents();
    console.log('Labels:', labels);
    
    // 送信ボタンを探す
    const submitBtns = await page.locator('button[type="submit"], input[type="submit"], button:has-text("予約"), button:has-text("確認")').all();
    console.log('Submit buttons found:', submitBtns.length);
    
    // スクリーンショット
    await page.screenshot({ path: 'test-results/initial-reserve-form.png', fullPage: true });
  });
});
