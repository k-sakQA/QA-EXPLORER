import { test, expect } from '@playwright/test';

const BASE = 'https://hotel-example-site.takeyaqa.dev/ja';

/**
 * Session #4 — 予約フォームバリデーション深掘り
 *
 * 狙うバグ / 欠陥仮定:
 *   V02: エラー表示の一貫性・ローカライズ
 *   V08: 数値異常値（max超過、0、負数）がプランごとの制約で正しく弾かれるか
 *   V09: 未入力・全角スペースの横展開（email/tel）
 *   V23: 禁則（過去日付、連絡方法切り替えの抜け穴）
 *   H-02再確認: min/max属性が追加されたか(以前はnull)
 */

// ── ヘルパー ──
async function fillMinimalForm(page: import('@playwright/test').Page, overrides: Record<string, string> = {}) {
  // 明日の日付をセット
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dateStr = `${tomorrow.getFullYear()}/${String(tomorrow.getMonth() + 1).padStart(2, '0')}/${String(tomorrow.getDate()).padStart(2, '0')}`;

  await page.locator('#date').fill(overrides.date ?? dateStr);
  // datepicker を閉じる
  await page.locator('#date').press('Escape');

  if (overrides.term !== undefined) {
    await page.locator('#term').fill(overrides.term);
  }
  if (overrides.headCount !== undefined) {
    await page.locator('#head-count').fill(overrides.headCount);
  }
  await page.locator('#username').fill(overrides.username ?? 'テスト太郎');

  if (overrides.contact !== undefined) {
    await page.locator('#contact').selectOption(overrides.contact);
  } else {
    await page.locator('#contact').selectOption('no');
  }

  if (overrides.email !== undefined) {
    await page.locator('#email').fill(overrides.email);
  }
  if (overrides.tel !== undefined) {
    await page.locator('#tel').fill(overrides.tel);
  }
}

async function clickSubmit(page: import('@playwright/test').Page) {
  await page.getByRole('button', { name: /予約|確認|submit/i }).click();
}

