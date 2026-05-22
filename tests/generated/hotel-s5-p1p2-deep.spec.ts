import { test, expect, Page } from '@playwright/test';

/**
 * Session 5: P1 観点テスト + P2 バリデーション深掘り
 * V03: 文字種（XSS・サニタイズ・サロゲートペア）
 * V07: 数値(正常値) — 境界値
 * V08: 数値(異常値) — JS操作でmin/max回避
 * V09: 未入力 — 全角スペース・空白文字
 * V12: 経時変化 — 二重送信
 * V23追加: 日付バリデーション境界値
 *
 * 欠陥仮定:
 * - V03: XSS文字がサニタイズされずに確認画面に表示される
 * - V07: number型の min=1/max=9 をJSで回避して0や100が通る
 * - V09: 全角スペースのみの氏名で予約が通る
 * - V12: 確認ボタン連打で確認画面に二重遷移
 */

const BASE = 'https://hotel-example-site.takeyaqa.dev/ja';

function futureDate(daysAhead: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
}

async function fillValidForm(page: Page) {
  await page.locator('#date').fill(futureDate(2));
  await page.keyboard.press('Escape');
  await page.locator('#term').fill('1');
  await page.locator('#head-count').fill('1');
  const username = page.locator('#username');
  if (await username.isVisible()) {
    await username.fill('テスト太郎');
  }
  await page.locator('#contact').selectOption('no');
}

// ========================================
// V03: 文字種
// ========================================
test.describe('V03: 文字種 - 特殊文字・XSS', () => {

  test('氏名にXSSペイロードを入力 → 確認画面でサニタイズされているか', async ({ page }) => {
    await page.goto(`${BASE}/reserve.html?plan-id=0`);
    await fillValidForm(page);

    const xssPayload = '<script>alert("XSS")</script>';
    await page.locator('#username').fill(xssPayload);

    await page.getByRole('button', { name: '予約内容を確認する' }).click();
    await page.waitForLoadState('networkidle');

    if (page.url().includes('confirm.html')) {
      // 確認画面でスクリプトタグがそのまま表示されていないか
      const bodyHtml = await page.locator('body').innerHTML();
      const hasRawScript = bodyHtml.includes('<script>');
      console.log(`[V03] XSS確認: bodyにscriptタグ = ${hasRawScript}`);

      if (hasRawScript) {
        console.log('[V03] ★★ CRITICAL BUG: XSSペイロードが未サニタイズで表示 ★★');
      }

      // テキスト表示上は文字列として見えるべき
      const bodyText = await page.locator('body').textContent();
      console.log(`[V03] 確認画面に表示: ${bodyText?.includes(xssPayload)}`);
    }
  });

  test('氏名にHTML注入を試行 → エスケープされているか', async ({ page }) => {
    await page.goto(`${BASE}/reserve.html?plan-id=0`);
    await fillValidForm(page);

    const htmlPayload = '<img src=x onerror="alert(1)">';
    await page.locator('#username').fill(htmlPayload);

    await page.getByRole('button', { name: '予約内容を確認する' }).click();
    await page.waitForLoadState('networkidle');

    if (page.url().includes('confirm.html')) {
      const bodyHtml = await page.locator('body').innerHTML();
      const hasRawImg = bodyHtml.includes('<img src=x');
      console.log(`[V03] HTML注入確認: bodyにimgタグ = ${hasRawImg}`);

      if (hasRawImg) {
        console.log('[V03] ★★ CRITICAL BUG: HTML注入が未エスケープ ★★');
      }
    }
  });

  test('コメント欄にSQLインジェクションパターン → 確認画面で安全か', async ({ page }) => {
    await page.goto(`${BASE}/reserve.html?plan-id=0`);
    await fillValidForm(page);

    const sqlPayload = "'; DROP TABLE reservations; --";
    await page.locator('#comment').fill(sqlPayload);

    await page.getByRole('button', { name: '予約内容を確認する' }).click();
    await page.waitForLoadState('networkidle');

    if (page.url().includes('confirm.html')) {
      const bodyText = await page.locator('body').textContent();
      // SQLインジェクションが確認画面でそのまま表示されるのは問題ではないが、
      // エラーが発生していないかを確認
      console.log(`[V03] SQL注入テキスト確認: ${bodyText?.includes(sqlPayload)}`);
      // ページがクラッシュしていないこと
      expect(page.url()).toContain('confirm.html');
    }
  });

  test('氏名にサロゲートペア(絵文字)を入力 → 正常に処理されるか', async ({ page }) => {
    await page.goto(`${BASE}/reserve.html?plan-id=0`);
    await fillValidForm(page);

    await page.locator('#username').fill('テスト🍣太郎');

    await page.getByRole('button', { name: '予約内容を確認する' }).click();
    await page.waitForLoadState('networkidle');

    if (page.url().includes('confirm.html')) {
      const bodyText = await page.locator('body').textContent();
      const hasSushi = bodyText?.includes('🍣');
      console.log(`[V03] 絵文字保持: ${hasSushi}`);

      if (!hasSushi) {
        console.log('[V03] ★★ BUG: サロゲートペア文字が消失または文字化け ★★');
      }
    } else {
      console.log('[V03] ★★ BUG: 絵文字含む氏名で確認画面に遷移できない ★★');
    }
  });

  test('氏名に制御文字(タブ・改行)を入力 → 処理されるか', async ({ page }) => {
    await page.goto(`${BASE}/reserve.html?plan-id=0`);
    await fillValidForm(page);

    // タブと改行を含む名前
    await page.locator('#username').evaluate(
      (el: HTMLInputElement) => { el.value = 'テスト\t太郎\n花子'; }
    );
    // Changeイベント発火
    await page.locator('#username').dispatchEvent('change');

    await page.getByRole('button', { name: '予約内容を確認する' }).click();
    await page.waitForLoadState('networkidle');

    const url = page.url();
    console.log(`[V03] 制御文字入力後URL: ${url}`);
    if (url.includes('confirm.html')) {
      console.log('[V03] 制御文字含む氏名で予約が進んだ（意図的かどうか要確認）');
    }
  });
});

