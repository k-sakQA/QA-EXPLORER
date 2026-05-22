import { test, expect, Page } from '@playwright/test';

/**
 * Session 6: ナレッジ駆動探索テスト
 *
 * H-20260424-01 (サーバ側バリデーション不在) のProbe実施
 * + 申し送り事項の消化
 *
 * P-20260424-01: confirm.htmlへのGETパラメータ直打ちで予約成立するか
 * - GETパラメータでフォームデータを送信する構造 (F-20260422-13) を悪用
 * - 不正データの直接URLアクセスが可能か検証
 */

const BASE = 'https://hotel-example-site.takeyaqa.dev/ja';

function futureDate(daysAhead: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
}

// ========================================
// P-20260424-01: GETパラメータ直打ち検証
// ========================================
test.describe('P-20260424-01: GETパラメータ直打ち検証', () => {

  test('confirm.htmlへのGETパラメータ直打ちで予約画面が表示されるか', async ({ page }) => {
    // フォーム送信時のGETパラメータを直接構築
    const params = new URLSearchParams({
      'date': futureDate(2),
      'term': '1',
      'head-count': '1',
      'username': 'テスト太郎',
      'contact': 'no',
      'comment': '',
      'plan-id-hidden': '0',
      'plan-name-hidden': 'お得な特典付きプラン',
      'room-bill-hidden': '7000',
    });

    const directUrl = `${BASE}/confirm.html?${params.toString()}`;
    console.log(`[P-01] Direct URL: ${directUrl}`);

    await page.goto(directUrl);
    await page.waitForLoadState('networkidle');

    const bodyText = await page.locator('body').textContent() || '';
    console.log(`[P-01] 確認画面表示: ${page.url().includes('confirm.html')}`);
    console.log(`[P-01] 合計金額含む: ${bodyText.includes('合計')}`);
    console.log(`[P-01] テスト太郎含む: ${bodyText.includes('テスト太郎')}`);

    if (bodyText.includes('合計') && bodyText.includes('テスト太郎')) {
      console.log('[P-01] ★ 確認画面がGETパラメータから直接生成可能 ★');
    }
  });

  test('GETパラメータで料金0円を直打ち → 予約が成立するか', async ({ page }) => {
    const params = new URLSearchParams({
      'date': futureDate(2),
      'term': '1',
      'head-count': '1',
      'username': 'ゼロ円太郎',
      'contact': 'no',
      'comment': '',
      'plan-id-hidden': '0',
      'plan-name-hidden': 'お得な特典付きプラン',
      'room-bill-hidden': '0',  // 料金改ざん
    });

    await page.goto(`${BASE}/confirm.html?${params.toString()}`);
    await page.waitForLoadState('networkidle');

    const bodyText = await page.locator('body').textContent() || '';
    const priceMatch = bodyText.match(/合計\s*([\d,]+)円/);
    console.log(`[P-01] 0円直打ち → 金額表示: ${priceMatch?.[1]}`);

    // 「この内容で予約する」ボタンが存在するか
    const reserveBtn = page.getByRole('button', { name: 'この内容で予約する' });
    const btnExists = await reserveBtn.count() > 0;
    console.log(`[P-01] 予約ボタン存在: ${btnExists}`);

    if (btnExists) {
      await reserveBtn.click();
      await page.waitForTimeout(500);
      const modal = page.locator('.modal');
      const modalVisible = await modal.isVisible().catch(() => false);
      console.log(`[P-01] 予約完了モーダル: ${modalVisible}`);

      if (modalVisible) {
        console.log('[P-01] ★★ CRITICAL BUG: URL直打ちで0円予約が成立 ★★');
      }
    }
  });

  test('GETパラメータで宿泊数0・人数0を直打ち', async ({ page }) => {
    const params = new URLSearchParams({
      'date': futureDate(2),
      'term': '0',
      'head-count': '0',
      'username': '不正テスト',
      'contact': 'no',
      'comment': '',
      'plan-id-hidden': '0',
      'plan-name-hidden': 'お得な特典付きプラン',
      'room-bill-hidden': '7000',
    });

    await page.goto(`${BASE}/confirm.html?${params.toString()}`);
    await page.waitForLoadState('networkidle');

    const bodyText = await page.locator('body').textContent() || '';
    console.log(`[P-01] 0泊0人: ${bodyText.includes('0泊') ? '★通過★' : '弾かれた'}`);
    console.log(`[P-01] 0名: ${bodyText.includes('0名') ? '★通過★' : '弾かれた'}`);

    const reserveBtn = page.getByRole('button', { name: 'この内容で予約する' });
    if (await reserveBtn.count() > 0) {
      await reserveBtn.click();
      await page.waitForTimeout(500);
      const modal = page.locator('.modal');
      if (await modal.isVisible().catch(() => false)) {
        console.log('[P-01] ★★ BUG: 0泊0人の予約がURL直打ちで成立 ★★');
      }
    }
  });

  test('GETパラメータで存在しないplan-idを直打ち', async ({ page }) => {
    const params = new URLSearchParams({
      'date': futureDate(2),
      'term': '1',
      'head-count': '1',
      'username': '存在しないプラン',
      'contact': 'no',
      'comment': '',
      'plan-id-hidden': '999',  // 存在しないID
      'plan-name-hidden': '架空のプラン',
      'room-bill-hidden': '100',
    });

    await page.goto(`${BASE}/confirm.html?${params.toString()}`);
    await page.waitForLoadState('networkidle');

    const bodyText = await page.locator('body').textContent() || '';
    console.log(`[P-01] 存在しないplan-id=999: 架空のプラン含む=${bodyText.includes('架空のプラン')}`);

    const reserveBtn = page.getByRole('button', { name: 'この内容で予約する' });
    if (await reserveBtn.count() > 0) {
      await reserveBtn.click();
      await page.waitForTimeout(500);
      const modal = page.locator('.modal');
      if (await modal.isVisible().catch(() => false)) {
        console.log('[P-01] ★★ BUG: 存在しないプランIDで予約が成立 ★★');
      }
    }
  });

  test('required属性をJS除去して全フィールド空で送信', async ({ page }) => {
    await page.goto(`${BASE}/reserve.html?plan-id=0`);
    await page.waitForLoadState('networkidle');

    // 全required属性を除去
    await page.evaluate(() => {
      document.querySelectorAll('[required]').forEach(el => el.removeAttribute('required'));
    });

    // 氏名を空に
    await page.locator('#username').fill('');
    // 日付を空に
    await page.locator('#date').fill('');
    // contact未選択のまま

    await page.getByRole('button', { name: '予約内容を確認する' }).click();
    await page.waitForLoadState('networkidle');

    const url = page.url();
    console.log(`[P-01] 全フィールド空送信: ${url}`);

    if (url.includes('confirm.html')) {
      const bodyText = await page.locator('body').textContent() || '';
      console.log(`[P-01] ★★ BUG: 全フィールド空で確認画面到達 ★★`);
      console.log(`[P-01] 確認画面内容: ${bodyText.substring(0, 300)}`);
    }
  });
});
