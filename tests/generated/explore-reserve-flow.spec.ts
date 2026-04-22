import { test, expect } from '@playwright/test';

test.describe('Explore Reserve Flow', () => {
  test('プラン一覧から予約フォームへの遷移を詳しく調査', async ({ page }) => {
    await page.goto('https://hotel-example-site.takeyaqa.dev/ja/plans.html');
    
    // 全てのリンクを列挙
    const allLinks = await page.locator('a').all();
    console.log('Total links:', allLinks.length);
    
    for (const link of allLinks.slice(0, 15)) {
      const href = await link.getAttribute('href');
      const text = await link.textContent();
      console.log(`  Link: "${text?.trim()}" -> ${href}`);
    }
    
    // カードのクリック可能要素を確認
    const cards = await page.locator('.card, [class*="plan"]').all();
    console.log('Cards:', cards.length);
  });

  test('予約リンクを直接確認', async ({ page }) => {
    await page.goto('https://hotel-example-site.takeyaqa.dev/ja/plans.html');
    
    // href属性にreserveを含むリンクを確認
    const reserveLinks = await page.locator('a[href*="reserve"]').all();
    console.log('Reserve links with href:', reserveLinks.length);
    
    for (const link of reserveLinks) {
      const href = await link.getAttribute('href');
      const text = await link.textContent();
      console.log(`  Reserve Link: "${text?.trim()}" -> ${href}`);
    }
    
    // 最初の予約リンクをクリック
    if (reserveLinks.length > 0) {
      const href = await reserveLinks[0].getAttribute('href');
      console.log('Clicking first reserve link:', href);
      await reserveLinks[0].click();
      await page.waitForLoadState('networkidle');
      console.log('After click URL:', page.url());
      
      // 新しいページの内容を確認
      const pageContent = await page.content();
      if (pageContent.includes('form')) {
        console.log('Form found in page content');
      }
      
      // 入力フィールドを再度確認
      const inputs = await page.locator('input, select, textarea').all();
      console.log('Inputs after navigation:', inputs.length);
      
      for (const input of inputs) {
        const name = await input.getAttribute('name');
        const type = await input.getAttribute('type');
        const id = await input.getAttribute('id');
        const required = await input.getAttribute('required');
        console.log(`  Input: name=${name}, id=${id}, type=${type}, required=${required !== null}`);
      }
      
      // ラベルを確認
      const labels = await page.locator('label').allTextContents();
      console.log('Labels:', labels);
      
      await page.screenshot({ path: 'test-results/reserve-page-detail.png', fullPage: true });
    }
  });
});