// ========================================
// V07: 数値(正常値) — 境界値
// ========================================
test.describe('V07: 数値(正常値) - 境界値確認', () => {

  test('宿泊数の下限(1)と上限(9)で予約が通るか', async ({ page }) => {
    // 下限: 1
    await page.goto(`${BASE}/reserve.html?plan-id=0`);
    await fillValidForm(page);
    await page.locator('#term').fill('1');
    await page.getByRole('button', { name: '予約内容を確認する' }).click();
    await page.waitForLoadState('networkidle');
    const url1 = page.url();
    console.log(`[V07] 宿泊数1: ${url1.includes('confirm.html') ? 'OK' : 'NG'}`);
    expect(url1).toContain('confirm.html');

    // 上限: 9
    await page.goto(`${BASE}/reserve.html?plan-id=0`);
    await fillValidForm(page);
    await page.locator('#term').fill('9');
    await page.getByRole('button', { name: '予約内容を確認する' }).click();
    await page.waitForLoadState('networkidle');
    const url9 = page.url();
    console.log(`[V07] 宿泊数9: ${url9.includes('confirm.html') ? 'OK' : 'NG'}`);
    expect(url9).toContain('confirm.html');
  });

  test('人数の下限(1)と上限(9)で予約が通るか', async ({ page }) => {
    // 下限: 1
    await page.goto(`${BASE}/reserve.html?plan-id=0`);
    await fillValidForm(page);
    await page.locator('#head-count').fill('1');
    await page.getByRole('button', { name: '予約内容を確認する' }).click();
    await page.waitForLoadState('networkidle');
    expect(page.url()).toContain('confirm.html');

    // 上限: 9
    await page.goto(`${BASE}/reserve.html?plan-id=0`);
    await fillValidForm(page);
    await page.locator('#head-count').fill('9');
    await page.getByRole('button', { name: '予約内容を確認する' }).click();
    await page.waitForLoadState('networkidle');
    expect(page.url()).toContain('confirm.html');
    console.log('[V07] 人数 1-9 全てOK');
  });

  test('宿泊数と人数の合計金額が正しく計算されるか', async ({ page }) => {
    await page.goto(`${BASE}/reserve.html?plan-id=0`);
    await fillValidForm(page);

    // 3泊2名
    await page.locator('#term').fill('3');
    await page.locator('#head-count').fill('2');

    await page.getByRole('button', { name: '予約内容を確認する' }).click();
    await page.waitForLoadState('networkidle');

    if (page.url().includes('confirm.html')) {
      // 料金テキストを取得
      const bodyText = await page.locator('body').textContent() || '';
      // 金額パターンを抽出
      const priceMatch = bodyText.match(/合計\s*([\d,]+)円/);
      console.log(`[V07] 3泊2名 金額: ${priceMatch ? priceMatch[1] : '取得失敗'}`);
      // 基本料金 7000円/泊 × 3泊 × 2名 = 42000円 (予想、実際の計算式は異なる可能性)
      // ここでは金額が表示されることだけ確認
      expect(priceMatch).toBeTruthy();
    }
  });
});

