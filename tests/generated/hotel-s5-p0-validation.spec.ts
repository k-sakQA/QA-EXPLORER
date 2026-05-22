import { test, expect, Page } from '@playwright/test';

/**
 * Session 5: P0 観点テスト
 * V10: 単機能（予約フロー正常動作）
 * V11: イベントによる状態変化（遷移）
 * V02: エラー表示（バリデーションメッセージ品質）
 * V23: 禁則（業務ルール上不正な入力）
 *
 * 欠陥仮定:
 * - V10: 予約フロー (一覧→フォーム→確認→完了) のどこかでデータ引き継ぎが壊れる
 * - V11: 確認画面→戻るで状態が消失する
 * - V02: エラーメッセージが曖昧 / 内部コード漏洩 / フィールドごとのエラーが出ない
 * - V23: 過去日付・宿泊数0・人数0 など禁則が素通りする
 */

const BASE = 'https://hotel-example-site.takeyaqa.dev/ja';

/** 明後日の日付文字列を生成 */
function futureDate(daysAhead: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
}

/** 昨日の日付 */
function pastDate(daysBack: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysBack);
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
}

/** フォームに正常値を入力するヘルパー */
async function fillValidForm(page: Page) {
  await page.locator('#date').fill(futureDate(2));
  await page.locator('#term').fill('1');
  await page.locator('#head-count').fill('1');
  const username = page.locator('#username');
  if (await username.isVisible()) {
    await username.fill('テスト太郎');
  }
  await page.locator('#contact').selectOption('no');
}

// ========================================
// V10: 単機能 — 予約フローの正常動作確認
// ========================================
test.describe('V10: 単機能 - 予約フロー正常動作', () => {

  test('プラン一覧 → フォーム → 確認 → 完了の一連フロー', async ({ page, context }) => {
    // 1. プラン一覧
    await page.goto(`${BASE}/plans.html`);
    const firstPlan = page.locator('.card').first();
    await expect(firstPlan).toBeVisible();

    // 2. プランのリンクをクリック（新規タブで開く可能性）
    const planLink = firstPlan.locator('a');
    const [newPage] = await Promise.all([
      context.waitForEvent('page'),
      planLink.click(),
    ]);
    await newPage.waitForLoadState('networkidle');

    // reserve.html に遷移したか
    expect(newPage.url()).toContain('reserve.html');

    // 3. フォーム入力
    await fillValidForm(newPage);

    // 4. 確認ボタン
    await newPage.getByRole('button', { name: '予約内容を確認する' }).click();
    await newPage.waitForLoadState('networkidle');

    // 確認画面に遷移
    expect(newPage.url()).toContain('confirm.html');

    // 確認画面に入力値が反映されている
    await expect(newPage.locator('body')).toContainText('テスト太郎');
    await expect(newPage.locator('body')).toContainText('1泊');
    await expect(newPage.locator('body')).toContainText('1名様');

    // 5. 予約完了
    await newPage.getByRole('button', { name: 'この内容で予約する' }).click();

    // 完了モーダル
    const modal = newPage.locator('.modal');
    await expect(modal).toBeVisible();
    await expect(modal).toContainText('予約を完了しました');
  });

  test('各プラン(0-9)のフォームが正常に開けるか', async ({ page }) => {
    for (let i = 0; i <= 9; i++) {
      const response = await page.goto(`${BASE}/reserve.html?plan-id=${i}`);
      expect(response?.status()).toBe(200);

      // 基本要素が存在
      await expect(page.locator('#date')).toBeVisible();
      await expect(page.locator('#term')).toBeVisible();
      await expect(page.locator('#head-count')).toBeVisible();
      await expect(page.getByRole('button', { name: '予約内容を確認する' })).toBeVisible();

      console.log(`[V10] plan-id=${i}: OK`);
    }
  });

  test('確認画面のデータ引継ぎ — 全フィールド反映チェック', async ({ page }) => {
    await page.goto(`${BASE}/reserve.html?plan-id=0`);

    // 全フィールドに特徴的な値を入れる
    await page.locator('#date').fill(futureDate(5));
    // datepickerのオーバーレイを閉じる
    await page.keyboard.press('Escape');
    await page.locator('#term').fill('3');
    await page.locator('#head-count').fill('2');
    await page.locator('#breakfast').check();
    await page.locator('#early-check-in').check();
    await page.locator('#sightseeing').check();
    const username = page.locator('#username');
    if (await username.isVisible()) {
      await username.fill('確認テスト花子');
    }
    await page.locator('#contact').selectOption('email');
    await page.locator('#email').fill('hanako@example.com');
    await page.locator('#comment').fill('ベビーベッド希望');

    await page.getByRole('button', { name: '予約内容を確認する' }).click();
    await page.waitForLoadState('networkidle');

    // 確認画面に全値が反映されているか
    const body = page.locator('body');
    await expect(body).toContainText('3泊');
    await expect(body).toContainText('2名様');
    await expect(body).toContainText('朝食バイキング');
    await expect(body).toContainText('昼からチェックインプラン');
    await expect(body).toContainText('お得な観光プラン');
    await expect(body).toContainText('確認テスト花子');
    await expect(body).toContainText('hanako@example.com');
    await expect(body).toContainText('ベビーベッド希望');
  });
});

