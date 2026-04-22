import { test, expect } from '@playwright/test';

test.describe('Reserve Page Direct Access', () => {
  test('予約ページに直接アクセスして構造を確認', async ({ page }) => {
    // 直接予約ページにアクセス
    await page.goto('https://hotel-example-site.takeyaqa.dev/ja/reserve.html?plan-id=0');
    await page.waitForLoadState('networkidle');
    
    console.log('URL:', page.url());
    console.log('Title:', await page.title());
    
    // 入力フィールドを全て列挙
    const inputs = await page.locator('input, select, textarea').all();
    console.log('Total inputs:', inputs.length);
    
    for (const input of inputs) {
      const tagName = await input.evaluate(el => el.tagName);
      const name = await input.getAttribute('name');
      const type = await input.getAttribute('type');
      const id = await input.getAttribute('id');
      const required = await input.getAttribute('required');
      const value = await input.inputValue().catch(() => '');
      console.log(`  ${tagName}: name=${name}, id=${id}, type=${type}, required=${required !== null}, value="${value}"`);
    }
    
    // ラベルを確認
    const labels = await page.locator('label').all();
    console.log('Labels count:', labels.length);
    for (const label of labels) {
      const text = await label.textContent();
      const forAttr = await label.getAttribute('for');
      console.log(`  Label: "${text?.trim()}" for=${forAttr}`);
    }
    
    // ボタンを確認
    const buttons = await page.locator('button').all();
    console.log('Buttons:', buttons.length);
    for (const btn of buttons) {
      const text = await btn.textContent();
      const type = await btn.getAttribute('type');
      console.log(`  Button: "${text?.trim()}" type=${type}`);
    }
    
    // 見出しを確認
    const headings = await page.locator('h1, h2, h3, h4').allTextContents();
    console.log('Headings:', headings);
    
    // スクリーンショット
    await page.screenshot({ path: 'test-results/reserve-page-structure.png', fullPage: true });
  });

  test('会員ログイン済みの予約フォーム構造も確認', async ({ page }) => {
    // ログインページを確認
    await page.goto('https://hotel-example-site.takeyaqa.dev/ja/login.html');
    console.log('Login page URL:', page.url());
    
    const loginInputs = await page.locator('input').all();
    for (const input of loginInputs) {
      const name = await input.getAttribute('name');
      const type = await input.getAttribute('type');
      const id = await input.getAttribute('id');
      console.log(`  Login Input: name=${name}, id=${id}, type=${type}`);
    }
  });
});