// ========================================
// V08: 数値(異常値) — JS操作でmin/max回避
// ========================================
test.describe('V08: 数値(異常値) - JS操作でバリデーション回避', () => {

  test('JSで宿泊数を0にして送信 → サーバ側で弾かれるか', async ({ page }) => {
    await page.goto(`${BASE}/reserve.html?plan-id=0`);
    await fillValidForm(page);

    // HTML5のmin属性をJSで除去してから値を設定
    await page.locator('#term').evaluate((el: HTMLInputElement) => {
      el.removeAttribute('min');
      el.removeAttribute('max');
      el.value = '0';
    });
    await page.locator('#term').dispatchEvent('change');

    await page.getByRole('button', { name: '予約内容を確認する' }).click();
    await page.waitForLoadState('networkidle');

    const url = page.url();
    console.log(`[V08] JS操作で宿泊数0: ${url}`);

    if (url.includes('confirm.html')) {
      const bodyText = await page.locator('body').textContent() || '';
      const priceMatch = bodyText.match(/合計\s*([\d,]+)円/);
      console.log(`[V08] ★★ BUG: JSでmin除去→宿泊数0で確認画面到達 金額=${priceMatch?.[1]} ★★`);
    }
  });

  test('JSで人数を0にして送信 → サーバ側で弾かれるか', async ({ page }) => {
    await page.goto(`${BASE}/reserve.html?plan-id=0`);
    await fillValidForm(page);

    await page.locator('#head-count').evaluate((el: HTMLInputElement) => {
      el.removeAttribute('min');
      el.removeAttribute('max');
      el.value = '0';
    });
    await page.locator('#head-count').dispatchEvent('change');

    await page.getByRole('button', { name: '予約内容を確認する' }).click();
    await page.waitForLoadState('networkidle');

    const url = page.url();
    console.log(`[V08] JS操作で人数0: ${url}`);

    if (url.includes('confirm.html')) {
      const bodyText = await page.locator('body').textContent() || '';
      const priceMatch = bodyText.match(/合計\s*([\d,]+)円/);
      console.log(`[V08] ★★ BUG: JSでmin除去→人数0で確認画面到達 金額=${priceMatch?.[1]} ★★`);
    }
  });

  test('JSで宿泊数を100にして送信 → 弾かれるか', async ({ page }) => {
    await page.goto(`${BASE}/reserve.html?plan-id=0`);
    await fillValidForm(page);

    await page.locator('#term').evaluate((el: HTMLInputElement) => {
      el.removeAttribute('max');
      el.value = '100';
    });
    await page.locator('#term').dispatchEvent('change');

    await page.getByRole('button', { name: '予約内容を確認する' }).click();
    await page.waitForLoadState('networkidle');

    const url = page.url();
    console.log(`[V08] JS操作で宿泊数100: ${url}`);

    if (url.includes('confirm.html')) {
      const bodyText = await page.locator('body').textContent() || '';
      console.log(`[V08] ★★ BUG: 宿泊数100で確認画面到達 ★★`);
      console.log(`[V08] 確認画面本文: ${bodyText.substring(0, 300)}`);
    }
  });

  test('JSで料金hidden値を改ざんして送信 → 反映されるか', async ({ page }) => {
    await page.goto(`${BASE}/reserve.html?plan-id=0`);
    await fillValidForm(page);

    // hidden の room-bill を改ざん
    const originalBill = await page.locator('#room-bill-hidden').inputValue();
    await page.locator('#room-bill-hidden').evaluate(
      (el: HTMLInputElement) => { el.value = '0'; }
    );

    await page.getByRole('button', { name: '予約内容を確認する' }).click();
    await page.waitForLoadState('networkidle');

    if (page.url().includes('confirm.html')) {
      const bodyText = await page.locator('body').textContent() || '';
      const priceMatch = bodyText.match(/合計\s*([\d,]+)円/);
      console.log(`[V08] 元料金: ${originalBill}, 改ざん後確認画面金額: ${priceMatch?.[1]}`);

      if (priceMatch && priceMatch[1] === '0') {
        console.log('[V08] ★★ CRITICAL BUG: hidden料金の改ざんが確認画面に反映される ★★');
      }
    }
  });

  test('数値フィールドに小数点を入力 → 弾かれるか', async ({ page }) => {
    await page.goto(`${BASE}/reserve.html?plan-id=0`);
    await fillValidForm(page);

    await page.locator('#term').fill('1.5');
    await page.getByRole('button', { name: '予約内容を確認する' }).click();

    const url = page.url();
    console.log(`[V08] 宿泊数1.5: ${url}`);
    // number type with integer step should reject 1.5
  });
});

