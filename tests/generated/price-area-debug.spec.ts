import { test, expect } from '@playwright/test';

test.describe('料金表示エリアのデバッグ', () => {
  const baseUrl = 'https://hotel-example-site.takeyaqa.dev/ja/reserve.html?plan-id=0';

  test('料金表示部分のHTML構造を確認', async ({ page }) => {
    await page.goto(baseUrl);
    
    // 合計を含む要素を探す
    const totalElements = await page.locator(':has-text("合計")').all();
    console.log('Elements with 合計:', totalElements.length);
    
    // 金額表示部分を特定
    const priceSection = await page.locator('#total-bill, [id*="total"], [class*="total"]').all();
    console.log('Price section elements:', priceSection.length);
    
    for (const el of priceSection) {
      const html = await el.innerHTML();
      console.log('Price section HTML:', html.substring(0, 200));
    }
    
    // output要素があるか確認
    const outputElements = await page.locator('output').all();
    console.log('Output elements:', outputElements.length);
    
    for (const output of outputElements) {
      const id = await output.getAttribute('id');
      const value = await output.textContent();
      console.log(`  output#${id}: ${value}`);
    }
    
    await page.screenshot({ path: 'test-results/price-area-debug.png', fullPage: true });
  });

  test('料金の正しい取得方法を確認', async ({ page }) => {
    await page.goto(baseUrl);
    
    // total-bill というIDがあるか
    const totalBill = await page.locator('#total-bill').textContent().catch(() => 'not found');
    console.log('total-bill:', totalBill);
    
    // 人数変更
    await page.fill('#head-count', '2');
    await page.waitForTimeout(500);
    
    const totalBill2 = await page.locator('#total-bill').textContent().catch(() => 'not found');
    console.log('total-bill after 2 persons:', totalBill2);
    
    // 朝食追加
    await page.check('#breakfast');
    await page.waitForTimeout(500);
    
    const totalBill3 = await page.locator('#total-bill').textContent().catch(() => 'not found');
    console.log('total-bill with breakfast:', totalBill3);
  });
});
