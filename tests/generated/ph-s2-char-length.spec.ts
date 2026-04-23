import { test, expect } from '@playwright/test';
import { gotoAndDismiss, dismissAllDialogs } from './helpers/dismiss-dialogs';

/**
 * Session #2 — 観点04/05/06: 文字数（正常値/正常限界/異常値）
 * Session #2 — 観点09: 未入力
 *
 * 対象: ニックネーム編集, プロモーションコード
 *
 * 欠陥仮定:
 *  - ニックネーム24文字ちょうどで off-by-one（23文字OK / 24文字NG、または25文字が通る）
 *  - ニックネーム空入力・スペースのみでも保存ボタンが有効化される
 *  - プロモコード maxLength 未設定 (F-03) で1000文字超の送信がサーバーエラー
 *  - 全角スペースだけの入力が「入力あり」と判定される
 */

/** ニックネーム編集画面にSPA遷移するヘルパー
 *  H-01: dismissAllDialogs の dialog.close() が React state を壊すため、
 *  遷移先では dismiss しない。/others での dismiss + force click で遷移。
 */
async function navigateToNicknameEdit(page: import('@playwright/test').Page) {
  await gotoAndDismiss(page, '/others');
  const link = page.locator('a[href="/others/nickname_edit"]');
  await link.click({ force: true });
  await page.waitForURL('**/others/nickname_edit**', { timeout: 10000 });
  // ★ 遷移先では dismissAllDialogs を呼ばない (H-01)
}