// ========================================
// V09: 未入力 — 全角スペース・空白文字
// ========================================
test.describe('V09: 未入力 - 空白文字パターン', () => {

  test('氏名に全角スペースのみ → 予約が通るか', async ({ page }) => {
    await page.goto(`${BASE}/reserve.html?plan-id=0`);
    await fillValidForm(page);

    // 全角スペースのみ
    await page.locator('#username').fill('\u3000\u3000\u3000');

    await page.getByRole('button', { name: '予約内容を確認する' }).click();
    await page.waitForLoadState('networkidle');

    const url = page.url();
    console.log(`[V09] 全角スペースのみ: ${url}`);

    if (url.includes('confirm.html')) {
      console.log('[V09] ★★ BUG: 全角スペースのみの氏名で予約が確認画面に進んだ ★★');
      const bodyText = await page.locator('body').textContent() || '';
      console.log(`[V09] 確認画面の氏名表示: "${bodyText.match(/お名前\s*(.+?)様/)?.[1]}"`);
    }
  });

  test('氏名に半角スペースのみ → 予約が通るか', async ({ page }) => {
    await page.goto(`${BASE}/reserve.html?plan-id=0`);
    await fillValidForm(page);

    await page.locator('#username').fill('   ');

    await page.getByRole('button', { name: '予約内容を確認する' }).click();
    await page.waitForLoadState('networkidle');

    const url = page.url();
    console.log(`[V09] 半角スペースのみ: ${url}`);

    if (url.includes('confirm.html')) {
      console.log('[V09] ★★ BUG: 半角スペースのみの氏名で予約が確認画面に進んだ ★★');
    }
  });

  test('メール選択 → メールに全角スペース → 弾かれるか', async ({ page }) => {
    await page.goto(`${BASE}/reserve.html?plan-id=0`);
    await fillValidForm(page);

    await page.locator('#contact').selectOption('email');
    await page.locator('#email').fill('\u3000');

    await page.getByRole('button', { name: '予約内容を確認する' }).click();

    const url = page.url();
    console.log(`[V09] メール全角スペース: ${url}`);
  });

  test('電話選択 → 電話に全角数字 → 弾かれるか', async ({ page }) => {
    await page.goto(`${BASE}/reserve.html?plan-id=0`);
    await fillValidForm(page);

    await page.locator('#contact').selectOption('tel');
    await page.locator('#tel').fill('０９０１２３４５６７８');

    await page.getByRole('button', { name: '予約内容を確認する' }).click();
    await page.waitForLoadState('networkidle');

    const url = page.url();
    console.log(`[V09] 電話全角数字: ${url}`);

    if (url.includes('confirm.html')) {
      console.log('[V09] ★★ BUG: 全角数字の電話番号で予約が確認画面に進んだ ★★');
    }
  });
});

