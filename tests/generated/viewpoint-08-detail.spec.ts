import { test, expect } from '@playwright/test';

test.describe('観点08詳細: 7名問題とNaN問題', () => {
  const baseUrl = 'https://hotel-example-site.takeyaqa.dev/ja/reserve.html?plan-id=0';

  test('7名が弾かれる原因を調査', async ({ page }) => {
    await page.goto(baseUrl);
    
    await page.fill('#head-count', '7');
    await page.fill('#username', 'テスト太郎');
    await page.selectOption('#contact', 'no');
    
    // 送信前の状態を確認
    const headCountValue = await page.inputValue('#head-count');
    console.log('head-count value before submit:', headCountValue);
    
    await page.click('button[type="submit"]');
    await page.waitForTimeout(1000); // 少し長めに待つ
    
    const currentUrl = page.url();
    console.log('URL after submit:', currentUrl);
    
    // エラーメッセージがあるか
    const errorMessages = await page.locator('.error, .invalid-feedback, [class*="error"], [role="alert"]').allTextContents();
    console.log('Error messages:', errorMessages);
    
    // head-countのバリデーション状態
    const isInvalid = await page.locator('#head-count').evaluate((el: HTMLInputElement) => !el.checkValidity());
    const validationMessage = await page.locator('#head-count').evaluate((el: HTMLInputElement) => el.validationMessage);
    console.log('head-count is invalid:', isInvalid);
    console.log('Validation message:', validationMessage);
    
    await page.screenshot({ path: 'test-results/viewpoint-08-7persons.png', fullPage: true });
  });

  test('6名は通るか確認', async ({ page }) => {
    await page.goto(baseUrl);
    
    await page.fill('#head-count', '6');
    await page.fill('#username', 'テスト太郎');
    await page.selectOption('#contact', 'no');
    
    await page.click('button[type="submit"]');
    await page.waitForLoadState('networkidle');
    
    const currentUrl = page.url();
    console.log('6名:', currentUrl.includes('confirm') ? 'OK' : 'NG');
  });

  test('NaNで確認画面に進んだ場合の表示', async ({ page }) => {
    await page.goto(baseUrl);
    
    // JavaScriptで値を設定
    await page.evaluate(() => {
      const termInput = document.getElementById('term') as HTMLInputElement;
      termInput.value = 'NaN';
    });
    
    await page.fill('#username', 'NaNテスト');
    await page.selectOption('#contact', 'no');
    
    await page.click('button[type="submit"]');
    await page.waitForLoadState('networkidle');
    
    const currentUrl = page.url();
    console.log('URL:', currentUrl);
    
    if (currentUrl.includes('confirm')) {
      const bodyText = await page.textContent('body');
      console.log('Confirm page contains NaN:', bodyText?.includes('NaN'));
      console.log('Body excerpt:', bodyText?.substring(0, 500));
      
      await page.screenshot({ path: 'test-results/viewpoint-08-nan-confirm.png', fullPage: true });
    }
  });

  test('プランごとの人数制限を確認(このプランの定員)', async ({ page }) => {
    await page.goto(baseUrl);
    
    // ページ内の定員情報を探す
    const pageContent = await page.textContent('body');
    console.log('Page mentions 定員:', pageContent?.includes('定員'));
    console.log('Page mentions 名様:', pageContent?.includes('名様'));
    
    // プラン説明を確認
    const planDesc = await page.locator('p:has-text("名様")').textContent();
    console.log('Plan description:', planDesc);
  });
});
