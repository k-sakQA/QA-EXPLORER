import { test, expect, Page } from '@playwright/test';

/**
 * Session 6: 会員限定プラン横展開 + 日付境界値 + 連絡方法エッジケース
 *
 * ナレッジ根拠:
 * - 申し送り#2: plan-id=1,2,3 の会員限定プランが未検証
 * - 申し送り#3: 日付バリデーションの許可範囲が未特定
 * - H-20260424-01: サーバ側バリデーション不在 → 全プランで再現するか
 * - F-20260424-10: 連絡方法切替は正常 → しかし切替後に前の値が残る問題は未検証
 * - F-20260422-16: 電話番号11桁固定 → 10桁固定電話を弾く設計上の課題
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
// 会員限定プラン横展開 (plan-id=1,2,3)
// ========================================
test.describe('会員限定プラン横展開: バリデーション差異検証', () => {

  for (const planId of [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]) {
    test(`plan-id=${planId}: フォーム構造差異チェック`, async ({ page }) => {
      await page.goto(`${BASE}/reserve.html?plan-id=${planId}`);
      await page.waitForLoadState('networkidle');

      // フォーム要素の存在チェック
      const hasDate = await page.locator('#date').isVisible();
      const hasTerm = await page.locator('#term').isVisible();
      const hasHeadCount = await page.locator('#head-count').isVisible();
      const hasUsername = await page.locator('#username').isVisible();
      const hasContact = await page.locator('#contact').isVisible();

      // チェックボックスの存在チェック
      const hasBreakfast = await page.locator('#breakfast').count() > 0;
      const hasEarlyCheckin = await page.locator('#early-check-in').count() > 0;
      const hasSightseeing = await page.locator('#sightseeing').count() > 0;

      // 初期値
      const dateVal = await page.locator('#date').inputValue();
      const termVal = await page.locator('#term').inputValue();
      const headVal = await page.locator('#head-count').inputValue();
      const usernameVal = await page.locator('#username').inputValue();

      // term/head-countのmin/max
      const termMin = await page.locator('#term').getAttribute('min') || 'null';
      const termMax = await page.locator('#term').getAttribute('max') || 'null';
      const headMin = await page.locator('#head-count').getAttribute('min') || 'null';
      const headMax = await page.locator('#head-count').getAttribute('max') || 'null';

      // hidden values
      const planName = await page.locator('#plan-name-hidden').inputValue();
      const roomBill = await page.locator('#room-bill-hidden').inputValue();

      console.log(`[横展開] plan-id=${planId}: "${planName}" bill=${roomBill}`);
      console.log(`  form: date=${hasDate} term=${hasTerm}(${termMin}-${termMax}) head=${hasHeadCount}(${headMin}-${headMax})`);
      console.log(`  opts: breakfast=${hasBreakfast} earlyCheckin=${hasEarlyCheckin} sightseeing=${hasSightseeing}`);
      console.log(`  defaults: date="${dateVal}" term="${termVal}" head="${headVal}" username="${usernameVal}"`);

      // 全プランで必須フォーム要素が存在するか
      expect(hasDate).toBe(true);
      expect(hasTerm).toBe(true);
      expect(hasHeadCount).toBe(true);
    });
  }

  test('plan-id=0: JS改ざん(宿泊数0) 再現確認', async ({ page }) => {
    await page.goto(`${BASE}/reserve.html?plan-id=0`);
    await fillValidForm(page);
    await page.locator('#term').evaluate((el: HTMLInputElement) => {
      el.removeAttribute('min'); el.value = '0';
    });
    await page.locator('#term').dispatchEvent('change');
    await page.getByRole('button', { name: '予約内容を確認する' }).click();
    await page.waitForLoadState('networkidle');
    const passed = page.url().includes('confirm.html');
    console.log(`[横展開] plan-id=0 宿泊数0改ざん: ${passed ? '★通過★' : '弾かれた'}`);
    expect(passed).toBe(true); // 既知バグ再現確認
  });

  // 会員限定プランで同じ弱点があるか
  for (const planId of [1, 2, 3]) {
    test(`plan-id=${planId}: JS改ざん(宿泊数0) 横展開`, async ({ page }) => {
      await page.goto(`${BASE}/reserve.html?plan-id=${planId}`);
      await fillValidForm(page);
      await page.locator('#term').evaluate((el: HTMLInputElement) => {
        el.removeAttribute('min'); el.value = '0';
      });
      await page.locator('#term').dispatchEvent('change');
      await page.getByRole('button', { name: '予約内容を確認する' }).click();
      await page.waitForLoadState('networkidle');
      const passed = page.url().includes('confirm.html');
      console.log(`[横展開] plan-id=${planId} 宿泊数0改ざん: ${passed ? '★通過★' : '弾かれた'}`);
    });
  }

  for (const planId of [1, 2, 3]) {
    test(`plan-id=${planId}: 全角スペース氏名 横展開`, async ({ page }) => {
      await page.goto(`${BASE}/reserve.html?plan-id=${planId}`);
      await fillValidForm(page);
      await page.locator('#username').fill('\u3000\u3000');
      await page.getByRole('button', { name: '予約内容を確認する' }).click();
      await page.waitForLoadState('networkidle');
      const passed = page.url().includes('confirm.html');
      console.log(`[横展開] plan-id=${planId} 全角スペース氏名: ${passed ? '★通過★' : '弾かれた'}`);
    });
  }

  for (const planId of [1, 2, 3]) {
    test(`plan-id=${planId}: hidden料金改ざん 横展開`, async ({ page }) => {
      await page.goto(`${BASE}/reserve.html?plan-id=${planId}`);
      await fillValidForm(page);

      const originalBill = await page.locator('#room-bill-hidden').inputValue();
      await page.locator('#room-bill-hidden').evaluate(
        (el: HTMLInputElement) => { el.value = '0'; }
      );
      await page.getByRole('button', { name: '予約内容を確認する' }).click();
      await page.waitForLoadState('networkidle');

      if (page.url().includes('confirm.html')) {
        const bodyText = await page.locator('body').textContent() || '';
        const priceMatch = bodyText.match(/合計\s*([\d,]+)円/);
        console.log(`[横展開] plan-id=${planId} 料金改ざん: 元=${originalBill} → 確認画面=${priceMatch?.[1]}円`);
      }
    });
  }
});

// ========================================
// 日付バリデーション境界値特定
// ========================================
test.describe('日付バリデーション: 予約可能範囲の境界値特定', () => {

  test('明日の日付 → 予約可能か', async ({ page }) => {
    await page.goto(`${BASE}/reserve.html?plan-id=0`);
    await fillValidForm(page);
    await page.locator('#date').fill(futureDate(1));
    await page.getByRole('button', { name: '予約内容を確認する' }).click();
    await page.waitForLoadState('networkidle');
    const passed = page.url().includes('confirm.html');
    console.log(`[日付] 明日(+1日): ${passed ? '予約可能' : '弾かれた'}`);
  });

  // 二分探索で上限を特定: 90日, 180日, 365日, 500日
  const dateTests = [
    { days: 3, label: '3日後' },
    { days: 7, label: '1週間後' },
    { days: 30, label: '1ヶ月後' },
    { days: 60, label: '2ヶ月後' },
    { days: 90, label: '3ヶ月後' },
    { days: 180, label: '半年後' },
    { days: 270, label: '9ヶ月後' },
    { days: 365, label: '1年後' },
    { days: 500, label: '500日後' },
  ];

  for (const { days, label } of dateTests) {
    test(`${label}(+${days}日) → 予約可能か`, async ({ page }) => {
      await page.goto(`${BASE}/reserve.html?plan-id=0`);
      await fillValidForm(page);
      await page.locator('#date').fill(futureDate(days));
      await page.getByRole('button', { name: '予約内容を確認する' }).click();
      await page.waitForLoadState('networkidle');
      const passed = page.url().includes('confirm.html');
      console.log(`[日付] ${label}(+${days}日): ${passed ? '予約可能' : '弾かれた'}`);
    });
  }
});

// ========================================
// 連絡方法切替のエッジケース
// ========================================
test.describe('連絡方法切替: バリデーションエッジケース', () => {

  test('メール入力後→電話に切替→送信: 前のメール値が残っていてもOKか', async ({ page }) => {
    await page.goto(`${BASE}/reserve.html?plan-id=0`);
    await fillValidForm(page);

    // まずメールを選んで入力
    await page.locator('#contact').selectOption('email');
    await page.locator('#email').fill('test@example.com');

    // 電話に切替（メール欄は非表示に）
    await page.locator('#contact').selectOption('tel');
    await page.locator('#tel').fill('09012345678');

    // 送信
    await page.getByRole('button', { name: '予約内容を確認する' }).click();
    await page.waitForLoadState('networkidle');

    if (page.url().includes('confirm.html')) {
      const bodyText = await page.locator('body').textContent() || '';
      const hasEmail = bodyText.includes('test@example.com');
      const hasTel = bodyText.includes('09012345678');
      console.log(`[連絡] メール→電話切替: email残存=${hasEmail}, tel表示=${hasTel}`);
      // 確認画面にメールアドレスが残って表示されていたらバグ
      if (hasEmail && hasTel) {
        console.log('[連絡] ★★ BUG: 非表示にしたメールアドレスも確認画面に表示される ★★');
      }
    }
  });

  test('電話入力後→メールに切替→メール未入力で送信', async ({ page }) => {
    await page.goto(`${BASE}/reserve.html?plan-id=0`);
    await fillValidForm(page);

    // まず電話を選んで入力
    await page.locator('#contact').selectOption('tel');
    await page.locator('#tel').fill('09012345678');

    // メールに切替
    await page.locator('#contact').selectOption('email');
    // メール欄を空のままにして送信
    await page.locator('#email').fill('');

    await page.getByRole('button', { name: '予約内容を確認する' }).click();
    const url = page.url();
    console.log(`[連絡] 電話→メール切替→メール空: ${url.includes('confirm.html') ? '★通過★' : '弾かれた'}`);
  });

  test('「希望しない」→メール選択→「希望しない」に戻す→送信: バリデーション状態は?', async ({ page }) => {
    await page.goto(`${BASE}/reserve.html?plan-id=0`);
    await fillValidForm(page);

    // 切替を往復
    await page.locator('#contact').selectOption('email');
    await page.locator('#email').fill('test@example.com');
    await page.locator('#contact').selectOption('no');  // 希望しないに戻す

    // メール欄は非表示、値は残っているか?
    const emailVisible = await page.locator('#email').isVisible();
    const emailValue = await page.locator('#email').evaluate(
      (el: HTMLInputElement) => el.value
    );
    console.log(`[連絡] 希望しないに戻す: email visible=${emailVisible}, value="${emailValue}"`);

    // 送信
    await page.getByRole('button', { name: '予約内容を確認する' }).click();
    await page.waitForLoadState('networkidle');
    const url = page.url();
    console.log(`[連絡] 希望しないで送信: ${url.includes('confirm.html') ? '予約OK' : '弾かれた'}`);

    if (url.includes('confirm.html')) {
      const bodyText = await page.locator('body').textContent() || '';
      if (bodyText.includes('test@example.com')) {
        console.log('[連絡] ★★ BUG: 「希望しない」選択なのにメールが確認画面に表示 ★★');
      }
    }
  });

  test('電話番号10桁(固定電話)は弾かれるか (F-20260422-16 追検証)', async ({ page }) => {
    await page.goto(`${BASE}/reserve.html?plan-id=0`);
    await fillValidForm(page);

    await page.locator('#contact').selectOption('tel');
    await page.locator('#tel').fill('0312345678'); // 10桁固定電話

    await page.getByRole('button', { name: '予約内容を確認する' }).click();
    const url = page.url();
    console.log(`[連絡] 10桁固定電話: ${url.includes('confirm.html') ? '予約OK' : '弾かれた'}`);
  });

  test('電話番号にハイフン付き(03-1234-5678)は弾かれるか', async ({ page }) => {
    await page.goto(`${BASE}/reserve.html?plan-id=0`);
    await fillValidForm(page);

    await page.locator('#contact').selectOption('tel');
    await page.locator('#tel').fill('03-1234-5678');

    await page.getByRole('button', { name: '予約内容を確認する' }).click();
    const url = page.url();
    console.log(`[連絡] ハイフン付き電話: ${url.includes('confirm.html') ? '予約OK' : '弾かれた'}`);
  });

  test('電話番号12桁以上は弾かれるか', async ({ page }) => {
    await page.goto(`${BASE}/reserve.html?plan-id=0`);
    await fillValidForm(page);

    await page.locator('#contact').selectOption('tel');
    await page.locator('#tel').fill('090123456789'); // 12桁

    await page.getByRole('button', { name: '予約内容を確認する' }).click();
    const url = page.url();
    console.log(`[連絡] 12桁電話: ${url.includes('confirm.html') ? '★通過★' : '弾かれた'}`);
  });
});
