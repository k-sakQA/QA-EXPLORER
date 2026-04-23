import { test, expect } from '@playwright/test';
import { gotoAndDismiss, dismissAllDialogs } from './helpers/dismiss-dialogs';

/**
 * 観点10: 単機能 - 主要フローの基本動作確認
 * 欠陥仮定: 遷移失敗・データ消失・機能不動作
 *
 * 浅く広く: Home→Shop→Packs→Collection→Others の各画面で
 * 主要な操作が一通り動くことを確認
 */
test.describe('観点10: 単機能 - 主要フロー動作確認', () => {

  test('Home: ナビゲーションで各画面に遷移できる', async ({ page }) => {
    const navTargets = [
      { label: 'コレクション', path: '/collection' },
      { label: 'パック', path: '/packs' },
      { label: 'その他', path: '/others' },
      { label: 'ホーム', path: '/home' },
    ];

    for (const target of navTargets) {
      await gotoAndDismiss(page, '/home');
      console.log(`Nav: ${target.label} -> ${target.path}`);
      await page.locator(`nav a[href="${target.path}"]`).click();
      await expect(page).toHaveURL(new RegExp(target.path));
      console.log(`  OK: ${page.url()}`);
    }
  });

  test('Home: PICK UP カルーセルが表示される', async ({ page }) => {
    await gotoAndDismiss(page, '/home');
    await expect(page.locator('body')).toContainText('PICK UP');
    const packLinks = page.locator('a[href*="/packs/cardpackcampaign_"]');
    await expect(packLinks.first()).toBeVisible();
    const packCount = await packLinks.count();
    console.log(`PICK UP パックリンク数: ${packCount}`);
  });

  test('Home: SHOP / PACK バナーから遷移できる', async ({ page }) => {
    await gotoAndDismiss(page, '/home');
    await page.locator('a[href="/shop"]').first().click();
    await expect(page).toHaveURL(/\/shop/);
    console.log('SHOP バナー遷移: OK');

    await gotoAndDismiss(page, '/home');
    const packLink = page.locator('a[href="/packs"]').first();
    if (await packLink.isVisible()) {
      await packLink.click();
      await expect(page).toHaveURL(/\/packs/);
      console.log('PACK バナー遷移: OK');
    }
  });

  test('Shop: バモス商品一覧が表示される', async ({ page }) => {
    // /shop は RSC データ取得に時間がかかる場合がある
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        await page.goto('/shop', { waitUntil: 'domcontentloaded', timeout: 30000 });
        break;
      } catch (e) {
        if (attempt === 2) throw e;
        console.log(`/shop goto retry ${attempt + 1}`);
        await page.waitForTimeout(2000);
      }
    }
    await expect(page.locator('body')).toContainText('バモス', { timeout: 30000 });
    const bodyText = await page.evaluate(() => document.body.innerText);
    const prices = bodyText.match(/¥[\d,]+/g) || [];
    console.log(`Shop 価格表示: ${prices.join(', ')}`);
    expect(prices.length).toBeGreaterThanOrEqual(3);
  });

  test('Packs: パック一覧が表示され詳細に遷移できる', async ({ page }) => {
    await gotoAndDismiss(page, '/packs');
    await expect(page.locator('body')).toContainText('PACK');

    const detailLinks = page.locator('a[href*="/packs/cardpackcampaign_"]');
    await expect(detailLinks.first()).toBeVisible();
    const count = await detailLinks.count();
    console.log(`Packs パック詳細リンク数: ${count}`);

    // パック詳細に遷移
    await detailLinks.first().click();
    await expect(page).toHaveURL(/\/packs\/cardpackcampaign_/);
    await dismissAllDialogs(page);
    await expect(page.locator('body')).toContainText('提供割合');
    console.log('パック詳細: 提供割合表示OK');
  });

  test('Collection: カード一覧が表示される', async ({ page }) => {
    await gotoAndDismiss(page, '/collection');
    await expect(page.locator('body')).toContainText('COLLECTION');
    await expect(page.getByText('すべて')).toBeVisible();
    await expect(page.getByText('シリーズ')).toBeVisible();
    console.log('Collection: フィルタ表示OK');
  });

  test('Others: 設定メニューが表示される', async ({ page }) => {
    await gotoAndDismiss(page, '/others');

    const menuItems = [
      'ニックネームの編集', 'バモス所持数・購入履歴', 'お支払い方法の設定',
      'プロモーションコードの入力', '規約・ポリシー', 'ログアウト',
    ];
    for (const item of menuItems) {
      await expect(page.locator('body')).toContainText(item);
      console.log(`Others: ${item} = OK`);
    }
  });

  test('Others: ニックネーム編集画面に遷移できる', async ({ page }) => {
    await gotoAndDismiss(page, '/others');
    await page.locator('a[href="/others/nickname_edit"]').click();
    // SPA遷移を待つ（直接アクセスだと /others にリダイレクトされるため SPA遷移が必須）
    await expect(page).toHaveURL(/\/others\/nickname_edit/);
    await dismissAllDialogs(page);

    console.log(`ニックネーム編集 URL: ${page.url()}`);
    const bodyText = await page.evaluate(() => document.body.innerText);
    console.log(`ニックネーム編集テキスト: ${bodyText}`);

    // ニックネーム入力・保存ボタンの存在確認
    await expect(page.locator('body')).toContainText('ニックネーム');
    await expect(page.locator('body')).toContainText('保存する');
    await page.screenshot({ path: 'test-results/ph-nickname-edit.png', fullPage: true });
  });

  test('Others: プロモーションコード入力画面に遷移できる', async ({ page }) => {
    await gotoAndDismiss(page, '/others');
    await page.locator('a[href*="/promotion_code"]').click();
    await expect(page).toHaveURL(/\/promotion_code/);
    await dismissAllDialogs(page);

    console.log(`プロモーションコード URL: ${page.url()}`);
    const inputs = await page.evaluate(() =>
      Array.from(document.querySelectorAll('input,textarea')).map(i => ({
        name: (i as HTMLInputElement).name, type: (i as HTMLInputElement).type,
        placeholder: (i as HTMLInputElement).placeholder,
        maxLength: (i as HTMLInputElement).maxLength,
      }))
    );
    console.log('Inputs:');
    for (const i of inputs) console.log(`  name="${i.name}" type="${i.type}" placeholder="${i.placeholder}" maxLength=${i.maxLength}`);
    await page.screenshot({ path: 'test-results/ph-promo-code.png', fullPage: true });
  });
});
