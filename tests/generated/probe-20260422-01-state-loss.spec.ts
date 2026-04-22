import { test, expect } from '@playwright/test';

/**
 * P-20260422-01: H-20260422-01の検証
 * 仮説: ブラウザネイティブのHTML5バリデーションに依存しており、
 *       カスタムバリデーション実装が不十分。状態復元にも問題あり。
 * 
 * 検証計画:
 * 1. 連絡方法を「電話番号」に変更した場合も、ブラウザバックで電話番号が消失するか確認
 * 2. 条件付き必須(email/tel)のrequired属性がJS動的に変更されているか調査
 * 3. 他の条件付き表示フィールドでも同様の問題があるか確認
 */

test.describe('P-20260422-01: ブラウザバック時の状態消失検証', () => {
  const baseUrl = 'https://hotel-example-site.takeyaqa.dev/ja/reserve.html?plan-id=0';

  test('電話番号もブラウザバックで消失するか確認', async ({ page }) => {
    await page.goto(baseUrl);
    
    const testData = {
      username: '電話テスト',
      tel: '090-1234-5678',
      comment: 'コメントは保持されるはず'
    };
    
    // 電話を選択して入力
    await page.fill('#username', testData.username);
    await page.selectOption('#contact', 'tel');
    await page.fill('#tel', testData.tel);
    await page.fill('#comment', testData.comment);
    
    // 確認画面へ
    await page.click('button[type="submit"]');
    await page.waitForLoadState('networkidle');
    expect(page.url()).toContain('confirm');
    
    // ブラウザバック
    await page.goBack();
    await page.waitForLoadState('networkidle');
    
    // 各フィールドの値を確認
    const usernameValue = await page.inputValue('#username');
    const contactValue = await page.inputValue('#contact');
    const telValue = await page.inputValue('#tel');
    const commentValue = await page.inputValue('#comment');
    
    console.log('After back:');
    console.log('  username:', usernameValue);
    console.log('  contact:', contactValue);
    console.log('  tel:', telValue);
    console.log('  comment:', commentValue);
    
    // 電話番号も消失するか確認(仮説検証)
    expect(usernameValue).toBe(testData.username);
    expect(telValue).toBe(testData.tel); // これが失敗すればメール同様の問題
    expect(commentValue).toBe(testData.comment);
  });

  test('条件付き必須フィールドのrequired属性の動的変更を確認', async ({ page }) => {
    await page.goto(baseUrl);
    
    // 初期状態
    const emailRequiredInit = await page.locator('#email').getAttribute('required');
    const telRequiredInit = await page.locator('#tel').getAttribute('required');
    console.log('Initial - email required:', emailRequiredInit, ', tel required:', telRequiredInit);
    
    // メール選択
    await page.selectOption('#contact', 'email');
    const emailRequiredEmail = await page.locator('#email').getAttribute('required');
    const telRequiredEmail = await page.locator('#tel').getAttribute('required');
    console.log('After email - email required:', emailRequiredEmail, ', tel required:', telRequiredEmail);
    
    // 電話選択
    await page.selectOption('#contact', 'tel');
    const emailRequiredTel = await page.locator('#email').getAttribute('required');
    const telRequiredTel = await page.locator('#tel').getAttribute('required');
    console.log('After tel - email required:', emailRequiredTel, ', tel required:', telRequiredTel);
    
    // 希望しない選択
    await page.selectOption('#contact', 'no');
    const emailRequiredNo = await page.locator('#email').getAttribute('required');
    const telRequiredNo = await page.locator('#tel').getAttribute('required');
    console.log('After no - email required:', emailRequiredNo, ', tel required:', telRequiredNo);
  });

  test('追加プランのチェック状態もブラウザバックで消失するか確認', async ({ page }) => {
    await page.goto(baseUrl);
    
    // 必須項目入力
    await page.fill('#username', 'オプションテスト');
    await page.selectOption('#contact', 'no'); // 連絡不要を選択してemail/tel問題を避ける
    
    // 追加プランを全て選択
    await page.check('#breakfast');
    await page.check('#early-check-in');
    await page.check('#sightseeing');
    
    // 確認画面へ
    await page.click('button[type="submit"]');
    await page.waitForLoadState('networkidle');
    
    // ブラウザバック
    await page.goBack();
    await page.waitForLoadState('networkidle');
    
    // チェック状態を確認
    const breakfastChecked = await page.locator('#breakfast').isChecked();
    const earlyCheckinChecked = await page.locator('#early-check-in').isChecked();
    const sightseeingChecked = await page.locator('#sightseeing').isChecked();
    
    console.log('After back - checkbox states:');
    console.log('  breakfast:', breakfastChecked);
    console.log('  early-check-in:', earlyCheckinChecked);
    console.log('  sightseeing:', sightseeingChecked);
    
    // チェック状態は保持されるべき
    expect(breakfastChecked).toBe(true);
    expect(earlyCheckinChecked).toBe(true);
    expect(sightseeingChecked).toBe(true);
  });

  test('宿泊日・宿泊数・人数もブラウザバックで保持されるか確認', async ({ page }) => {
    await page.goto(baseUrl);
    
    const testData = {
      date: '2026/05/15',
      term: '5',
      headCount: '3'
    };
    
    // 入力
    await page.fill('#date', testData.date);
    await page.fill('#term', testData.term);
    await page.fill('#head-count', testData.headCount);
    await page.fill('#username', '日付テスト');
    await page.selectOption('#contact', 'no');
    
    // 確認画面へ
    await page.click('button[type="submit"]');
    await page.waitForLoadState('networkidle');
    
    // ブラウザバック
    await page.goBack();
    await page.waitForLoadState('networkidle');
    
    // 各フィールドの値を確認
    const dateValue = await page.inputValue('#date');
    const termValue = await page.inputValue('#term');
    const headCountValue = await page.inputValue('#head-count');
    
    console.log('After back:');
    console.log('  date:', dateValue);
    console.log('  term:', termValue);
    console.log('  head-count:', headCountValue);
    
    expect(dateValue).toBe(testData.date);
    expect(termValue).toBe(testData.term);
    expect(headCountValue).toBe(testData.headCount);
  });
});
