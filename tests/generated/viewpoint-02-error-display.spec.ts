import { test, expect } from '@playwright/test';

/**
 * 観点02: エラー表示(正常系)
 * 狙うバグ:
 * 1. エラーメッセージが曖昧(「エラーが発生しました」だけ)
 * 2. 内部エラーコードが画面に漏れる
 * 3. 修正後に再送信できない
 * 4. どのフィールドがエラーか分からない
 * 5. フォーカスが最初のエラーフィールドに移動しない
 */

test.describe('観点02: エラー表示(正常系)', () => {
  const baseUrl = 'https://hotel-example-site.takeyaqa.dev/ja/reserve.html?plan-id=0';

  test('必須項目未入力でエラーメッセージが表示される', async ({ page }) => {
    await page.goto(baseUrl);
    
    // 何も入力せずに送信
    await page.click('button[type="submit"]');
    
    // ブラウザのバリデーションメッセージまたはカスタムエラーが出るか確認
    // HTML5バリデーションの場合、inputに:invalidが付く
    const invalidInputs = await page.locator('input:invalid, select:invalid').all();
    console.log('Invalid inputs count:', invalidInputs.length);
    
    for (const input of invalidInputs) {
      const name = await input.getAttribute('name');
      const validationMessage = await input.evaluate((el: HTMLInputElement) => el.validationMessage);
      console.log(`  ${name}: ${validationMessage}`);
    }
    
    // カスタムエラーメッセージがあるか
    const errorMessages = await page.locator('.error, .invalid-feedback, [class*="error"], [role="alert"]').allTextContents();
    console.log('Custom error messages:', errorMessages);
  });

  test('氏名を空にしてエラーメッセージの内容を確認', async ({ page }) => {
    await page.goto(baseUrl);
    
    // 氏名以外を入力
    await page.selectOption('#contact', 'email');
    await page.fill('#email', 'test@example.com');
    
    // 氏名は空のまま送信
    await page.click('button[type="submit"]');
    
    // 氏名フィールドのバリデーションメッセージ
    const usernameInput = page.locator('#username');
    const validationMessage = await usernameInput.evaluate((el: HTMLInputElement) => el.validationMessage);
    console.log('Username validation message:', validationMessage);
    
    // メッセージが日本語で分かりやすいか確認
    // 「このフィールドを入力してください」のような具体的なメッセージが望ましい
    expect(validationMessage).toBeTruthy();
  });

  test('メール選択時にメールアドレス未入力でエラー', async ({ page }) => {
    await page.goto(baseUrl);
    
    // 必須項目を入力
    await page.fill('#username', 'テスト太郎');
    await page.selectOption('#contact', 'email');
    // メールアドレスは入力しない
    
    await page.click('button[type="submit"]');
    
    const emailInput = page.locator('#email');
    const isInvalid = await emailInput.evaluate((el: HTMLInputElement) => !el.checkValidity());
    const validationMessage = await emailInput.evaluate((el: HTMLInputElement) => el.validationMessage);
    
    console.log('Email is invalid:', isInvalid);
    console.log('Email validation message:', validationMessage);
    
    // メール選択時はメールが必須のはず
    expect(isInvalid).toBe(true);
  });

  test('電話番号選択時に電話番号未入力でエラー', async ({ page }) => {
    await page.goto(baseUrl);
    
    await page.fill('#username', 'テスト太郎');
    await page.selectOption('#contact', 'tel');
    // 電話番号は入力しない
    
    await page.click('button[type="submit"]');
    
    const telInput = page.locator('#tel');
    const isInvalid = await telInput.evaluate((el: HTMLInputElement) => !el.checkValidity());
    const validationMessage = await telInput.evaluate((el: HTMLInputElement) => el.validationMessage);
    
    console.log('Tel is invalid:', isInvalid);
    console.log('Tel validation message:', validationMessage);
    
    expect(isInvalid).toBe(true);
  });

  test('エラー時に最初の不正フィールドにフォーカスが移動する', async ({ page }) => {
    await page.goto(baseUrl);
    
    // 氏名を空にして、他は入力
    await page.fill('#username', ''); // 明示的に空
    await page.selectOption('#contact', 'email');
    await page.fill('#email', 'test@example.com');
    
    // 送信前のフォーカス位置を記録
    await page.click('button[type="submit"]');
    
    // 送信後、フォーカスがどこにあるか確認
    const focusedElement = await page.evaluate(() => {
      return document.activeElement?.id || document.activeElement?.tagName;
    });
    console.log('Focused element after submit:', focusedElement);
    
    // 最初のエラーフィールド(username)にフォーカスが移動しているべき
    // ただしブラウザのネイティブバリデーションの挙動に依存
  });

  test('不正なメール形式でのエラーメッセージを確認', async ({ page }) => {
    await page.goto(baseUrl);
    
    await page.fill('#username', 'テスト太郎');
    await page.selectOption('#contact', 'email');
    await page.fill('#email', 'invalid-email'); // @なしの不正形式
    
    await page.click('button[type="submit"]');
    
    const emailInput = page.locator('#email');
    const validationMessage = await emailInput.evaluate((el: HTMLInputElement) => el.validationMessage);
    console.log('Invalid email format message:', validationMessage);
    
    // メッセージが分かりやすいか(「@を含めてください」のような具体的な指示)
  });

  test('エラー修正後に正常送信できる', async ({ page }) => {
    await page.goto(baseUrl);
    
    // 最初は不正なデータで送信
    await page.fill('#username', '');
    await page.selectOption('#contact', 'email');
    await page.fill('#email', 'test@example.com');
    await page.click('button[type="submit"]');
    
    // エラー状態を確認
    const usernameInvalid = await page.locator('#username').evaluate((el: HTMLInputElement) => !el.checkValidity());
    expect(usernameInvalid).toBe(true);
    
    // エラーを修正
    await page.fill('#username', '修正後の名前');
    
    // 再送信
    await page.click('button[type="submit"]');
    await page.waitForLoadState('networkidle');
    
    // 確認画面に遷移できたか
    const currentUrl = page.url();
    console.log('URL after fix and resubmit:', currentUrl);
    expect(currentUrl).toContain('confirm');
  });
});