// ========================================
// V12: 経時変化 — 二重送信
// ========================================
test.describe('V12: 経時変化 - 二重送信', () => {

  test('確認ボタンをダブルクリック → 二重遷移しないか', async ({ page }) => {
    await page.goto(`${BASE}/reserve.html?plan-id=0`);
    await fillValidForm(page);

    const btn = page.getByRole('button', { name: '予約内容を確認する' });

    // ダブルクリック
    await btn.dblclick();
    await page.waitForLoadState('networkidle');

    console.log(`[V12] ダブルクリック後URL: ${page.url()}`);

    // 確認画面であること（エラー画面でないこと）
    if (page.url().includes('confirm.html')) {
      console.log('[V12] ダブルクリックで正常に確認画面到達');
    }
  });

  test('確認画面の「予約する」ボタンをダブルクリック → 二重予約しないか', async ({ page }) => {
    await page.goto(`${BASE}/reserve.html?plan-id=0`);
    await fillValidForm(page);

    await page.getByRole('button', { name: '予約内容を確認する' }).click();
    await page.waitForLoadState('networkidle');

    const reserveBtn = page.getByRole('button', { name: 'この内容で予約する' });

    // ボタンが無効化されるか観察
    await reserveBtn.dblclick();

    // モーダルが1つだけ表示されるか
    await page.waitForTimeout(500);
    const modals = page.locator('.modal.show, .modal[style*="display: block"]');
    const modalCount = await modals.count();
    console.log(`[V12] ダブルクリック後のモーダル数: ${modalCount}`);

    if (modalCount > 1) {
      console.log('[V12] ★★ BUG: 予約ボタンダブルクリックで複数モーダル ★★');
    }

    // ボタンが無効化されているか
    const isDisabled = await reserveBtn.isDisabled().catch(() => false);
    console.log(`[V12] 予約ボタン無効化: ${isDisabled}`);

    if (!isDisabled) {
      console.log('[V12] 気づき: 予約ボタンはクリック後に無効化されない');
    }
  });

  test('確認ボタンの送信中無効化チェック', async ({ page }) => {
    await page.goto(`${BASE}/reserve.html?plan-id=0`);
    await fillValidForm(page);

    const btn = page.getByRole('button', { name: '予約内容を確認する' });

    // クリック直後のボタン状態を素早くチェック
    const btnDisabledAfterClick = await Promise.race([
      btn.click().then(async () => {
        return await btn.isDisabled().catch(() => false);
      }),
      new Promise<boolean>(resolve => setTimeout(() => resolve(false), 100))
    ]);

    console.log(`[V12] 確認ボタン送信直後の無効化: ${btnDisabledAfterClick}`);
  });
});

// ========================================
// V23追加: 日付バリデーション境界値
// ========================================
test.describe('V23追加: 日付バリデーション境界値', () => {

  test('今日の日付で予約 → 当日予約は可能か', async ({ page }) => {
    await page.goto(`${BASE}/reserve.html?plan-id=0`);
    await fillValidForm(page);

    const today = new Date();
    const todayStr = `${today.getFullYear()}/${String(today.getMonth() + 1).padStart(2, '0')}/${String(today.getDate()).padStart(2, '0')}`;
    await page.locator('#date').fill(todayStr);

    await page.getByRole('button', { name: '予約内容を確認する' }).click();
    await page.waitForLoadState('networkidle');

    const url = page.url();
    console.log(`[V23] 当日予約: ${url}`);
    // 当日予約の可否はビジネスルール次第
  });

  test('1年後の日付で予約 → 遠い未来の予約は可能か', async ({ page }) => {
    await page.goto(`${BASE}/reserve.html?plan-id=0`);
    await fillValidForm(page);

    await page.locator('#date').fill(futureDate(365));

    await page.getByRole('button', { name: '予約内容を確認する' }).click();
    await page.waitForLoadState('networkidle');

    const url = page.url();
    console.log(`[V23] 1年後予約: ${url}`);
  });

  test('無効な日付文字列を入力 → 弾かれるか', async ({ page }) => {
    await page.goto(`${BASE}/reserve.html?plan-id=0`);
    await fillValidForm(page);

    // 無効な日付パターン
    const invalidDates = ['abc', '99/99/99', '2026-04-30', ''];
    for (const dateVal of invalidDates) {
      await page.locator('#date').fill(dateVal);
      await page.getByRole('button', { name: '予約内容を確認する' }).click();

      const url = page.url();
      console.log(`[V23] 不正日付 "${dateVal}": ${url.includes('confirm.html') ? '★★通過★★' : '弾かれた'}`);

      if (url.includes('confirm.html')) {
        await page.goBack();
        await page.waitForLoadState('networkidle');
      }
    }
  });
});
