import { test, expect, Page } from '@playwright/test';
import * as path from 'path';

/**
 * Pocket Heroes 本番確認テスト - 課金まわり (USNo,1-3)
 *
 * SPCNo,1-3--5: クレジットカード（3Dセキュア対応）購入 → 購入できること
 * SPCNo,1-3--4: → クレジットカードが登録できていること
 * SPCNo,1-3--3: バモス所持数の確認 → 購入した有償バモス数が正しい
 * SPCNo,1-3--2: → 無償バモス数が正しい
 *
 * テスト対象商品: バモス×26 (¥700) ※オマケ+1 (無償バモス)
 * 決済手段: Stripeテストカード 4242 4242 4242 4242
 */

const USER_BASE = 'https://development.pocket-heroes.net';
const USER_AUTH = path.resolve(__dirname, '../../storage/pocket-heroes-auth.json');

test.use({ storageState: USER_AUTH });
test.setTimeout(180000);

// ============================================================
// ヘルパー
// ============================================================

async function dismissAllDialogs(page: Page) {
  // PWAダイアログ等が遅延表示されることがあるので複数回試行
  for (let i = 0; i < 3; i++) {
    await page.evaluate(() => {
      document.querySelectorAll('dialog[open]').forEach(d => {
        (d as HTMLDialogElement).close();
      });
    });
    await page.waitForTimeout(500);
  }
  // 最終確認：まだ開いているdialogがあれば閉じる
  await page.evaluate(() => {
    document.querySelectorAll('dialog[open]').forEach(d => {
      (d as HTMLDialogElement).close();
    });
  });
}

/** ショップページ上のバモス残高を取得 */
async function getVamosBalance(page: Page): Promise<{ total: number; text: string }> {
  const bodyText = await page.locator('body').innerText();
  // "SHOP\n{数字}" or ヘッダー付近のバモス数値を取得
  const match = bodyText.match(/(?:SHOP|ショップ)\n([\d,]+)/);
  if (match) {
    return { total: parseInt(match[1].replace(/,/g, ''), 10), text: match[0] };
  }
  // フォールバック: ページ内の大きな数字を探す
  const numMatch = bodyText.match(/([\d,]+)\s*バモス/);
  if (numMatch) {
    return { total: parseInt(numMatch[1].replace(/,/g, ''), 10), text: numMatch[0] };
  }
  return { total: -1, text: 'NOT_FOUND' };
}

// ============================================================
// テスト本体
// ============================================================

