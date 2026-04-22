import { test, expect } from '@playwright/test';

/**
 * P-20260422-02: 料金計算バグの詳細検証
 */

test.describe('P-20260422-02: 料金計算バグの検証', () => {
  const baseUrl = 'https://hotel-example-site.takeyaqa.dev/ja/reserve.html?plan-id=0';

  // ヘルパー関数: 合計金額を取得
  async function getTotalBill(page: any): Promise<number> {
    const text = await page.locator('#total-bill').textContent();
    const match = text?.match(/(\d{1,3}(,\d{3})*)/);
    return parseInt(match?.[1]?.replace(/,/g, '') || '0');
  }

  test('1名での朝食オプション追加(期待:+1,000円)', async ({ page }) => {
    await page.goto(baseUrl);
    
    // 1名1泊(デフォルト)
    await page.fill('#head-count', '1');
    await page.fill('#term', '1');
    await page.waitForTimeout(500);
    
    const before = await getTotalBill(page);
    console.log('1名1泊オプションなし:', before);
    
    await page.check('#breakfast');
    await page.waitForTimeout(500);
    
    const after = await getTotalBill(page);
    console.log('1名1泊朝食あり:', after);
    console.log('差額:', after - before);
    
    // 期待: +1,000円
    expect(after - before).toBe(1000);
  });

  test('1名2泊での朝食オプション追加(期待:+2,000円)', async ({ page }) => {
    await page.goto(baseUrl);
    
    await page.fill('#head-count', '1');
    await page.fill('#term', '2');
    await page.waitForTimeout(500);
    
    const before = await getTotalBill(page);
    console.log('1名2泊オプションなし:', before);
    
    await page.check('#breakfast');
    await page.waitForTimeout(500);
    
    const after = await getTotalBill(page);
    console.log('1名2泊朝食あり:', after);
    console.log('差額:', after - before);
    
    // 期待: +2,000円 (1,000円×1名×2泊)
  });

  test('2名1泊での朝食オプション追加(期待:+2,000円)', async ({ page }) => {
    await page.goto(baseUrl);
    
    await page.fill('#head-count', '2');
    await page.fill('#term', '1');
    await page.waitForTimeout(500);
    
    const before = await getTotalBill(page);
    console.log('2名1泊オプションなし:', before);
    
    await page.check('#breakfast');
    await page.waitForTimeout(500);
    
    const after = await getTotalBill(page);
    console.log('2名1泊朝食あり:', after);
    console.log('差額:', after - before);
    
    // 期待: +2,000円 (1,000円×2名×1泊)
  });

  test('他のオプションでも同様の問題があるか(昼からチェックイン)', async ({ page }) => {
    await page.goto(baseUrl);
    
    await page.fill('#head-count', '2');
    await page.fill('#term', '1');
    await page.waitForTimeout(500);
    
    const before = await getTotalBill(page);
    console.log('2名1泊オプションなし:', before);
    
    await page.check('#early-check-in');
    await page.waitForTimeout(500);
    
    const after = await getTotalBill(page);
    console.log('2名1泊昼からチェックイン:', after);
    console.log('差額:', after - before);
    
    // 期待: +2,000円 (1,000円×2名×1泊)
  });

  test('他のオプションでも同様の問題があるか(観光プラン)', async ({ page }) => {
    await page.goto(baseUrl);
    
    await page.fill('#head-count', '2');
    await page.fill('#term', '1');
    await page.waitForTimeout(500);
    
    const before = await getTotalBill(page);
    console.log('2名1泊オプションなし:', before);
    
    await page.check('#sightseeing');
    await page.waitForTimeout(500);
    
    const after = await getTotalBill(page);
    console.log('2名1泊観光プラン:', after);
    console.log('差額:', after - before);
    
    // 期待: +2,000円 (1,000円×2名×1泊)
  });

  test('計算パターンの分析: 人数と泊数の組み合わせ', async ({ page }) => {
    await page.goto(baseUrl);
    
    const results: string[] = [];
    
    for (const headCount of [1, 2, 3]) {
      for (const term of [1, 2]) {
        await page.fill('#head-count', String(headCount));
        await page.fill('#term', String(term));
        await page.uncheck('#breakfast').catch(() => {});
        await page.waitForTimeout(300);
        
        const before = await getTotalBill(page);
        
        await page.check('#breakfast');
        await page.waitForTimeout(300);
        
        const after = await getTotalBill(page);
        const diff = after - before;
        
        results.push(`${headCount}名${term}泊: 基本${before}円 → 朝食追加${after}円 (差額${diff}円)`);
        
        await page.uncheck('#breakfast');
      }
    }
    
    console.log('=== 料金計算パターン ===');
    results.forEach(r => console.log(r));
  });
});