// ── テスト ──
test.describe('S4: 予約フォームバリデーション深掘り', () => {

  // ==============================
  // 1. H-02 再確認: min/max修正の検証
  // ==============================
  test.describe('H-02再確認: 宿泊数/人数のmin/max', () => {

    test('plan-0: 宿泊数=0 で送信 → 弾かれるか', async ({ page }) => {
      await page.goto(`${BASE}/reserve.html?plan-id=0`);
      await page.waitForLoadState('networkidle');

      await fillMinimalForm(page, { term: '0' });
      await clickSubmit(page);

      // 確認画面に遷移していないことを確認
      const url = page.url();
      console.log('After submit URL:', url);
      const hasConfirm = url.includes('confirm') || await page.locator('text=予約内容の確認').count() > 0;
      console.log('Reached confirm?', hasConfirm);

      // バリデーションメッセージの確認
      const validityMessage = await page.locator('#term').evaluate(
        (el: HTMLInputElement) => el.validationMessage
      );
      console.log('term validationMessage:', validityMessage);

      expect(hasConfirm).toBe(false);
    });

    test('plan-0: 人数=0 で送信 → 弾かれるか', async ({ page }) => {
      await page.goto(`${BASE}/reserve.html?plan-id=0`);
      await page.waitForLoadState('networkidle');

      await fillMinimalForm(page, { headCount: '0' });
      await clickSubmit(page);

      const url = page.url();
      console.log('After submit URL:', url);
      const hasConfirm = url.includes('confirm') || await page.locator('text=予約内容の確認').count() > 0;
      console.log('Reached confirm?', hasConfirm);

      const validityMessage = await page.locator('#head-count').evaluate(
        (el: HTMLInputElement) => el.validationMessage
      );
      console.log('head-count validationMessage:', validityMessage);

      expect(hasConfirm).toBe(false);
    });

    test('plan-1(会員限定): 人数=1 で送信 → min=2なので弾かれるべき', async ({ page }) => {
      await page.goto(`${BASE}/reserve.html?plan-id=1`);
      await page.waitForLoadState('networkidle');

      await fillMinimalForm(page, { headCount: '1' });
      await clickSubmit(page);

      const url = page.url();
      console.log('After submit URL:', url);
      const hasConfirm = url.includes('confirm') || await page.locator('text=予約内容の確認').count() > 0;
      console.log('Reached confirm?', hasConfirm);

      const validityMessage = await page.locator('#head-count').evaluate(
        (el: HTMLInputElement) => el.validationMessage
      );
      console.log('head-count validationMessage:', validityMessage);

      // min=2 なので1名は弾かれるべき
      expect(hasConfirm).toBe(false);
    });

    test('plan-7: 宿泊数=max超過(4) → max=3なので弾かれるべき', async ({ page }) => {
      await page.goto(`${BASE}/reserve.html?plan-id=7`);
      await page.waitForLoadState('networkidle');

      await fillMinimalForm(page, { term: '4' });
      await clickSubmit(page);

      const url = page.url();
      console.log('After submit URL:', url);
      const hasConfirm = url.includes('confirm') || await page.locator('text=予約内容の確認').count() > 0;
      console.log('Reached confirm?', hasConfirm);

      const validityMessage = await page.locator('#term').evaluate(
        (el: HTMLInputElement) => el.validationMessage
      );
      console.log('term validationMessage:', validityMessage);

      expect(hasConfirm).toBe(false);
    });

    test('plan-7: 人数=max超過(7) → max=6なので弾かれるべき', async ({ page }) => {
      await page.goto(`${BASE}/reserve.html?plan-id=7`);
      await page.waitForLoadState('networkidle');

      await fillMinimalForm(page, { headCount: '7' });
      await clickSubmit(page);

      const url = page.url();
      console.log('After submit URL:', url);
      const hasConfirm = url.includes('confirm') || await page.locator('text=予約内容の確認').count() > 0;
      console.log('Reached confirm?', hasConfirm);

      expect(hasConfirm).toBe(false);
    });
  });

  // ==============================
  // 2. 連絡方法切り替えのバリデーション境界
  // ==============================
  test.describe('連絡方法(contact)切り替えバリデーション', () => {

    test('「選択してください」(空値)のまま送信 → 弾かれるか', async ({ page }) => {
      await page.goto(`${BASE}/reserve.html?plan-id=0`);
      await page.waitForLoadState('networkidle');

      await fillMinimalForm(page, { contact: '' }); // 空値="選択してください"
      await clickSubmit(page);

      const url = page.url();
      console.log('After submit URL:', url);
      const hasConfirm = url.includes('confirm') || await page.locator('text=予約内容の確認').count() > 0;
      console.log('Reached confirm with empty contact?', hasConfirm);

      // required のある select で空値は弾かれるべき
      expect(hasConfirm).toBe(false);
    });

    test('メール選択 → メール未入力で送信 → 弾かれるか', async ({ page }) => {
      await page.goto(`${BASE}/reserve.html?plan-id=0`);
      await page.waitForLoadState('networkidle');

      await fillMinimalForm(page, { contact: 'email' });
      // email は空のまま送信
      await clickSubmit(page);

      const url = page.url();
      console.log('After submit URL:', url);
      const hasConfirm = url.includes('confirm') || await page.locator('text=予約内容の確認').count() > 0;
      console.log('Reached confirm without email?', hasConfirm);

      const emailDisabled = await page.locator('#email').isDisabled();
      const emailRequired = await page.locator('#email').getAttribute('required');
      console.log('email disabled:', emailDisabled, 'required:', emailRequired);

      expect(hasConfirm).toBe(false);
    });

    test('電話選択 → 電話未入力で送信 → 弾かれるか', async ({ page }) => {
      await page.goto(`${BASE}/reserve.html?plan-id=0`);
      await page.waitForLoadState('networkidle');

      await fillMinimalForm(page, { contact: 'tel' });
      // tel は空のまま送信
      await clickSubmit(page);

      const url = page.url();
      console.log('After submit URL:', url);
      const hasConfirm = url.includes('confirm') || await page.locator('text=予約内容の確認').count() > 0;
      console.log('Reached confirm without tel?', hasConfirm);

      expect(hasConfirm).toBe(false);
    });

    test('メール入力後→電話に切替→電話未入力で送信', async ({ page }) => {
      await page.goto(`${BASE}/reserve.html?plan-id=0`);
      await page.waitForLoadState('networkidle');

      // メール選択してメール入力
      await page.locator('#contact').selectOption('email');
      await page.locator('#email').fill('test@example.com');

      // 電話に切替
      await page.locator('#contact').selectOption('tel');

      // email の disabled 状態と tel の状態を確認
      const emailDisabled = await page.locator('#email').isDisabled();
      const telDisabled = await page.locator('#tel').isDisabled();
      const emailValue = await page.locator('#email').inputValue().catch(() => 'disabled');
      console.log('After switch: email disabled=', emailDisabled, 'tel disabled=', telDisabled);
      console.log('Email value after switch:', emailValue);

      // 電話未入力のまま送信
      await fillMinimalForm(page, { contact: 'tel' });
      await clickSubmit(page);

      const url = page.url();
      console.log('After submit URL:', url);
      const hasConfirm = url.includes('confirm') || await page.locator('text=予約内容の確認').count() > 0;
      console.log('Reached confirm?', hasConfirm);

      expect(hasConfirm).toBe(false);
    });

    test('電話入力後→メールに切替→メール未入力で送信', async ({ page }) => {
      await page.goto(`${BASE}/reserve.html?plan-id=0`);
      await page.waitForLoadState('networkidle');

      // 電話選択して入力
      await page.locator('#contact').selectOption('tel');
      await page.locator('#tel').fill('09012345678');

      // メールに切替
      await page.locator('#contact').selectOption('email');

      const emailDisabled = await page.locator('#email').isDisabled();
      const telDisabled = await page.locator('#tel').isDisabled();
      console.log('After switch: email disabled=', emailDisabled, 'tel disabled=', telDisabled);

      // メール未入力のまま送信
      await fillMinimalForm(page, { contact: 'email' });
      await clickSubmit(page);

      const url = page.url();
      console.log('After submit URL:', url);
      const hasConfirm = url.includes('confirm') || await page.locator('text=予約内容の確認').count() > 0;
      console.log('Reached confirm?', hasConfirm);

      expect(hasConfirm).toBe(false);
    });

    test('「希望しない」選択 → email/tel両方disabled → 正常送信', async ({ page }) => {
      await page.goto(`${BASE}/reserve.html?plan-id=0`);
      await page.waitForLoadState('networkidle');

      await fillMinimalForm(page, { contact: 'no' });
      await clickSubmit(page);

      const url = page.url();
      console.log('After submit URL:', url);
      const hasConfirm = url.includes('confirm') || await page.locator('text=予約内容の確認').count() > 0;
      console.log('Reached confirm with no contact?', hasConfirm);

      // 正常に確認画面に遷移するはず
      expect(hasConfirm).toBe(true);
    });
  });

  // ==============================
  // 3. 日付バリデーション
  // ==============================
  test.describe('日付バリデーション', () => {

    test('過去日付で送信 → 弾かれるか', async ({ page }) => {
      await page.goto(`${BASE}/reserve.html?plan-id=0`);
      await page.waitForLoadState('networkidle');

      const pastDate = '2020/01/01';
      await fillMinimalForm(page, { date: pastDate });
      await clickSubmit(page);

      const url = page.url();
      console.log('After submit with past date URL:', url);
      const hasConfirm = url.includes('confirm') || await page.locator('text=予約内容の確認').count() > 0;
      console.log('Reached confirm with past date?', hasConfirm);

      // 過去日付は弾かれるべき（V23: 禁則）
      if (hasConfirm) {
        console.log('BUG: 過去日付(2020/01/01)で確認画面に遷移できてしまった');
        // 確認画面の内容も記録
        const body = await page.locator('body').textContent();
        console.log('Confirm page excerpt:', body?.substring(0, 300));
      }
    });

    test('昨日の日付で送信 → 弾かれるか', async ({ page }) => {
      await page.goto(`${BASE}/reserve.html?plan-id=0`);
      await page.waitForLoadState('networkidle');

      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const dateStr = `${yesterday.getFullYear()}/${String(yesterday.getMonth() + 1).padStart(2, '0')}/${String(yesterday.getDate()).padStart(2, '0')}`;

      await fillMinimalForm(page, { date: dateStr });
      await clickSubmit(page);

      const url = page.url();
      console.log('After submit with yesterday URL:', url);
      const hasConfirm = url.includes('confirm') || await page.locator('text=予約内容の確認').count() > 0;
      console.log('Reached confirm with yesterday?', hasConfirm);

      if (hasConfirm) {
        console.log('BUG: 昨日の日付で確認画面に遷移できてしまった');
      }
    });

    test('空の日付で送信 → 弾かれるか', async ({ page }) => {
      await page.goto(`${BASE}/reserve.html?plan-id=0`);
      await page.waitForLoadState('networkidle');

      await fillMinimalForm(page, { date: '' });
      await clickSubmit(page);

      const url = page.url();
      console.log('After submit with empty date URL:', url);
      const hasConfirm = url.includes('confirm') || await page.locator('text=予約内容の確認').count() > 0;
      console.log('Reached confirm with empty date?', hasConfirm);

      expect(hasConfirm).toBe(false);
    });

    test('不正な日付形式で送信', async ({ page }) => {
      await page.goto(`${BASE}/reserve.html?plan-id=0`);
      await page.waitForLoadState('networkidle');

      await fillMinimalForm(page, { date: 'abc/def/ghi' });
      await clickSubmit(page);

      const url = page.url();
      console.log('After submit with invalid date URL:', url);
      const hasConfirm = url.includes('confirm') || await page.locator('text=予約内容の確認').count() > 0;
      console.log('Reached confirm with invalid date?', hasConfirm);

      if (hasConfirm) {
        console.log('BUG: 不正な日付形式で確認画面に遷移できてしまった');
        const body = await page.locator('body').textContent();
        console.log('Confirm page excerpt:', body?.substring(0, 300));
      }
    });

    test('1年以上先の遠未来日付で送信', async ({ page }) => {
      await page.goto(`${BASE}/reserve.html?plan-id=0`);
      await page.waitForLoadState('networkidle');

      const farFuture = '2030/12/31';
      await fillMinimalForm(page, { date: farFuture });
      await clickSubmit(page);

      const url = page.url();
      console.log('After submit with far future date URL:', url);
      const hasConfirm = url.includes('confirm') || await page.locator('text=予約内容の確認').count() > 0;
      console.log('Reached confirm with far future date?', hasConfirm);
      // 上限チェックの有無を確認（予約システムとしては上限があるのが普通）
      if (hasConfirm) {
        console.log('NOTE: 4年以上先の日付でも予約可能(上限チェックなし)');
      }
    });
  });

  // ==============================
  // 4. 全角スペース横展開 (V09 + 会員限定プラン)
  // ==============================
  test.describe('全角スペース横展開', () => {

    test('plan-1(会員限定): 氏名に全角スペースのみ → 送信可否', async ({ page }) => {
      await page.goto(`${BASE}/reserve.html?plan-id=1`);
      await page.waitForLoadState('networkidle');

      await fillMinimalForm(page, { username: '　　　' }); // 全角スペースのみ
      await clickSubmit(page);

      const url = page.url();
      console.log('After submit URL:', url);
      const hasConfirm = url.includes('confirm') || await page.locator('text=予約内容の確認').count() > 0;
      console.log('Reached confirm with fullwidth space username?', hasConfirm);

      if (hasConfirm) {
        console.log('BUG再現: 会員限定プランでも全角スペースのみの氏名で確認画面に遷移(F-20260422-09と同根)');
      }
    });

    test('メールアドレスに全角スペースのみ → 送信可否', async ({ page }) => {
      await page.goto(`${BASE}/reserve.html?plan-id=0`);
      await page.waitForLoadState('networkidle');

      await page.locator('#contact').selectOption('email');
      await page.locator('#email').fill('　　　');
      await page.locator('#username').fill('テスト太郎');

      // 残りの必須項目も埋める
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dateStr = `${tomorrow.getFullYear()}/${String(tomorrow.getMonth() + 1).padStart(2, '0')}/${String(tomorrow.getDate()).padStart(2, '0')}`;
      await page.locator('#date').fill(dateStr);
      await page.locator('#date').press('Escape');

      await clickSubmit(page);

      const url = page.url();
      console.log('After submit URL:', url);
      const hasConfirm = url.includes('confirm') || await page.locator('text=予約内容の確認').count() > 0;
      console.log('Reached confirm with fullwidth space email?', hasConfirm);

      if (hasConfirm) {
        console.log('BUG: 全角スペースのみのメールアドレスで確認画面に遷移');
      }

      // type=email のブラウザバリデーションが効くはず
      const validityMessage = await page.locator('#email').evaluate(
        (el: HTMLInputElement) => el.validationMessage
      );
      console.log('email validationMessage:', validityMessage);
    });

    test('電話番号に全角数字 → 送信可否', async ({ page }) => {
      await page.goto(`${BASE}/reserve.html?plan-id=0`);
      await page.waitForLoadState('networkidle');

      await page.locator('#contact').selectOption('tel');
      await page.locator('#tel').fill('０９０１２３４５６７８'); // 全角数字

      await page.locator('#username').fill('テスト太郎');
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dateStr = `${tomorrow.getFullYear()}/${String(tomorrow.getMonth() + 1).padStart(2, '0')}/${String(tomorrow.getDate()).padStart(2, '0')}`;
      await page.locator('#date').fill(dateStr);
      await page.locator('#date').press('Escape');

      await clickSubmit(page);

      const url = page.url();
      console.log('After submit URL:', url);
      const hasConfirm = url.includes('confirm') || await page.locator('text=予約内容の確認').count() > 0;
      console.log('Reached confirm with fullwidth digits in tel?', hasConfirm);

      if (hasConfirm) {
        console.log('BUG: 全角数字の電話番号で確認画面に遷移（pattern="[0-9]{11}"の抜け穴）');
      }
    });
  });

  // ==============================
  // 5. JS経由での制約回避(DevTools想定)
  // ==============================
  test.describe('JS経由でのバリデーション回避', () => {

    test('min/max属性をJS削除して0を送信', async ({ page }) => {
      await page.goto(`${BASE}/reserve.html?plan-id=0`);
      await page.waitForLoadState('networkidle');

      // min/max属性をJS経由で削除
      await page.locator('#term').evaluate((el: HTMLInputElement) => {
        el.removeAttribute('min');
        el.removeAttribute('max');
      });
      await page.locator('#head-count').evaluate((el: HTMLInputElement) => {
        el.removeAttribute('min');
        el.removeAttribute('max');
      });

      await fillMinimalForm(page, { term: '0', headCount: '0' });
      await clickSubmit(page);

      const url = page.url();
      console.log('After submit (min/max removed) URL:', url);
      const hasConfirm = url.includes('confirm') || await page.locator('text=予約内容の確認').count() > 0;
      console.log('Reached confirm after removing min/max?', hasConfirm);

      if (hasConfirm) {
        console.log('BUG: min/max属性削除後に0泊0名で確認画面に遷移(サーバー側チェックなし)');
        const body = await page.locator('body').textContent();
        console.log('Confirm page excerpt:', body?.substring(0, 500));
      }
    });

    test('required属性をJS削除して氏名空で送信', async ({ page }) => {
      await page.goto(`${BASE}/reserve.html?plan-id=0`);
      await page.waitForLoadState('networkidle');

      // required属性をJS経由で削除
      await page.locator('#username').evaluate((el: HTMLInputElement) => {
        el.removeAttribute('required');
      });

      await fillMinimalForm(page, { username: '' });
      await clickSubmit(page);

      const url = page.url();
      console.log('After submit (required removed) URL:', url);
      const hasConfirm = url.includes('confirm') || await page.locator('text=予約内容の確認').count() > 0;
      console.log('Reached confirm after removing required?', hasConfirm);

      if (hasConfirm) {
        console.log('BUG: required削除後に氏名空で確認画面に遷移(サーバー側チェックなし)');
        const body = await page.locator('body').textContent();
        console.log('Confirm page excerpt:', body?.substring(0, 500));
      }
    });
  });

  // ==============================
  // 6. 会員限定プラン固有のバリデーション
  // ==============================
  test.describe('会員限定プラン固有テスト', () => {

    test('plan-2(ディナー付き): 人数=max超過(5) → max=4なので弾かれるべき', async ({ page }) => {
      await page.goto(`${BASE}/reserve.html?plan-id=2`);
      await page.waitForLoadState('networkidle');

      await fillMinimalForm(page, { headCount: '5' });
      await clickSubmit(page);

      const url = page.url();
      console.log('After submit URL:', url);
      const hasConfirm = url.includes('confirm') || await page.locator('text=予約内容の確認').count() > 0;
      console.log('Reached confirm?', hasConfirm);

      expect(hasConfirm).toBe(false);
    });

    test('plan-2: 宿泊数=max超過(4) → max=3なので弾かれるべき', async ({ page }) => {
      await page.goto(`${BASE}/reserve.html?plan-id=2`);
      await page.waitForLoadState('networkidle');

      await fillMinimalForm(page, { term: '4' });
      await clickSubmit(page);

      const url = page.url();
      console.log('After submit URL:', url);
      const hasConfirm = url.includes('confirm') || await page.locator('text=予約内容の確認').count() > 0;
      console.log('Reached confirm?', hasConfirm);

      expect(hasConfirm).toBe(false);
    });

    test('plan-1: 正常ケース 2名1泊 → 確認画面に遷移', async ({ page }) => {
      await page.goto(`${BASE}/reserve.html?plan-id=1`);
      await page.waitForLoadState('networkidle');

      await fillMinimalForm(page, { headCount: '2' });
      await clickSubmit(page);

      const url = page.url();
      console.log('After submit URL:', url);
      const hasConfirm = url.includes('confirm') || await page.locator('text=予約内容の確認').count() > 0;
      console.log('Reached confirm (normal case)?', hasConfirm);

      if (hasConfirm) {
        // 料金確認: プレミアムプラン 10,000円/人×2名=20,000円
        const totalBill = await page.locator('#total-bill, [id*="total"], [class*="total"]').textContent().catch(() => 'not found');
        console.log('Total bill:', totalBill);
      }

      expect(hasConfirm).toBe(true);
    });
  });
});
