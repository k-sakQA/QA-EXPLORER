import { test, expect } from '@playwright/test';
import { gotoAndDismiss, dismissAllDialogs } from './helpers/dismiss-dialogs';

/**
 * P0 観点02: エラー表示 / 観点23: 禁則
 * P0 観点11: 状態遷移
 * P1 観点03: 文字種 / 観点07: 数値正常値
 *
 * 対象: ニックネーム編集・プロモーションコード入力
 * 欠陥仮定:
 *  - 空入力でバリデーションメッセージが出ない
 *  - 特殊文字(XSS用文字列、絵文字)で壊れる
 *  - 制限を超える入力がサーバに通る
 *  - エラー後に再送信できない
 */
test.describe('P0-P1: 入力フォーム総合テスト', () => {

  // --- ニックネーム編集 ---

  test('観点02/11: ニックネーム編集 - ページ構造と初期状態の確認', async ({ page }) => {
    await gotoAndDismiss(page, '/others');
    // ニックネーム編集リンクをクリック
    const nicknameLink = page.locator('a:has-text("ニックネームの編集")');
    await nicknameLink.click();
    // SPA遷移 or モーダルを待つ
    await page.waitForTimeout(2000);
    await dismissAllDialogs(page);

    // ページの全テキストとHTML構造を確認
    const url = page.url();
    console.log(`URL: ${url}`);

    const bodyText = await page.evaluate(() => document.body.innerText);
    console.log(`Body text: ${bodyText.substring(0, 500)}`);

    // input/textarea を全て取得
    const inputs = await page.evaluate(() =>
      Array.from(document.querySelectorAll('input, textarea, [contenteditable]')).map(el => ({
        tag: el.tagName,
        name: (el as HTMLInputElement).name,
        type: (el as HTMLInputElement).type,
        value: (el as HTMLInputElement).value?.substring(0, 100),
        placeholder: (el as HTMLInputElement).placeholder,
        maxLength: (el as HTMLInputElement).maxLength,
        required: (el as HTMLInputElement).required,
        disabled: (el as HTMLInputElement).disabled,
        ariaLabel: el.getAttribute('aria-label'),
      }))
    );
    console.log('All inputs:', JSON.stringify(inputs, null, 2));

    // ボタンを全て取得
    const buttons = await page.evaluate(() =>
      Array.from(document.querySelectorAll('button, [role="button"], input[type="submit"]')).map(el => ({
        tag: el.tagName,
        text: el.textContent?.trim().substring(0, 50),
        type: (el as HTMLButtonElement).type,
        disabled: (el as HTMLButtonElement).disabled,
      }))
    );
    console.log('All buttons:', JSON.stringify(buttons, null, 2));

    await page.screenshot({ path: 'test-results/ph-nickname-structure.png', fullPage: true });
  });

  test('観点02: ニックネーム - 空入力でエラーが出るか', async ({ page }) => {
    await gotoAndDismiss(page, '/others');
    await page.locator('a:has-text("ニックネームの編集")').click();
    await page.waitForTimeout(2000);
    await dismissAllDialogs(page);

    // input を探す
    const nicknameInput = page.locator('input[name], input[type="text"], textarea').first();
    const inputCount = await nicknameInput.count();
    if (inputCount === 0) {
      console.log('SKIP: ニックネーム入力フィールドが見つからない（モーダル式の可能性）');
      // ページ全体のスナップショットで構造を記録
      const html = await page.evaluate(() => document.body.innerHTML.substring(0, 2000));
      console.log('HTML snippet:', html);
      return;
    }

    // 現在の値をクリアして空に
    await nicknameInput.fill('');
    console.log('入力をクリア完了');

    // 送信ボタンを探して押す
    const submitBtn = page.locator('button:has-text("保存"), button:has-text("変更"), button:has-text("更新"), button[type="submit"]').first();
    if (await submitBtn.count() > 0) {
      await submitBtn.click();
      await page.waitForTimeout(1000);

      const afterText = await page.evaluate(() => document.body.innerText);
      console.log('送信後のテキスト:', afterText.substring(0, 500));

      // エラーメッセージの存在確認
      const hasError = await page.evaluate(() => {
        const text = document.body.innerText;
        return text.includes('エラー') || text.includes('入力してください') ||
               text.includes('必須') || text.includes('error') || text.includes('required');
      });
      console.log(`エラーメッセージ表示: ${hasError}`);

      await page.screenshot({ path: 'test-results/ph-nickname-empty-submit.png', fullPage: true });
    } else {
      console.log('SKIP: 送信ボタンが見つからない');
    }
  });

  test('観点03: ニックネーム - 特殊文字入力テスト', async ({ page }) => {
    await gotoAndDismiss(page, '/others');
    await page.locator('a:has-text("ニックネームの編集")').click();
    await page.waitForTimeout(2000);
    await dismissAllDialogs(page);

    const nicknameInput = page.locator('input[name], input[type="text"], textarea').first();
    if (await nicknameInput.count() === 0) {
      console.log('SKIP: 入力フィールドなし');
      return;
    }

    const testCases = [
      { label: '絵文字(サロゲートペア)', value: '🐉テスト🔥' },
      { label: 'XSS基本', value: '<script>alert(1)</script>' },
      { label: 'HTMLタグ', value: '<img src=x onerror=alert(1)>' },
      { label: '全角スペースのみ', value: '　　　' },
      { label: '半角スペースのみ', value: '   ' },
      { label: '制御文字(タブ)', value: 'テスト\tタブ' },
      { label: 'SQL injection', value: "'; DROP TABLE users; --" },
    ];

    for (const tc of testCases) {
      await nicknameInput.fill(tc.value);
      const actual = await nicknameInput.inputValue();
      console.log(`${tc.label}: 入力="${tc.value}" → 取得="${actual}"`);
    }

    await page.screenshot({ path: 'test-results/ph-nickname-special-chars.png', fullPage: true });
  });

  // --- プロモーションコード ---

  test('観点02/23: プロモーションコード - 構造確認と空入力', async ({ page }) => {
    await gotoAndDismiss(page, '/others');
    await page.locator('a[href*="/promotion_code"]').click();
    await expect(page).toHaveURL(/\/promotion_code/);
    await dismissAllDialogs(page);

    // 入力フィールド確認
    const codeInput = page.locator('input[name="code"]');
    await expect(codeInput).toBeVisible();
    console.log('プロモーションコード入力: visible');

    // placeholder 確認
    const placeholder = await codeInput.getAttribute('placeholder');
    console.log(`Placeholder: ${placeholder}`);

    // ボタン確認
    const buttons = await page.evaluate(() =>
      Array.from(document.querySelectorAll('button')).map(el => ({
        text: el.textContent?.trim().substring(0, 50),
        disabled: el.disabled,
      }))
    );
    console.log('Buttons:', JSON.stringify(buttons, null, 2));

    // 空入力で送信ボタンの状態確認
    await codeInput.fill('');
    const submitBtn = page.locator('button:has-text("コードを送信する")').first();
    if (await submitBtn.count() > 0) {
      const isDisabled = await submitBtn.isDisabled();
      console.log(`空入力時のボタン状態: disabled=${isDisabled}`);
      // 空入力でボタンが無効化されていることを確認 (観点02: 適切なバリデーション)
      expect(isDisabled).toBeTruthy();
      console.log('観点02: 空入力でボタン無効化 = 正常動作');

      // 値を入力するとボタンが有効化されるか
      await codeInput.fill('TEST');
      const isEnabledAfter = await submitBtn.isEnabled();
      console.log(`値入力後のボタン状態: enabled=${isEnabledAfter}`);
    } else {
      console.log('送信ボタンが見つからない');
    }

    await page.screenshot({ path: 'test-results/ph-promo-empty-submit.png', fullPage: true });
  });

  test('観点03/23: プロモーションコード - 不正な値を入力', async ({ page }) => {
    await gotoAndDismiss(page, '/others');
    await page.locator('a[href*="/promotion_code"]').click();
    await expect(page).toHaveURL(/\/promotion_code/);
    await dismissAllDialogs(page);

    const codeInput = page.locator('input[name="code"]');
    await expect(codeInput).toBeVisible();

    const testCases = [
      { label: 'XSS', value: '<script>alert(1)</script>' },
      { label: 'SQL injection', value: "' OR 1=1 --" },
      { label: '超長文字列', value: 'A'.repeat(500) },
      { label: '絵文字', value: '🎉🎊🎁' },
      { label: '存在しないコード', value: 'INVALID-CODE-12345' },
    ];

    for (const tc of testCases) {
      await codeInput.fill(tc.value);
      const actual = await codeInput.inputValue();
      console.log(`${tc.label}: 入力="${tc.value.substring(0, 50)}" → 取得="${actual.substring(0, 50)}"`);
    }

    // 存在しないコードで送信してみる (半角英数字のみ)
    await codeInput.fill('INVALIDCODE12345');
    const submitBtn = page.locator('button:has-text("コードを送信する")').first();
    if (await submitBtn.count() > 0 && await submitBtn.isEnabled()) {
      await submitBtn.click();
      await page.waitForTimeout(2000);

      const afterText = await page.evaluate(() => document.body.innerText);
      console.log('不正コード送信後:', afterText.substring(0, 500));

      await page.screenshot({ path: 'test-results/ph-promo-invalid-submit.png', fullPage: true });
    } else {
      console.log('送信ボタンが見つからない or disabled');
    }
  });

  // --- 観点11: 状態遷移 ---

  test('観点11: パック一覧 → 詳細 → 戻る の状態保持', async ({ page }) => {
    await gotoAndDismiss(page, '/packs');

    // パック一覧の状態を記録
    const packsBefore = await page.evaluate(() => document.body.innerText);
    console.log('パック一覧(before):', packsBefore.substring(0, 200));

    // パック詳細に遷移
    const detailLink = page.locator('a[href*="/packs/cardpackcampaign_"]').first();
    await detailLink.click();
    await expect(page).toHaveURL(/\/packs\/cardpackcampaign_/);
    await dismissAllDialogs(page);

    const detailText = await page.evaluate(() => document.body.innerText);
    console.log('パック詳細:', detailText.substring(0, 200));

    // ブラウザバック
    await page.goBack();
    await page.waitForLoadState('networkidle');
    await dismissAllDialogs(page);

    // パック一覧に戻れたか
    await expect(page).toHaveURL(/\/packs$/);
    const packsAfter = await page.evaluate(() => document.body.innerText);
    console.log('パック一覧(after):', packsAfter.substring(0, 200));

    // コンテンツが保持されているか
    await expect(page.locator('body')).toContainText('PACK');
    console.log('ブラウザバック: パック一覧が正常に復元');
  });

  test('観点11: ホーム → Shop → ブラウザバック', async ({ page }) => {
    await gotoAndDismiss(page, '/home');

    // Shop に遷移
    await page.locator('a[href="/shop"]').first().click();
    await expect(page).toHaveURL(/\/shop/);
    console.log('Shop 遷移: OK');

    // ブラウザバック
    await page.goBack();
    await page.waitForLoadState('networkidle');
    await dismissAllDialogs(page);

    await expect(page).toHaveURL(/\/home/);
    await expect(page.locator('body')).toContainText('PICK UP');
    console.log('ブラウザバック: ホームが正常に復元');
  });

  // --- 観点23: 禁則 ---

  test('観点23: Shop - バモス購入ボタンの存在と動作確認', async ({ page }) => {
    // Shop ページのバモス購入ボタンが存在するか、クリック可能か
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        await page.goto('/shop', { waitUntil: 'domcontentloaded', timeout: 30000 });
        break;
      } catch (e) {
        if (attempt === 2) throw e;
        await page.waitForTimeout(2000);
      }
    }
    await expect(page.locator('body')).toContainText('バモス', { timeout: 30000 });

    // 購入ボタンの確認 (クリックはしない = 課金操作なので)
    // 注意: dismissAllDialogs は /shop の React state を壊すので呼ばない
    const buttons = await page.evaluate(() =>
      Array.from(document.querySelectorAll('button, a[role="button"]')).map(el => ({
        text: el.textContent?.trim().substring(0, 100),
        disabled: (el as HTMLButtonElement).disabled,
        tag: el.tagName,
      }))
    );
    console.log('Shop ボタン一覧:', JSON.stringify(buttons, null, 2));

    // 価格表示の正当性: 全て正の整数であること
    const bodyText = await page.evaluate(() => document.body.innerText);
    const prices = bodyText.match(/¥([\d,]+)/g) || [];
    console.log(`価格一覧: ${prices.join(', ')}`);
    for (const p of prices) {
      const num = parseInt(p.replace(/[¥,]/g, ''));
      expect(num).toBeGreaterThan(0);
      console.log(`  ${p} = ${num} > 0 ✓`);
    }

    await page.screenshot({ path: 'test-results/ph-shop-buttons.png', fullPage: true });
  });
});