// ========================================
// V11: イベントによる状態変化
// ========================================
test.describe('V11: イベントによる状態変化', () => {

  test('連絡方法切替で表示フィールドが変わるか', async ({ page }) => {
    await page.goto(`${BASE}/reserve.html?plan-id=0`);

    // 初期状態: 「選択してください」→ メール/電話欄の表示状態
    const email = page.locator('#email');
    const tel = page.locator('#tel');

    // 「希望しない」選択
    await page.locator('#contact').selectOption('no');
    // メール・電話欄が非表示 or 無効になるか確認
    const emailVisibleNo = await email.isVisible();
    const telVisibleNo = await tel.isVisible();
    console.log(`[V11] 希望しない: email=${emailVisibleNo}, tel=${telVisibleNo}`);

    // 「メールでのご連絡」選択
    await page.locator('#contact').selectOption('email');
    const emailVisibleEmail = await email.isVisible();
    const telVisibleEmail = await tel.isVisible();
    console.log(`[V11] メール: email=${emailVisibleEmail}, tel=${telVisibleEmail}`);
    expect(emailVisibleEmail).toBe(true);

    // 「電話でのご連絡」選択
    await page.locator('#contact').selectOption('tel');
    const emailVisibleTel = await email.isVisible();
    const telVisibleTel = await tel.isVisible();
    console.log(`[V11] 電話: email=${emailVisibleTel}, tel=${telVisibleTel}`);
    expect(telVisibleTel).toBe(true);
  });

  test('確認画面からブラウザバックで戻ったとき入力値が保持されるか', async ({ page }) => {
    await page.goto(`${BASE}/reserve.html?plan-id=0`);

    // 特徴的な値を入力
    await page.locator('#date').fill(futureDate(3));
    await page.locator('#term').fill('2');
    await page.locator('#head-count').fill('3');
    const username = page.locator('#username');
    if (await username.isVisible()) {
      await username.fill('バック太郎');
    }
    await page.locator('#contact').selectOption('no');
    await page.locator('#comment').fill('戻るテスト');

    // 確認画面へ
    await page.getByRole('button', { name: '予約内容を確認する' }).click();
    await page.waitForLoadState('networkidle');
    expect(page.url()).toContain('confirm.html');

    // ブラウザバック
    await page.goBack();
    await page.waitForLoadState('networkidle');

    // 入力値が保持されているか
    const termValue = await page.locator('#term').inputValue();
    const headValue = await page.locator('#head-count').inputValue();
    const commentValue = await page.locator('#comment').inputValue();

    console.log(`[V11] Back後 term=${termValue}, head=${headValue}, comment="${commentValue}"`);

    // 注意: SPAでないサイトではブラウザバックでフォーム値が消えることがある
    // これはバグかどうか観察
    if (termValue !== '2' || headValue !== '3') {
      console.log('[V11] ★★ BUG候補: ブラウザバックで入力値が消失 ★★');
    }
    if (commentValue !== '戻るテスト') {
      console.log('[V11] ★★ BUG候補: コメント欄が消失 ★★');
    }
  });
});