test.describe('Session #2: 文字数系テスト', () => {

  // ===== 観点04: 文字数(正常値) =====

  test('観点04: ニックネーム - 正常値(1文字/12文字/20文字)', async ({ page }) => {
    await navigateToNicknameEdit(page);

    // 入力フィールドを特定（contenteditable or input）
    // Session1で input[] = 空だったので、contenteditable/div型の可能性あり
    const allInputs = await page.evaluate(() => {
      // 通常 input
      const inputs = Array.from(document.querySelectorAll('input[type="text"], input:not([type]), textarea'));
      // contenteditable
      const editables = Array.from(document.querySelectorAll('[contenteditable="true"]'));
      return {
        inputCount: inputs.length,
        editableCount: editables.length,
        inputDetails: inputs.map(el => ({
          tag: el.tagName,
          name: (el as HTMLInputElement).name,
          type: (el as HTMLInputElement).type,
          value: (el as HTMLInputElement).value?.substring(0, 50),
          maxLength: (el as HTMLInputElement).maxLength,
        })),
        editableDetails: editables.map(el => ({
          tag: el.tagName,
          text: el.textContent?.substring(0, 50),
          className: el.className,
        })),
      };
    });
    console.log('入力要素:', JSON.stringify(allInputs, null, 2));

    // カウンター表示 "N/24" を確認
    const counterText = await page.evaluate(() => {
      const body = document.body.innerText;
      const match = body.match(/(\d+)\/24/);
      return match ? match[0] : null;
    });
    console.log(`文字数カウンター: ${counterText}`);

    // 入力方法を判定して文字入力を試みる
    if (allInputs.inputCount > 0) {
      const nicknameInput = page.locator('input[type="text"], input:not([type]), textarea').first();

      const testCases = [
        { label: '1文字', value: 'あ', expectedCount: '1/24' },
        { label: '12文字(中央値)', value: 'テスト名前123456', expectedCount: '12/24' },
        { label: '20文字(上限付近)', value: 'ニックネームテスト12345678', expectedCount: '20/24' },
      ];

      for (const tc of testCases) {
        await nicknameInput.fill(tc.value);
        const actual = await nicknameInput.inputValue();
        console.log(`${tc.label}: 入力="${tc.value}" (${tc.value.length}文字) → 取得="${actual}" (${actual.length}文字)`);

        // カウンター更新を確認
        const counter = await page.evaluate(() => {
          const body = document.body.innerText;
          const match = body.match(/(\d+)\/24/);
          return match ? match[0] : null;
        });
        console.log(`  カウンター: ${counter}`);

        // 保存ボタンの状態確認
        const saveBtn = page.locator('button:has-text("保存する")');
        if (await saveBtn.count() > 0) {
          const isEnabled = await saveBtn.isEnabled();
          console.log(`  保存ボタン: enabled=${isEnabled}`);
        }
      }
    } else {
      // contenteditable パターン: body テキストから入力要素の構造を記録
      const bodyText = await page.evaluate(() => document.body.innerText);
      console.log('ページテキスト:', bodyText.substring(0, 500));
      console.log('INFO: input/textarea が見つからない。contenteditable または別のUI実装');
    }

    await page.screenshot({ path: 'test-results/ph-s2-nickname-normal-length.png', fullPage: true });
  });

  // ===== 観点05: 文字数(正常限界) =====

  test('観点05: ニックネーム - 正常限界値(24文字ちょうど)', async ({ page }) => {
    await navigateToNicknameEdit(page);

    const nicknameInput = page.locator('input[type="text"], input:not([type]), textarea').first();
    if (await nicknameInput.count() === 0) {
      console.log('SKIP: input フィールドなし');
      const bodyText = await page.evaluate(() => document.body.innerText);
      console.log('ページテキスト:', bodyText.substring(0, 500));
      return;
    }

    // 24文字ちょうど
    const exact24 = 'あいうえおかきくけこさしすせそたちつてとなにぬね'; // 24文字
    console.log(`テスト文字列: "${exact24}" (${exact24.length}文字)`);
    expect(exact24.length).toBe(24);

    await nicknameInput.fill(exact24);
    const actual = await nicknameInput.inputValue();
    console.log(`24文字入力: 取得="${actual}" (${actual.length}文字)`);

    // 24文字がそのまま入力されるか
    expect(actual.length).toBe(24);

    // カウンター確認
    const counter = await page.evaluate(() => {
      const body = document.body.innerText;
      const match = body.match(/(\d+)\/24/);
      return match ? match[0] : null;
    });
    console.log(`カウンター: ${counter}`);
    expect(counter).toBe('24/24');

    // 保存ボタンの状態
    const saveBtn = page.locator('button:has-text("保存する")');
    if (await saveBtn.count() > 0) {
      const isEnabled = await saveBtn.isEnabled();
      console.log(`保存ボタン: enabled=${isEnabled}`);
      // 24文字ちょうどは有効であるべき
      expect(isEnabled).toBeTruthy();
    }

    await page.screenshot({ path: 'test-results/ph-s2-nickname-boundary-24.png', fullPage: true });
  });

  // ===== 観点06: 文字数(異常値) =====

  test('観点06: ニックネーム - 異常値(25文字以上)', async ({ page }) => {
    await navigateToNicknameEdit(page);

    const nicknameInput = page.locator('input[type="text"], input:not([type]), textarea').first();
    if (await nicknameInput.count() === 0) {
      console.log('SKIP: input フィールドなし');
      return;
    }

    // 25文字 (上限+1)
    const over25 = 'あいうえおかきくけこさしすせそたちつてとなにぬねの'; // 25文字
    expect(over25.length).toBe(25);
    await nicknameInput.fill(over25);
    const actual25 = await nicknameInput.inputValue();
    console.log(`25文字入力: 取得="${actual25}" (${actual25.length}文字)`);

    // maxLength=24 ならフロント側で24文字に切り詰められるはず
    if (actual25.length <= 24) {
      console.log('OK: フロントエンドで24文字に切り詰められた');
    } else {
      console.log('WARN: 25文字がそのまま入力された → maxLength制限なし or JS制御');
      // カウンターの表示を確認
      const counter = await page.evaluate(() => {
        const body = document.body.innerText;
        const match = body.match(/(\d+)\/24/);
        return match ? match[0] : null;
      });
      console.log(`カウンター: ${counter}`);

      // 保存ボタンの状態（25文字以上なら disabled であるべき）
      const saveBtn = page.locator('button:has-text("保存する")');
      if (await saveBtn.count() > 0) {
        const isEnabled = await saveBtn.isEnabled();
        console.log(`保存ボタン: enabled=${isEnabled}`);
        if (isEnabled) {
          console.log('FINDING: 25文字でも保存ボタンが有効 → バリデーション不足の可能性');
        }
      }
    }

    // 50文字 (大幅超過)
    const over50 = 'あ'.repeat(50);
    await nicknameInput.fill(over50);
    const actual50 = await nicknameInput.inputValue();
    console.log(`50文字入力: 入力=${over50.length}文字 → 取得=${actual50.length}文字`);

    // 100文字 (さらに超過)
    const over100 = 'テ'.repeat(100);
    await nicknameInput.fill(over100);
    const actual100 = await nicknameInput.inputValue();
    console.log(`100文字入力: 入力=${over100.length}文字 → 取得=${actual100.length}文字`);

    await page.screenshot({ path: 'test-results/ph-s2-nickname-over-limit.png', fullPage: true });
  });

  test('観点06: プロモーションコード - 異常な長さ(F-03: maxLength未設定)', async ({ page }) => {
    await gotoAndDismiss(page, '/others');
    await page.locator('a[href*="/promotion_code"]').click({ force: true });
    await expect(page).toHaveURL(/\/promotion_code/);

    const codeInput = page.locator('input[name="code"]');
    await expect(codeInput).toBeVisible();

    // maxLength 属性の確認
    const maxLength = await codeInput.getAttribute('maxlength');
    const maxLengthProp = await codeInput.evaluate(el => (el as HTMLInputElement).maxLength);
    console.log(`maxlength属性: ${maxLength}, maxLengthプロパティ: ${maxLengthProp}`);

    // 段階的に長い文字列を送信（半角英数字のみ）
    const lengths = [100, 500, 1000, 5000];
    for (const len of lengths) {
      const longCode = 'A'.repeat(len);
      await codeInput.fill(longCode);
      const actual = await codeInput.inputValue();
      console.log(`${len}文字入力: 取得=${actual.length}文字`);

      if (actual.length < len) {
        console.log(`  → フロント側で${actual.length}文字に切り詰め`);
        break; // フロント制限があればそれ以上は不要
      }
    }

    // 1000文字で実際にサーバー送信してみる（半角英数字なのでバリデーションは通るはず）
    const longValid = 'TESTCODE' + 'A'.repeat(992); // 1000文字の半角英数字
    await codeInput.fill(longValid);

    const submitBtn = page.locator('button:has-text("コードを送信する")');
    if (await submitBtn.count() > 0 && await submitBtn.isEnabled()) {
      await submitBtn.click();
      await page.waitForTimeout(3000);

      const afterText = await page.evaluate(() => document.body.innerText);
      console.log('1000文字送信後:', afterText.substring(0, 500));

      // サーバーエラー (500 等) が出ていないか
      const hasServerError = afterText.includes('500') || afterText.includes('Internal Server Error') ||
                             afterText.includes('エラーが発生') || afterText.includes('Bad Request');
      console.log(`サーバーエラー表示: ${hasServerError}`);

      // 正常なバリデーションメッセージが出ているか
      const hasValidation = afterText.includes('確認できません') || afterText.includes('プロモーション');
      console.log(`バリデーションメッセージ: ${hasValidation}`);

      await page.screenshot({ path: 'test-results/ph-s2-promo-long-submit.png', fullPage: true });
    }
  });

  // ===== 観点09: 未入力 =====

  test('観点09: ニックネーム - 空入力・空白のみの挙動', async ({ page }) => {
    await navigateToNicknameEdit(page);

    const nicknameInput = page.locator('input[type="text"], input:not([type]), textarea').first();
    if (await nicknameInput.count() === 0) {
      console.log('SKIP: input フィールドなし');
      const bodyText = await page.evaluate(() => document.body.innerText);
      console.log('ページテキスト:', bodyText.substring(0, 500));
      return;
    }

    const saveBtn = page.locator('button:has-text("保存する")');
    const hasSaveBtn = await saveBtn.count() > 0;

    const blankCases = [
      { label: '空文字', value: '' },
      { label: '半角スペースのみ', value: '   ' },
      { label: '全角スペースのみ', value: '　　　' },
      { label: 'タブのみ', value: '\t\t' },
      { label: '改行のみ', value: '\n\n' },
    ];

    for (const tc of blankCases) {
      await nicknameInput.fill(tc.value);
      const actual = await nicknameInput.inputValue();
      console.log(`${tc.label}: 入力="${tc.value.replace(/\s/g, '(space)')}" → 取得="${actual.replace(/\s/g, '(space)')}" (${actual.length}文字)`);

      // カウンター
      const counter = await page.evaluate(() => {
        const body = document.body.innerText;
        const match = body.match(/(\d+)\/24/);
        return match ? match[0] : null;
      });
      console.log(`  カウンター: ${counter}`);

      // 保存ボタンの状態
      if (hasSaveBtn) {
        const isEnabled = await saveBtn.isEnabled();
        console.log(`  保存ボタン: enabled=${isEnabled}`);
        if (isEnabled && (actual.trim().length === 0)) {
          console.log(`  FINDING: "${tc.label}" で保存ボタンが有効 → 空白文字を「入力あり」と判定`);
        }
      }
    }

    await page.screenshot({ path: 'test-results/ph-s2-nickname-blank-input.png', fullPage: true });
  });

  test('観点09: プロモーションコード - 空白バリエーション', async ({ page }) => {
    await gotoAndDismiss(page, '/others');
    await page.locator('a[href*="/promotion_code"]').click({ force: true });
    await expect(page).toHaveURL(/\/promotion_code/);

    const codeInput = page.locator('input[name="code"]');
    await expect(codeInput).toBeVisible();
    const submitBtn = page.locator('button:has-text("コードを送信する")');
    const hasBtn = await submitBtn.count() > 0;

    const blankCases = [
      { label: '空文字', value: '' },
      { label: '半角スペースのみ', value: '   ' },
      { label: '全角スペースのみ', value: '　　　' },
    ];

    for (const tc of blankCases) {
      await codeInput.fill(tc.value);
      const actual = await codeInput.inputValue();
      console.log(`${tc.label}: 取得="${actual}" (${actual.length}文字)`);

      if (hasBtn) {
        const isDisabled = await submitBtn.isDisabled();
        console.log(`  送信ボタン: disabled=${isDisabled}`);
        if (!isDisabled && actual.trim().length === 0) {
          console.log(`  FINDING: "${tc.label}" で送信ボタンが有効 → 空白を「入力あり」と判定`);
        }
      }
    }

    // スペース入力でボタンが有効な場合、送信してみる
    await codeInput.fill('   ');
    if (hasBtn && await submitBtn.isEnabled()) {
      console.log('半角スペースのみで送信試行...');
      await submitBtn.click();
      await page.waitForTimeout(2000);
      const afterText = await page.evaluate(() => document.body.innerText);
      console.log('送信後:', afterText.substring(0, 300));
    }

    await page.screenshot({ path: 'test-results/ph-s2-promo-blank-input.png', fullPage: true });
  });
});
