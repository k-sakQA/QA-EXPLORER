import { test, expect } from '@playwright/test';

/**
 * 観点14: 設定保持 - 初期値
 * 観点12: 状態遷移 - 経時変化(二重送信防止など)
 */

test.describe('観点14: 初期値', () => {
  const baseUrl = 'https://hotel-example-site.takeyaqa.dev/ja/reserve.html?plan-id=0';

  test('フォームの初期値が適切に設定されている', async ({ page }) => {
    await page.goto(baseUrl);
    
    // 各フィールドの初期値を確認
    const date = await page.inputValue('#date');
    const term = await page.inputValue('#term');
    const headCount = await page.inputValue('#head-count');
    const username = await page.inputValue('#username');
    const contact = await page.inputValue('#contact');
    const comment = await page.inputValue('#comment');
    
    console.log('Initial values:');
    console.log('  date:', date);
    console.log('  term:', term);
    console.log('  head-count:', headCount);
    console.log('  username:', username);
    console.log('  contact:', contact);
    console.log('  comment:', comment);
    
    // 初期値の妥当性確認
    expect(term).toBe('1'); // 宿泊数は1泊がデフォルト
    expect(headCount).toBe('1'); // 人数は1名がデフォルト
    expect(username).toBe(''); // 氏名は空
    expect(comment).toBe(''); // コメントは空
    
    // 日付は明日以降であるべき
    const today = new Date();
    const dateValue = new Date(date.replace(/\//g, '-'));
    expect(dateValue.getTime()).toBeGreaterThanOrEqual(today.setHours(0,0,0,0));
  });

  test('チェックボックスの初期状態', async ({ page }) => {
    await page.goto(baseUrl);
    
    const breakfast = await page.locator('#breakfast').isChecked();
    const earlyCheckin = await page.locator('#early-check-in').isChecked();
    const sightseeing = await page.locator('#sightseeing').isChecked();
    
    console.log('Checkbox initial states:');
    console.log('  breakfast:', breakfast);
    console.log('  early-check-in:', earlyCheckin);
    console.log('  sightseeing:', sightseeing);
    
    // 全てオフがデフォルト
    expect(breakfast).toBe(false);
    expect(earlyCheckin).toBe(false);
    expect(sightseeing).toBe(false);
  });
});

test.describe('観点12: 経時変化(二重送信防止)', () => {
  const baseUrl = 'https://hotel-example-site.takeyaqa.dev/ja/reserve.html?plan-id=0';

  test('送信中はボタンが無効化されるか', async ({ page }) => {
    await page.goto(baseUrl);
    
    await page.fill('#username', 'テスト太郎');
    await page.selectOption('#contact', 'no');
    
    // 送信ボタンの状態を監視
    const submitButton = page.locator('button[type="submit"]');
    
    // クリック直後のボタン状態を確認
    const clickPromise = submitButton.click();
    
    // ボタンが無効化されるか確認(非常に短い間かもしれない)
    await page.waitForTimeout(50);
    const isDisabledDuringSubmit = await submitButton.isDisabled().catch(() => false);
    console.log('Button disabled during submit:', isDisabledDuringSubmit);
    
    await clickPromise;
    await page.waitForLoadState('networkidle');
  });

  test('連続クリックで二重送信されないか', async ({ page }) => {
    await page.goto(baseUrl);
    
    await page.fill('#username', '連続クリックテスト');
    await page.selectOption('#contact', 'no');
    
    const submitButton = page.locator('button[type="submit"]');
    
    // 連続クリック
    await Promise.all([
      submitButton.click(),
      submitButton.click(),
      submitButton.click()
    ]).catch(() => {});
    
    await page.waitForLoadState('networkidle');
    
    // 確認画面に到達しているはず
    console.log('After triple click URL:', page.url());
    
    // ネットワークリクエストを確認(実際のバックエンドがあれば)
  });

  test('確認画面の送信ボタンでの二重送信確認', async ({ page }) => {
    await page.goto(baseUrl);
    
    await page.fill('#username', '確認画面テスト');
    await page.selectOption('#contact', 'no');
    
    await page.click('button[type="submit"]');
    await page.waitForLoadState('networkidle');
    
    // 確認画面の送信ボタンを確認
    const confirmButton = page.locator('button:has-text("予約する"), button:has-text("確定"), button[type="submit"]');
    const buttonText = await confirmButton.textContent().catch(() => 'not found');
    console.log('Confirm button text:', buttonText);
    
    // ボタンがあればクリック
    if (await confirmButton.count() > 0) {
      await confirmButton.click();
      await page.waitForLoadState('networkidle');
      console.log('After confirm URL:', page.url());
    }
  });
});
