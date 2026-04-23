import { test, expect } from '@playwright/test';
import { gotoAndDismiss } from './helpers/dismiss-dialogs';

/**
 * Probe P-20260423-02: ニックネームにスペースのみを入力して保存を試行
 *
 * 仮説 H-20260423-02: フロントエンドの trim() バリデーション不足
 *   — スペースのみ入力で保存ボタンが有効 (F-13 で確認済み)
 *   — 実際に保存した場合、サーバー側で弾かれるか？空白ニックネームが成立するか？
 *
 * 手順:
 *   1. ニックネーム編集画面に遷移
 *   2. 半角スペースのみ入力 → 保存ボタンクリック
 *   3. 保存結果を確認（成功 or エラー）
 *   4. 元のニックネーム「2233さかた」に復旧
 */

const ORIGINAL_NICKNAME = '2233さかた';

async function navigateToNicknameEdit(page: import('@playwright/test').Page) {
  await gotoAndDismiss(page, '/others');
  const link = page.locator('a[href="/others/nickname_edit"]');
  await link.click({ force: true });
  await page.waitForURL('**/others/nickname_edit**', { timeout: 10000 });
}

async function getNicknameValue(page: import('@playwright/test').Page): Promise<string> {
  const nicknameInput = page.locator('textarea[name="nickname"]');
  return await nicknameInput.inputValue();
}

async function saveNickname(page: import('@playwright/test').Page, value: string): Promise<{
  savedOk: boolean;
  errorMessage: string | null;
  urlAfterSave: string;
  bodyTextSnippet: string;
}> {
  const nicknameInput = page.locator('textarea[name="nickname"]');
  await nicknameInput.fill(value);

  const saveBtn = page.locator('button:has-text("保存する")');
  const isEnabled = await saveBtn.isEnabled();
  if (!isEnabled) {
    return {
      savedOk: false,
      errorMessage: '保存ボタンが disabled',
      urlAfterSave: page.url(),
      bodyTextSnippet: '',
    };
  }

  // ネットワーク応答を監視しながら保存クリック
  const [response] = await Promise.all([
    page.waitForResponse(
      resp => resp.url().includes('nickname') || resp.url().includes('user'),
      { timeout: 10000 }
    ).catch(() => null),
    saveBtn.click({ force: true }),
  ]);

  // 保存後の状態を少し待つ
  await page.waitForTimeout(2000);

  const urlAfterSave = page.url();
  const bodyText = await page.evaluate(() => document.body.innerText);

  // エラーメッセージがあるか確認
  const errorPatterns = ['エラー', '失敗', '不正', '入力してください', 'error', 'failed'];
  let errorMessage: string | null = null;
  for (const pattern of errorPatterns) {
    if (bodyText.includes(pattern)) {
      errorMessage = pattern;
      break;
    }
  }

  // リダイレクトされたか（保存成功で /others に戻る場合がある）
  const savedOk = urlAfterSave.includes('/others') && !urlAfterSave.includes('/nickname_edit')
    || !errorMessage;

  return {
    savedOk,
    errorMessage,
    urlAfterSave,
    bodyTextSnippet: bodyText.substring(0, 500),
  };
}

test.describe('Probe P-02: スペースのみニックネーム保存', () => {

  test('半角スペースのみのニックネームを保存し、結果を確認し、元に戻す', async ({ page }) => {
    // === Step 1: 元のニックネームを確認 ===
    await navigateToNicknameEdit(page);
    const originalValue = await getNicknameValue(page);
    console.log(`元のニックネーム: "${originalValue}" (${originalValue.length}文字)`);
    expect(originalValue).toBe(ORIGINAL_NICKNAME);

    // === Step 2: 半角スペース3文字で保存を試行 ===
    console.log('\n=== 半角スペースのみで保存試行 ===');
    const spaceResult = await saveNickname(page, '   ');
    console.log(`保存結果: savedOk=${spaceResult.savedOk}`);
    console.log(`URL: ${spaceResult.urlAfterSave}`);
    console.log(`エラー: ${spaceResult.errorMessage}`);
    console.log(`ページテキスト: ${spaceResult.bodyTextSnippet}`);
    await page.screenshot({ path: 'test-results/ph-probe-02-space-save-result.png', fullPage: true });

    // === Step 3: 保存された値を確認 ===
    // /others に戻ったかニックネーム編集に留まったかで判定
    if (spaceResult.urlAfterSave.includes('/nickname_edit')) {
      console.log('→ ニックネーム編集画面に留まった (サーバーエラー or バリデーション)');
      const currentValue = await getNicknameValue(page);
      console.log(`現在の値: "${currentValue}" (${currentValue.length}文字)`);

      // エラーダイアログの OK ボタンがあれば閉じる
      const errorDialog = page.locator('dialog[open] .ErrorDialog_content__rXuFo button');
      if (await errorDialog.count() > 0) {
        console.log('エラーダイアログの OK を押下');
        await errorDialog.first().click({ force: true });
        await page.waitForTimeout(500);
      }
      // /others に遷移 = 保存成功の可能性
      console.log('→ /others に遷移した (保存成功の可能性)');

      // ニックネーム表示を確認
      const othersText = await page.evaluate(() => document.body.innerText);
      console.log(`/others ページテキスト: ${othersText.substring(0, 300)}`);

      // ニックネーム編集に再度遷移して保存された値を確認
      await navigateToNicknameEdit(page);
      const savedValue = await getNicknameValue(page);
      console.log(`\n保存されたニックネーム: "${savedValue}" (${savedValue.length}文字)`);
      console.log(`スペースのみか: ${savedValue.trim().length === 0}`);

      if (savedValue.trim().length === 0) {
        console.log('★★★ BUG CONFIRMED: スペースのみのニックネームが保存された！ ★★★');
        console.log('H-20260423-02 → Confirmed: trim() バリデーションがサーバー側にもない');
      } else {
        console.log(`サーバーが変換/拒否: 保存された値="${savedValue}"`);
      }
    }

    // === Step 4: 元のニックネームに復旧 ===
    console.log('\n=== 復旧: 元のニックネームに戻す ===');
    // 確実に復旧するため、ページを最初から遷移し直す
    await navigateToNicknameEdit(page);
    // エラーダイアログが残っている場合はOKを押す
    const remainingDialog = page.locator('dialog[open] .ErrorDialog_content__rXuFo button');
    if (await remainingDialog.count() > 0) {
      await remainingDialog.first().click({ force: true });
      await page.waitForTimeout(500);
    }
    const restoreResult = await saveNickname(page, ORIGINAL_NICKNAME);
    console.log(`復旧結果: savedOk=${restoreResult.savedOk}`);
    console.log(`URL: ${restoreResult.urlAfterSave}`);
    console.log(`復旧後テキスト: ${restoreResult.bodyTextSnippet.substring(0, 200)}`);

    // 復旧確認: ページ遷移して確認
    await navigateToNicknameEdit(page);
    const restoredValue = await getNicknameValue(page);
    console.log(`復旧後のニックネーム: "${restoredValue}"`);
    expect(restoredValue).toBe(ORIGINAL_NICKNAME);
    console.log('✓ ニックネーム復旧完了');

    await page.screenshot({ path: 'test-results/ph-probe-02-restored.png', fullPage: true });
  });
});
