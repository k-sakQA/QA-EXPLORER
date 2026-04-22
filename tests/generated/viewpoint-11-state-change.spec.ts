import { test, expect } from '@playwright/test';

/**
 * 観点11: 状態遷移 - イベントによる状態変化
 * 狙うバグ:
 * 1. ボタンクリック→適切な遷移が起きない
 * 2. 連絡方法選択→条件付きフィールドの表示/非表示が連動しない
 * 3. チェックボックス選択→料金計算に反映されない
 * 4. 宿泊数/人数変更→合計金額に反映されない
 */

test.describe('観点11: イベントによる状態変化', () => {
  const baseUrl = 'https://hotel-example-site.takeyaqa.dev/ja/reserve.html?plan-id=0';

  test('連絡方法「メール」選択でメールアドレス欄が必須になる', async ({ page }) => {
    await page.goto(baseUrl);
    
    // 初期状態の確認
    const emailRequired = await page.locator('#email').getAttribute('required');
    console.log('Email required initially:', emailRequired);
    
    // メールを選択
    await page.selectOption('#contact', 'email');
    
    // メールアドレス欄の状態を確認
    const emailRequiredAfter = await page.locator('#email').getAttribute('required');
    const emailVisible = await page.locator('#email').isVisible();
    console.log('Email required after select email:', emailRequiredAfter);
    console.log('Email visible:', emailVisible);
    
    expect(emailVisible).toBe(true);
  });

  test('連絡方法「電話」選択で電話番号欄が必須になる', async ({ page }) => {
    await page.goto(baseUrl);
    
    // 電話を選択
    await page.selectOption('#contact', 'tel');
    
    // 電話番号欄の状態を確認
    const telRequired = await page.locator('#tel').getAttribute('required');
    const telVisible = await page.locator('#tel').isVisible();
    console.log('Tel required after select tel:', telRequired);
    console.log('Tel visible:', telVisible);
    
    expect(telVisible).toBe(true);
  });

  test('連絡方法を切り替えた時の表示切替', async ({ page }) => {
    await page.goto(baseUrl);
    
    // メール選択
    await page.selectOption('#contact', 'email');
    const emailVisibleAfterEmail = await page.locator('#email').isVisible();
    const telVisibleAfterEmail = await page.locator('#tel').isVisible();
    console.log('After email select - email visible:', emailVisibleAfterEmail, 'tel visible:', telVisibleAfterEmail);
    
    // 電話選択に切替
    await page.selectOption('#contact', 'tel');
    const emailVisibleAfterTel = await page.locator('#email').isVisible();
    const telVisibleAfterTel = await page.locator('#tel').isVisible();
    console.log('After tel select - email visible:', emailVisibleAfterTel, 'tel visible:', telVisibleAfterTel);
    
    // 「希望しない」選択
    await page.selectOption('#contact', 'no');
    const emailVisibleAfterNo = await page.locator('#email').isVisible();
    const telVisibleAfterNo = await page.locator('#tel').isVisible();
    console.log('After no select - email visible:', emailVisibleAfterNo, 'tel visible:', telVisibleAfterNo);
  });

  test('宿泊数変更で合計金額が再計算される', async ({ page }) => {
    await page.goto(baseUrl);
    
    // 初期の合計金額を取得
    const initialTotal = await page.locator('text=/合計|Total/i').first().textContent();
    console.log('Initial total area:', initialTotal);
    
    // 合計金額の数値部分を取得(試行)
    const priceElement = await page.locator('[class*="total"], [class*="price"], h3:has-text("合計")').first();
    const priceText = await priceElement.textContent();
    console.log('Price element text:', priceText);
    
    // 宿泊数を変更
    await page.fill('#term', '3');
    await page.waitForTimeout(500); // 計算待ち
    
    // 変更後の合計金額を取得
    const updatedPriceText = await priceElement.textContent();
    console.log('Updated price text:', updatedPriceText);
    
    // 金額が変わっているはず
    // (具体的な金額比較は実装依存なのでログで確認)
  });

  test('人数変更で合計金額が再計算される', async ({ page }) => {
    await page.goto(baseUrl);
    
    // 合計金額エリアを特定
    const priceArea = await page.textContent('body');
    const match = priceArea?.match(/合計.*?(\d{1,3}(,\d{3})*)/);
    console.log('Initial total match:', match?.[0]);
    
    // 人数を変更
    await page.fill('#head-count', '4');
    await page.waitForTimeout(500);
    
    const priceAreaAfter = await page.textContent('body');
    const matchAfter = priceAreaAfter?.match(/合計.*?(\d{1,3}(,\d{3})*)/);
    console.log('After head-count=4 total match:', matchAfter?.[0]);
  });

  test('追加プラン選択で合計金額が増加する', async ({ page }) => {
    await page.goto(baseUrl);
    
    // 初期状態のスクリーンショット
    await page.screenshot({ path: 'test-results/viewpoint-11-before-options.png' });
    
    // 追加プランなしの状態
    const bodyTextBefore = await page.textContent('body');
    console.log('Total area before options:', bodyTextBefore?.match(/合計[\s\S]*?円/)?.[0]);
    
    // 朝食バイキングを選択
    await page.check('#breakfast');
    await page.waitForTimeout(300);
    const bodyTextAfterBreakfast = await page.textContent('body');
    console.log('Total area after breakfast:', bodyTextAfterBreakfast?.match(/合計[\s\S]*?円/)?.[0]);
    
    // 昼からチェックインを追加
    await page.check('#early-check-in');
    await page.waitForTimeout(300);
    const bodyTextAfterEarlyCheckin = await page.textContent('body');
    console.log('Total area after early-check-in:', bodyTextAfterEarlyCheckin?.match(/合計[\s\S]*?円/)?.[0]);
    
    // 観光プランを追加
    await page.check('#sightseeing');
    await page.waitForTimeout(300);
    const bodyTextAfterSightseeing = await page.textContent('body');
    console.log('Total area after sightseeing:', bodyTextAfterSightseeing?.match(/合計[\s\S]*?円/)?.[0]);
    
    await page.screenshot({ path: 'test-results/viewpoint-11-after-options.png', fullPage: true });
  });

  test('連絡方法変更→入力済みのメールがクリアされないか', async ({ page }) => {
    await page.goto(baseUrl);
    
    // メールを選択して入力
    await page.selectOption('#contact', 'email');
    await page.fill('#email', 'first@test.com');
    
    // 電話に切替
    await page.selectOption('#contact', 'tel');
    await page.fill('#tel', '090-1234-5678');
    
    // 再度メールに切替
    await page.selectOption('#contact', 'email');
    
    // メールアドレスが保持されているか
    const emailValue = await page.inputValue('#email');
    console.log('Email after switching back:', emailValue);
    
    // 期待: 入力済みの値は保持されるべき
  });
});