// ========================================
// V02: エラー表示（正常系）
// ========================================
test.describe('V02: エラー表示 - バリデーションメッセージの品質', () => {

  test('氏名を空にして送信 → エラーメッセージの品質', async ({ page }) => {
    await page.goto(`${BASE}/reserve.html?plan-id=0`);

    // 氏名をクリアして送信
    const username = page.locator('#username');
    await username.fill('');

    await page.locator('#contact').selectOption('no');
    await page.getByRole('button', { name: '予約内容を確認する' }).click();

    // ブラウザ標準バリデーション or カスタムエラー
    const validationMessage = await username.evaluate(
      (el: HTMLInputElement) => el.validationMessage
    );
    console.log(`[V02] 氏名空 validationMessage: "${validationMessage}"`);

    // カスタムエラー要素があるか
    const errorElements = page.locator('.error, .is-invalid, [role="alert"], .invalid-feedback');
    const errorCount = await errorElements.count();
    console.log(`[V02] カスタムエラー要素数: ${errorCount}`);

    if (errorCount > 0) {
      for (let i = 0; i < errorCount; i++) {
        const text = await errorElements.nth(i).textContent();
        console.log(`[V02] エラー要素 ${i}: "${text?.trim()}"`);
      }
    }

    // URLが変わっていないこと（フォームが送信されていない）
    expect(page.url()).toContain('reserve.html');
  });

  test('連絡方法「メール」選択 → メール未入力で送信 → 弾かれるか', async ({ page }) => {
    await page.goto(`${BASE}/reserve.html?plan-id=0`);
    await fillValidForm(page);

    // メール選択
    await page.locator('#contact').selectOption('email');
    // メール欄をクリア
    await page.locator('#email').fill('');

    await page.getByRole('button', { name: '予約内容を確認する' }).click();

    // 画面が遷移していないか？
    const url = page.url();
    console.log(`[V02] メール未入力送信後URL: ${url}`);

    if (url.includes('confirm.html')) {
      console.log('[V02] ★★ BUG: メール選択なのにメール未入力で確認画面に進めた ★★');
    }
  });

  test('連絡方法「電話」選択 → 電話未入力で送信 → 弾かれるか', async ({ page }) => {
    await page.goto(`${BASE}/reserve.html?plan-id=0`);
    await fillValidForm(page);

    // 電話選択
    await page.locator('#contact').selectOption('tel');
    // 電話欄をクリア
    await page.locator('#tel').fill('');

    await page.getByRole('button', { name: '予約内容を確認する' }).click();

    const url = page.url();
    console.log(`[V02] 電話未入力送信後URL: ${url}`);

    if (url.includes('confirm.html')) {
      console.log('[V02] ★★ BUG: 電話選択なのに電話未入力で確認画面に進めた ★★');
    }
  });

  test('日付を空にして送信 → エラーの品質', async ({ page }) => {
    await page.goto(`${BASE}/reserve.html?plan-id=0`);
    await fillValidForm(page);

    // 日付をクリア
    await page.locator('#date').fill('');
    await page.getByRole('button', { name: '予約内容を確認する' }).click();

    const validationMsg = await page.locator('#date').evaluate(
      (el: HTMLInputElement) => el.validationMessage
    );
    console.log(`[V02] 日付空 validationMessage: "${validationMsg}"`);
    expect(page.url()).toContain('reserve.html');
  });

  test('不正なメールアドレス形式で送信 → エラーメッセージの品質', async ({ page }) => {
    await page.goto(`${BASE}/reserve.html?plan-id=0`);
    await fillValidForm(page);

    await page.locator('#contact').selectOption('email');
    await page.locator('#email').fill('invalid-email');
    await page.getByRole('button', { name: '予約内容を確認する' }).click();

    const validationMsg = await page.locator('#email').evaluate(
      (el: HTMLInputElement) => el.validationMessage
    );
    console.log(`[V02] 不正メール validationMessage: "${validationMsg}"`);

    const url = page.url();
    if (url.includes('confirm.html')) {
      console.log('[V02] ★★ BUG: 不正なメールアドレスで確認画面に進めた ★★');
    }
  });
});