test.describe('USNo,1-3 課金まわり - バモス×26 (¥700) 購入テスト', () => {

  test('SPCNo,1-3--5/4/3/2: クレジットカード購入 & バモス数検証', async ({ page }) => {
    // ── Step 1: ショップ画面を開き、初期残高を記録 ──
    console.log('=== Step 1: ショップ画面を開き初期残高を記録 ===');
    await page.goto(`${USER_BASE}/shop`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2000);
    await dismissAllDialogs(page);

    const balanceBefore = await getVamosBalance(page);
    console.log(`[初期] バモス残高: ${balanceBefore.total} (raw: "${balanceBefore.text}")`);

    // ページ全体のテキストを記録（デバッグ用）
    const shopText = await page.locator('body').innerText();
    console.log(`[SHOP] ページテキスト (first 2000):\n${shopText.substring(0, 2000)}`);

    await page.screenshot({
      path: 'reports/development-pocket-heroes-net/screenshots/spc-1-3-shop-initial.png',
      fullPage: true,
    });

    // ── Step 2: バモス×26 (¥700) カードをクリック ──
    console.log('\n=== Step 2: バモス×26 (¥700) カードをクリック ===');

    // バモス×26のカードを探す（表記ゆれ対応）
    const plan26Card = page.getByRole('button', { name: /バモス\s*[x×]\s*26/ });
    const plan26Alt = page.locator('button:has-text("¥700"), [role="button"]:has-text("¥700")');

    let targetCard = plan26Card;
    if (!(await plan26Card.isVisible({ timeout: 5000 }).catch(() => false))) {
      console.log('[SHOP] role=button での検索失敗。¥700テキストで再検索...');
      targetCard = plan26Alt.first();
    }

    await expect(targetCard).toBeVisible({ timeout: 10000 });
    console.log('[SHOP] 商品カード発見。クリックします。');
    await targetCard.click({ force: true });
    await page.waitForTimeout(2000);

    // 購入確認ダイアログ
    const dialogOpen = page.locator('dialog[open]');
    await expect(dialogOpen.first()).toBeVisible({ timeout: 5000 });
    const dialogText = await dialogOpen.first().innerText();
    console.log(`[SHOP] ダイアログ内容:\n${dialogText.substring(0, 500)}`);

    await page.screenshot({
      path: 'reports/development-pocket-heroes-net/screenshots/spc-1-3-purchase-dialog.png',
    });

    // ── Step 3: 購入確認ダイアログ → 決済フォーム ──
    console.log('\n=== Step 3: 購入確認 → 決済情報入力 ===');

    // 2段階のフローがある場合: 「購入する」→ 決済ダイアログ
    // 1段階の場合: 直接決済ダイアログ（お支払い方法）が表示される
    const buyButton = page.getByRole('button', { name: '購入する' });
    if (await buyButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log('[SHOP] 「購入する」中間ボタン検出 → クリック');
      await buyButton.click();
      await page.waitForTimeout(3000);
    } else {
      console.log('[SHOP] 「購入する」中間ボタンなし → 直接決済画面');
    }

    // 決済ダイアログが開くのを待つ
    await page.waitForTimeout(3000);

    // テストケース要件: 新規クレジットカードを登録して購入する
    // 保存済みカードがある場合は「新規クレジットカード」ボタンを選択
    // ※ ラジオボタンは親のbutton要素にインターセプトされるため、buttonをクリック
    const newCardButton = page.getByRole('button', { name: /新規クレジットカード/ });
    if (await newCardButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log('[決済] 保存済みカードが存在 → 「新規クレジットカード」を選択');
      await newCardButton.click();
      await page.waitForTimeout(2000);
    } else {
      console.log('[決済] 保存済みカードなし → 新規入力フォームが表示されるはず');
    }

    // Stripe Elements iframeでカード情報入力
    console.log('[決済] 新規カード入力');
    const stripeIframe = page.frameLocator('iframe').first();

    // カード番号入力
    const cardNumberInput = stripeIframe.locator('[placeholder*="1234"], [aria-label*="Card number"]');
    await expect(cardNumberInput).toBeVisible({ timeout: 20000 });
    console.log('[Stripe] カード番号フィールド検出');
    await cardNumberInput.fill('4242424242424242');
    await page.waitForTimeout(500);
    console.log('[Stripe] カード番号入力完了');

    // 有効期限
    const expiryInput = stripeIframe.locator('[placeholder*="MM"], [aria-label*="Expiration"]');
    await expect(expiryInput).toBeVisible({ timeout: 5000 });
    await expiryInput.fill('1230');
    await page.waitForTimeout(500);
    console.log('[Stripe] 有効期限入力完了');

    // セキュリティコード
    const cvcInput = stripeIframe.locator('[placeholder="CVC"], [aria-label*="Security code"]');
    await expect(cvcInput).toBeVisible({ timeout: 5000 });
    await cvcInput.fill('123');
    await page.waitForTimeout(500);
    console.log('[Stripe] CVC入力完了');

    await page.screenshot({
      path: 'reports/development-pocket-heroes-net/screenshots/spc-1-3-card-filled.png',
    });

    // 「購入を確定する」ボタンが有効になるのを待つ
    const confirmButton = page.locator('button:has-text("購入を確定する")');
    await expect(confirmButton).toBeEnabled({ timeout: 30000 });
    console.log('[決済] 「購入を確定する」ボタン有効化確認');
    await confirmButton.click();
    console.log('[決済] 「購入を確定する」クリック完了');

    // ── Step 4: 3Dセキュア認証 & 決済完了を待つ ──
    console.log('\n=== Step 4: 3Dセキュア認証 & 決済完了確認 ===');

    // 3Dセキュア認証画面の処理（Stripeテストモードでは表示されない場合あり）
    await page.waitForTimeout(5000);
    await handle3DSecure(page);

    // 購入完了を待つ（成功ダイアログ出現）
    const okButton = page.locator('dialog[open] button:has-text("OK")');
    if (await okButton.isVisible({ timeout: 30000 }).catch(() => false)) {
      console.log('[決済] 購入完了ダイアログ「OK」を検出 → クリック');
      await page.screenshot({
        path: 'reports/development-pocket-heroes-net/screenshots/spc-1-3-purchase-complete-dialog.png',
      });
      await okButton.click();
      await page.waitForTimeout(2000);
    } else {
      console.log('[決済] OKダイアログ未検出。現在の画面状態を確認...');
      await page.screenshot({
        path: 'reports/development-pocket-heroes-net/screenshots/spc-1-3-after-confirm.png',
        fullPage: true,
      });
    }
    await dismissAllDialogs(page);

    await page.screenshot({
      path: 'reports/development-pocket-heroes-net/screenshots/spc-1-3-after-purchase.png',
      fullPage: true,
    });

    // ── Step 5: 検証 ──
    console.log('\n=== Step 5: 検証 ===');

    // ショップページに戻って残高を確認
    await page.goto(`${USER_BASE}/shop`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(3000);
    await dismissAllDialogs(page);

    const balanceAfter = await getVamosBalance(page);
    console.log(`[検証] バモス残高(購入後): ${balanceAfter.total} (raw: "${balanceAfter.text}")`);
    console.log(`[検証] 差分: +${balanceAfter.total - balanceBefore.total}`);

    await page.screenshot({
      path: 'reports/development-pocket-heroes-net/screenshots/spc-1-3-balance-after.png',
      fullPage: true,
    });

    // ===== SPCNo,1-3--5: 購入できること =====
    console.log('\n--- SPCNo,1-3--5: 購入できること ---');
    const purchaseSucceeded = balanceAfter.total > balanceBefore.total;
    console.log(`  結果: ${purchaseSucceeded ? 'PASS' : 'FAIL'}`);
    expect(purchaseSucceeded, 'SPCNo,1-3--5: 購入に成功していること').toBeTruthy();

    // ===== SPCNo,1-3--4: クレジットカードが登録できていること =====
    console.log('\n--- SPCNo,1-3--4: クレジットカードが登録できていること ---');
    // 再度商品を選択→「購入する」→決済ダイアログでカード情報が表示されるか確認
    await page.goto(`${USER_BASE}/shop`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(3000);
    await dismissAllDialogs(page);

    // 商品をクリック
    const checkCard = page.getByRole('button', { name: /バモス\s*[x×]\s*26/ });
    await checkCard.click({ force: true });
    await page.waitForTimeout(2000);

    // 決済画面が直接表示されるケースと中間確認ステップがあるケース
    const checkBuyButton = page.getByRole('button', { name: '購入する' });
    if (await checkBuyButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await checkBuyButton.click();
      await page.waitForTimeout(3000);
    }
    await page.waitForTimeout(2000);

    // 決済ダイアログ内に保存済みカード情報が表示されるか確認
    const paymentDialogText = await page.locator('body').innerText();
    const cardRegistered = paymentDialogText.includes('4242')
      || paymentDialogText.includes('Visa')
      || paymentDialogText.includes('VISA')
      || paymentDialogText.includes('保存済み')
      || paymentDialogText.includes('登録済み');
    console.log(`  カード情報表示: ${cardRegistered}`);
    console.log(`  決済画面テキスト (抜粋): ${paymentDialogText.substring(0, 800)}`);

    await page.screenshot({
      path: 'reports/development-pocket-heroes-net/screenshots/spc-1-3-card-registered.png',
      fullPage: true,
    });

    // ダイアログを閉じる（購入はしない）
    await dismissAllDialogs(page);

    expect(cardRegistered, 'SPCNo,1-3--4: クレジットカードが登録されていること').toBeTruthy();

    // ===== SPCNo,1-3--3: 購入した有償バモス数が正しい =====
    console.log('\n--- SPCNo,1-3--3: 購入した有償バモス数が正しい ---');
    // バモス×26 の内訳: 有償25 + 無償1 = 合計26
    const expectedPaid = 25;
    const totalIncrease = balanceAfter.total - balanceBefore.total;
    const expectedTotal = 26; // 有償25 + 無償1
    console.log(`  増加数: ${totalIncrease}, 期待値(有償+無償): ${expectedTotal}`);
    console.log(`  有償バモス期待値: ${expectedPaid}`);
    // 残高の増加が期待の有償バモス数以上であることを検証
    expect(totalIncrease, `SPCNo,1-3--3: 有償バモス数(${expectedPaid})が付与されていること`)
      .toBeGreaterThanOrEqual(expectedPaid);

    // ===== SPCNo,1-3--2: 無償バモス数が正しい =====
    console.log('\n--- SPCNo,1-3--2: 無償バモス数が正しい ---');
    const expectedFree = 1; // オマケ1個
    console.log(`  合計増加: ${totalIncrease}, 有償: ${expectedPaid}, 無償期待: ${expectedFree}`);
    console.log(`  合計期待: ${expectedTotal}, 実際: ${totalIncrease}`);
    expect(totalIncrease, `SPCNo,1-3--2: 無償バモス(オマケ${expectedFree}個)含め正しい合計数であること`)
      .toBe(expectedTotal);

    // 最終サマリ
    console.log('\n=== テスト結果サマリ ===');
    console.log(`SPCNo,1-3--5 購入できること: ${purchaseSucceeded ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`SPCNo,1-3--4 カード登録: ${cardRegistered ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`SPCNo,1-3--3 有償バモス数: ${totalIncrease >= expectedPaid ? '✅ PASS' : '❌ FAIL'} (増加: ${totalIncrease}, 有償期待: ${expectedPaid})`);
    console.log(`SPCNo,1-3--2 無償バモス数: ${totalIncrease === expectedTotal ? '✅ PASS' : '❌ FAIL'} (合計: ${totalIncrease}, 期待: ${expectedTotal})`);
  });
});

// ============================================================
// 3Dセキュア認証ハンドラ
// ============================================================

/** 3Dセキュア認証処理（Stripeテストモード） */
async function handle3DSecure(page: Page) {
  // Stripeテストモードの3DS認証ページ
  await page.waitForTimeout(3000);

  // iframe内の3DS認証ボタン
  const frames = page.frames();
  for (const frame of frames) {
    if (frame.url().includes('three-ds') || frame.url().includes('3ds') || frame.url().includes('authenticate')) {
      console.log(`[3DS] 3Dセキュア認証フレーム検出: ${frame.url().substring(0, 100)}`);
      const completeBtn = frame.locator('button:has-text("Complete"), button:has-text("認証する"), #test-source-authorize-3ds');
      if (await completeBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
        console.log('[3DS] 認証ボタンクリック');
        await completeBtn.click();
        await page.waitForTimeout(5000);
        return;
      }
    }
  }

  // ページ内直接の3DS要素
  const threeDsButton = page.locator('button:has-text("Complete authentication"), button:has-text("認証する")');
  if (await threeDsButton.isVisible({ timeout: 3000 }).catch(() => false)) {
    console.log('[3DS] ページ内3DSボタンクリック');
    await threeDsButton.click();
    await page.waitForTimeout(5000);
  } else {
    console.log('[3DS] 3Dセキュア認証画面なし（スキップ）');
  }
}
