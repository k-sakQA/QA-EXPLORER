import { test, expect } from '@playwright/test';

/**
 * 観点15: 変更・反映 - 料金計算の検証
 * 狙うバグ:
 * 1. 追加プラン料金が人数分反映されない
 * 2. 宿泊数が料金に正しく反映されない
 * 3. 人数変更が料金に反映されない
 */

test.describe('料金計算の詳細検証', () => {
  const baseUrl = 'https://hotel-example-site.takeyaqa.dev/ja/reserve.html?plan-id=0';

  test('基本料金と人数の関係を確認', async ({ page }) => {
    await page.goto(baseUrl);
    
    // 1泊1名 (デフォルト)
    const body1 = await page.textContent('body');
    const total1 = body1?.match(/合計[\s\S]*?(\d{1,3}(,\d{3})*)/)?.[1];
    console.log('1泊1名:', total1);
    
    // 1泊2名
    await page.fill('#head-count', '2');
    await page.waitForTimeout(300);
    const body2 = await page.textContent('body');
    const total2 = body2?.match(/合計[\s\S]*?(\d{1,3}(,\d{3})*)/)?.[1];
    console.log('1泊2名:', total2);
    
    // 1泊3名
    await page.fill('#head-count', '3');
    await page.waitForTimeout(300);
    const body3 = await page.textContent('body');
    const total3 = body3?.match(/合計[\s\S]*?(\d{1,3}(,\d{3})*)/)?.[1];
    console.log('1泊3名:', total3);
    
    // 期待: 人数に関わらず部屋料金(7,000円)は同じはず
    // または人数×単価の料金体系か確認
  });

  test('基本料金と宿泊数の関係を確認', async ({ page }) => {
    await page.goto(baseUrl);
    
    // 1泊1名
    const body1 = await page.textContent('body');
    const total1 = body1?.match(/合計[\s\S]*?(\d{1,3}(,\d{3})*)/)?.[1];
    console.log('1泊:', total1);
    
    // 2泊1名
    await page.fill('#term', '2');
    await page.waitForTimeout(300);
    const body2 = await page.textContent('body');
    const total2 = body2?.match(/合計[\s\S]*?(\d{1,3}(,\d{3})*)/)?.[1];
    console.log('2泊:', total2);
    
    // 3泊1名
    await page.fill('#term', '3');
    await page.waitForTimeout(300);
    const body3 = await page.textContent('body');
    const total3 = body3?.match(/合計[\s\S]*?(\d{1,3}(,\d{3})*)/)?.[1];
    console.log('3泊:', total3);
    
    // 期待: 7,000円×泊数 のはず
  });

  test('朝食オプションの料金加算を確認(1名)', async ({ page }) => {
    await page.goto(baseUrl);
    
    // 1名でオプションなし
    const bodyBefore = await page.textContent('body');
    const totalBefore = bodyBefore?.match(/合計[\s\S]*?(\d{1,3}(,\d{3})*)/)?.[1];
    console.log('1名オプションなし:', totalBefore);
    
    // 朝食を追加
    await page.check('#breakfast');
    await page.waitForTimeout(300);
    const bodyAfter = await page.textContent('body');
    const totalAfter = bodyAfter?.match(/合計[\s\S]*?(\d{1,3}(,\d{3})*)/)?.[1];
    console.log('1名朝食あり:', totalAfter);
    
    // 差額
    const before = parseInt(totalBefore?.replace(/,/g, '') || '0');
    const after = parseInt(totalAfter?.replace(/,/g, '') || '0');
    console.log('差額:', after - before);
    
    // 期待: +1,000円
    expect(after - before).toBe(1000);
  });

  test('朝食オプションの料金加算を確認(2名)', async ({ page }) => {
    await page.goto(baseUrl);
    
    // 2名でオプションなし
    await page.fill('#head-count', '2');
    await page.waitForTimeout(300);
    const bodyBefore = await page.textContent('body');
    const totalBefore = bodyBefore?.match(/合計[\s\S]*?(\d{1,3}(,\d{3})*)/)?.[1];
    console.log('2名オプションなし:', totalBefore);
    
    // 朝食を追加
    await page.check('#breakfast');
    await page.waitForTimeout(300);
    const bodyAfter = await page.textContent('body');
    const totalAfter = bodyAfter?.match(/合計[\s\S]*?(\d{1,3}(,\d{3})*)/)?.[1];
    console.log('2名朝食あり:', totalAfter);
    
    // 差額
    const before = parseInt(totalBefore?.replace(/,/g, '') || '0');
    const after = parseInt(totalAfter?.replace(/,/g, '') || '0');
    console.log('差額:', after - before);
    
    // 期待: +2,000円 (1,000円×2名)
    expect(after - before).toBe(2000);
  });

  test('全オプション選択時の料金(1名)', async ({ page }) => {
    await page.goto(baseUrl);
    
    // オプションなし
    const bodyBefore = await page.textContent('body');
    const totalBefore = bodyBefore?.match(/合計[\s\S]*?(\d{1,3}(,\d{3})*)/)?.[1];
    console.log('オプションなし:', totalBefore);
    
    // 全オプション
    await page.check('#breakfast');
    await page.check('#early-check-in');
    await page.check('#sightseeing');
    await page.waitForTimeout(300);
    const bodyAfter = await page.textContent('body');
    const totalAfter = bodyAfter?.match(/合計[\s\S]*?(\d{1,3}(,\d{3})*)/)?.[1];
    console.log('全オプション:', totalAfter);
    
    // 差額
    const before = parseInt(totalBefore?.replace(/,/g, '') || '0');
    const after = parseInt(totalAfter?.replace(/,/g, '') || '0');
    console.log('差額:', after - before);
    
    // 期待: +3,000円 (1,000円×3種類×1名)
    expect(after - before).toBe(3000);
  });

  test('2泊2名での料金計算', async ({ page }) => {
    await page.goto(baseUrl);
    
    await page.fill('#term', '2');
    await page.fill('#head-count', '2');
    await page.waitForTimeout(300);
    
    const bodyBefore = await page.textContent('body');
    const totalBefore = bodyBefore?.match(/合計[\s\S]*?(\d{1,3}(,\d{3})*)/)?.[1];
    console.log('2泊2名オプションなし:', totalBefore);
    
    // 朝食追加
    await page.check('#breakfast');
    await page.waitForTimeout(300);
    const bodyAfter = await page.textContent('body');
    const totalAfter = bodyAfter?.match(/合計[\s\S]*?(\d{1,3}(,\d{3})*)/)?.[1];
    console.log('2泊2名朝食あり:', totalAfter);
    
    const before = parseInt(totalBefore?.replace(/,/g, '') || '0');
    const after = parseInt(totalAfter?.replace(/,/g, '') || '0');
    console.log('差額:', after - before);
    
    // 期待: +4,000円 (1,000円×2名×2泊)
  });
});