// ========================================
// V23: 禁則
// ========================================
test.describe('V23: 禁則 - 業務ルール上許されない操作', () => {

  test('過去日付を指定して送信 → 弾かれるか', async ({ page }) => {
    await page.goto(`${BASE}/reserve.html?plan-id=0`);
    await fillValidForm(page);

    // 昨日の日付
    await page.locator('#date').fill(pastDate(1));
    await page.getByRole('button', { name: '予約内容を確認する' }).click();

    const url = page.url();
    console.log(`[V23] 過去日付送信後URL: ${url}`);

    if (url.includes('confirm.html')) {
      console.log('[V23] ★★ BUG: 過去日付で予約が確認画面に進んだ ★★');
      // 確認画面で表示される日付も確認
      const bodyText = await page.locator('body').textContent();
      console.log(`[V23] 確認画面テキスト: ${bodyText?.substring(0, 500)}`);
    }
  });

  test('宿泊数に0を入力して送信 → 弾かれるか', async ({ page }) => {
    await page.goto(`${BASE}/reserve.html?plan-id=0`);
    await fillValidForm(page);

    // min=1 だが、JSで直接value変更を試す
    await page.locator('#term').fill('0');
    await page.getByRole('button', { name: '予約内容を確認する' }).click();

    const url = page.url();
    console.log(`[V23] 宿泊数0送信後URL: ${url}`);

    if (url.includes('confirm.html')) {
      console.log('[V23] ★★ BUG: 宿泊数0で予約が確認画面に進んだ ★★');
      const bodyText = await page.locator('body').textContent();
      console.log(`[V23] 確認画面テキスト: ${bodyText?.substring(0, 500)}`);
    }
  });

  test('人数に0を入力して送信 → 弾かれるか', async ({ page }) => {
    await page.goto(`${BASE}/reserve.html?plan-id=0`);
    await fillValidForm(page);

    await page.locator('#head-count').fill('0');
    await page.getByRole('button', { name: '予約内容を確認する' }).click();

    const url = page.url();
    console.log(`[V23] 人数0送信後URL: ${url}`);

    if (url.includes('confirm.html')) {
      console.log('[V23] ★★ BUG: 人数0で予約が確認画面に進んだ ★★');
      const bodyText = await page.locator('body').textContent();
      console.log(`[V23] 確認画面テキスト: ${bodyText?.substring(0, 500)}`);
    }
  });

  test('宿泊数に負数(-1)を入力して送信 → 弾かれるか', async ({ page }) => {
    await page.goto(`${BASE}/reserve.html?plan-id=0`);
    await fillValidForm(page);

    await page.locator('#term').fill('-1');
    await page.getByRole('button', { name: '予約内容を確認する' }).click();

    const url = page.url();
    console.log(`[V23] 宿泊数-1送信後URL: ${url}`);

    if (url.includes('confirm.html')) {
      console.log('[V23] ★★ BUG: 宿泊数-1で予約が確認画面に進んだ ★★');
    }
  });

  test('宿泊数に上限超過(10)を入力して送信 → 弾かれるか', async ({ page }) => {
    await page.goto(`${BASE}/reserve.html?plan-id=0`);
    await fillValidForm(page);

    // max=9なので10で試す
    await page.locator('#term').fill('10');
    await page.getByRole('button', { name: '予約内容を確認する' }).click();

    const url = page.url();
    console.log(`[V23] 宿泊数10送信後URL: ${url}`);

    if (url.includes('confirm.html')) {
      console.log('[V23] ★★ BUG: 宿泊数10(上限超過)で確認画面に進んだ ★★');
    }
  });

  test('人数に上限超過(10)を入力して送信 → 弾かれるか', async ({ page }) => {
    await page.goto(`${BASE}/reserve.html?plan-id=0`);
    await fillValidForm(page);

    await page.locator('#head-count').fill('10');
    await page.getByRole('button', { name: '予約内容を確認する' }).click();

    const url = page.url();
    console.log(`[V23] 人数10送信後URL: ${url}`);

    if (url.includes('confirm.html')) {
      console.log('[V23] ★★ BUG: 人数10(上限超過)で確認画面に進んだ ★★');
    }
  });

  test('不正な日付形式を入力して送信 → 弾かれるか', async ({ page }) => {
    await page.goto(`${BASE}/reserve.html?plan-id=0`);
    await fillValidForm(page);

    // 存在しない日付
    await page.locator('#date').fill('2026/02/30');
    await page.getByRole('button', { name: '予約内容を確認する' }).click();

    const url = page.url();
    console.log(`[V23] 不正日付(2/30)送信後URL: ${url}`);

    if (url.includes('confirm.html')) {
      console.log('[V23] ★★ BUG: 2月30日で予約が確認画面に進んだ ★★');
      const bodyText = await page.locator('body').textContent();
      console.log(`[V23] 確認画面テキスト: ${bodyText?.substring(0, 500)}`);
    }
  });

  test('連絡方法を「選択してください」のまま送信 → 弾かれるか', async ({ page }) => {
    await page.goto(`${BASE}/reserve.html?plan-id=0`);

    await page.locator('#date').fill(futureDate(2));
    await page.locator('#term').fill('1');
    await page.locator('#head-count').fill('1');
    const username = page.locator('#username');
    if (await username.isVisible()) {
      await username.fill('テスト太郎');
    }
    // contact を未選択のまま

    await page.getByRole('button', { name: '予約内容を確認する' }).click();

    const url = page.url();
    console.log(`[V23] 連絡方法未選択送信後URL: ${url}`);

    if (url.includes('confirm.html')) {
      console.log('[V23] ★★ BUG: 連絡方法未選択で確認画面に進めた ★★');
    }
  });
});
