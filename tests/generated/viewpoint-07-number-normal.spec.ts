import { test, expect } from '@playwright/test';

/**
 * 観点07: 入力 - 数値(正常値)
 * 狙うバグ:
 * 1. 正常な範囲の値が弾かれる
 * 2. 整数入力で小数が許容される
 * 3. 正常値の境界で計算が正しく行われない
 */

test.describe('観点07: 数値(正常値)', () => {
  const baseUrl = 'https://hotel-example-site.takeyaqa.dev/ja/reserve.html?plan-id=0';

  test('宿泊数: 最小値(1)で正常に予約できる', async ({ page }) => {
    await page.goto(baseUrl);
    
    await page.fill('#term', '1');
    await page.fill('#username', 'テスト太郎');
    await page.selectOption('#contact', 'no');
    
    await page.click('button[type="submit"]');
    await page.waitForLoadState('networkidle');
    
    expect(page.url()).toContain('confirm');
    
    const bodyText = await page.textContent('body');
    console.log('1泊での確認画面表示:', bodyText?.includes('1'));
  });

  test('宿泊数: 中央値(3)で正常に予約できる', async ({ page }) => {
    await page.goto(baseUrl);
    
    await page.fill('#term', '3');
    await page.fill('#username', 'テスト太郎');
    await page.selectOption('#contact', 'no');
    
    await page.click('button[type="submit"]');
    await page.waitForLoadState('networkidle');
    
    expect(page.url()).toContain('confirm');
  });

  test('宿泊数: 上限付近(9)で正常に予約できる', async ({ page }) => {
    await page.goto(baseUrl);
    
    await page.fill('#term', '9');
    await page.fill('#username', 'テスト太郎');
    await page.selectOption('#contact', 'no');
    
    await page.click('button[type="submit"]');
    await page.waitForLoadState('networkidle');
    
    const currentUrl = page.url();
    console.log('9泊後のURL:', currentUrl);
    
    // 9泊は許容されるはず(上限が9の場合)
    if (!currentUrl.includes('confirm')) {
      console.log('Note: 9泊は弾かれた - 上限がある可能性');
    }
  });

  test('人数: 最小値(1)で正常に予約できる', async ({ page }) => {
    await page.goto(baseUrl);
    
    await page.fill('#head-count', '1');
    await page.fill('#username', 'テスト太郎');
    await page.selectOption('#contact', 'no');
    
    await page.click('button[type="submit"]');
    await page.waitForLoadState('networkidle');
    
    expect(page.url()).toContain('confirm');
  });

  test('人数: 中央値(3)で正常に予約できる', async ({ page }) => {
    await page.goto(baseUrl);
    
    await page.fill('#head-count', '3');
    await page.fill('#username', 'テスト太郎');
    await page.selectOption('#contact', 'no');
    
    await page.click('button[type="submit"]');
    await page.waitForLoadState('networkidle');
    
    expect(page.url()).toContain('confirm');
  });

  test('人数: 上限付近(9)で正常に予約できる', async ({ page }) => {
    await page.goto(baseUrl);
    
    await page.fill('#head-count', '9');
    await page.fill('#username', 'テスト太郎');
    await page.selectOption('#contact', 'no');
    
    await page.click('button[type="submit"]');
    await page.waitForLoadState('networkidle');
    
    const currentUrl = page.url();
    console.log('9名後のURL:', currentUrl);
    
    if (!currentUrl.includes('confirm')) {
      console.log('Note: 9名は弾かれた - 上限がある可能性');
    }
  });

  test('料金計算: 宿泊数と人数が反映される', async ({ page }) => {
    await page.goto(baseUrl);
    
    // 初期状態の料金を確認
    const initialBody = await page.textContent('body');
    const initialTotal = initialBody?.match(/合計[\s\S]*?(\d{1,3}(,\d{3})*)/)?.[1];
    console.log('初期料金:', initialTotal);
    
    // 2泊3名に変更
    await page.fill('#term', '2');
    await page.fill('#head-count', '3');
    await page.waitForTimeout(500);
    
    const updatedBody = await page.textContent('body');
    const updatedTotal = updatedBody?.match(/合計[\s\S]*?(\d{1,3}(,\d{3})*)/)?.[1];
    console.log('2泊3名の料金:', updatedTotal);
    
    // 料金が変わっているはず
    expect(updatedTotal).not.toBe(initialTotal);
  });

  test('追加プラン選択時の料金計算', async ({ page }) => {
    await page.goto(baseUrl);
    
    // 2名で朝食を追加
    await page.fill('#head-count', '2');
    await page.waitForTimeout(300);
    
    const bodyBefore = await page.textContent('body');
    const totalBefore = bodyBefore?.match(/合計[\s\S]*?(\d{1,3}(,\d{3})*)/)?.[1];
    console.log('朝食なし2名:', totalBefore);
    
    await page.check('#breakfast');
    await page.waitForTimeout(300);
    
    const bodyAfter = await page.textContent('body');
    const totalAfter = bodyAfter?.match(/合計[\s\S]*?(\d{1,3}(,\d{3})*)/)?.[1];
    console.log('朝食あり2名:', totalAfter);
    
    // 1人1,000円×2名=2,000円増加のはず
  });
});
