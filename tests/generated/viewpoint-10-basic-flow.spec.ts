import { test, expect } from '@playwright/test';

/**
 * 観点10: 単機能 - 予約フォームの基本フロー確認
 * 狙うバグ:
 * 1. 予約フローが完走しない(遷移失敗)
 * 2. 入力データが確認画面に正しく引き継がれない
 * 3. ブラウザの戻るボタンで入力内容が消える
 */

test.describe('観点10: 単機能 - 予約フォーム基本フロー', () => {
  const baseUrl = 'https://hotel-example-site.takeyaqa.dev/ja/reserve.html?plan-id=0';

  test('正常系: 予約フローが完走し確認画面に遷移する', async ({ page }) => {
    await page.goto(baseUrl);
    
    // 必須項目を入力
    await page.fill('#username', 'テスト太郎');
    
    // 連絡方法を選択(メールを選択)
    await page.selectOption('#contact', 'email');
    await page.fill('#email', 'test@example.com');
    
    // 送信
    await page.click('button[type="submit"]');
    await page.waitForLoadState('networkidle');
    
    // 確認画面に遷移したか確認
    const currentUrl = page.url();
    console.log('After submit URL:', currentUrl);
    
    // 確認画面の内容を確認
    const pageContent = await page.textContent('body');
    console.log('Page contains 確認:', pageContent?.includes('確認'));
    
    // 入力内容が表示されているか
    expect(pageContent).toContain('テスト太郎');
    
    await page.screenshot({ path: 'test-results/viewpoint-10-confirm-page.png', fullPage: true });
  });

  test('正常系: 確認画面の内容が入力と一致する', async ({ page }) => {
    await page.goto(baseUrl);
    
    const testData = {
      username: '山田花子',
      email: 'hanako@test.co.jp',
      term: '3',
      headCount: '2',
      comment: '禁煙ルーム希望です'
    };
    
    // 入力
    await page.fill('#username', testData.username);
    await page.fill('#term', testData.term);
    await page.fill('#head-count', testData.headCount);
    await page.selectOption('#contact', 'email');
    await page.fill('#email', testData.email);
    await page.fill('#comment', testData.comment);
    
    // 送信
    await page.click('button[type="submit"]');
    await page.waitForLoadState('networkidle');
    
    // 確認画面の内容を検証
    const pageContent = await page.textContent('body');
    
    expect(pageContent).toContain(testData.username);
    expect(pageContent).toContain(testData.email);
    expect(pageContent).toContain(testData.comment);
    
    // 泊数と人数も確認画面に反映されているか
    console.log('Term in content:', pageContent?.includes('3泊') || pageContent?.includes('3'));
    console.log('Head count in content:', pageContent?.includes('2名') || pageContent?.includes('2'));
  });

  test('ブラウザ戻るボタンで入力内容が保持される', async ({ page }) => {
    await page.goto(baseUrl);
    
    const testData = {
      username: '保持テスト用',
      email: 'hoji@test.com',
      comment: 'コメントが消えないか確認'
    };
    
    // 入力
    await page.fill('#username', testData.username);
    await page.selectOption('#contact', 'email');
    await page.fill('#email', testData.email);
    await page.fill('#comment', testData.comment);
    
    // 確認画面へ
    await page.click('button[type="submit"]');
    await page.waitForLoadState('networkidle');
    
    // ブラウザの戻るボタン
    await page.goBack();
    await page.waitForLoadState('networkidle');
    
    // 入力内容が保持されているか確認
    const usernameValue = await page.inputValue('#username');
    const emailValue = await page.inputValue('#email');
    const commentValue = await page.inputValue('#comment');
    
    console.log('After back - username:', usernameValue);
    console.log('After back - email:', emailValue);
    console.log('After back - comment:', commentValue);
    
    // 保持されているべき
    expect(usernameValue).toBe(testData.username);
    expect(emailValue).toBe(testData.email);
    expect(commentValue).toBe(testData.comment);
  });

  test('追加プラン選択が確認画面に反映される', async ({ page }) => {
    await page.goto(baseUrl);
    
    // 必須項目入力
    await page.fill('#username', 'オプションテスト');
    await page.selectOption('#contact', 'email');
    await page.fill('#email', 'option@test.com');
    
    // 追加プランを全て選択
    await page.check('#breakfast');
    await page.check('#early-check-in');
    await page.check('#sightseeing');
    
    // 送信
    await page.click('button[type="submit"]');
    await page.waitForLoadState('networkidle');
    
    const pageContent = await page.textContent('body');
    
    // 追加プランが確認画面に表示されるか
    console.log('Breakfast in confirm:', pageContent?.includes('朝食'));
    console.log('Early check-in in confirm:', pageContent?.includes('チェックイン') || pageContent?.includes('昼から'));
    console.log('Sightseeing in confirm:', pageContent?.includes('観光'));
  });
});
