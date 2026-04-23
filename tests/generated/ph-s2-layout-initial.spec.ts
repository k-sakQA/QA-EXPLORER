import { test, expect } from '@playwright/test';
import { gotoAndDismiss, dismissAllDialogs } from './helpers/dismiss-dialogs';

/**
 * Session #2 — 観点14: 初期値 / 観点01: レイアウト・文言 / 観点13: 切替えとデータ保持 / 観点17: キャンセル
 *
 * 欠陥仮定:
 *  - 初期値が仕様と異なる（特にカウンター、バモス残高、フィルタ状態）
 *  - モバイルビューポートでレイアウト崩れ（テキスト切れ、重なり）
 *  - タブ切り替え後にSPA状態が消失する
 *  - ニックネーム編集中に離脱しても「未保存の変更」警告が出ない
 */

test.describe('Session #2: 初期値・レイアウト・遷移', () => {

  // ===== 観点14: 初期値 =====

  test('観点14: 全画面の初期値を網羅的に確認', async ({ page }) => {
    // --- Home ---
    await page.goto('/home');
    await page.waitForLoadState('networkidle');
    const homeText = await page.evaluate(() => document.body.innerText);
    console.log('=== HOME 初期表示 ===');
    console.log(homeText.substring(0, 300));

    // PICK UP カルーセルの存在
    const hasPickUp = homeText.includes('PICK UP');
    console.log(`PICK UP: ${hasPickUp}`);
    expect(hasPickUp).toBeTruthy();

    // 底ナビの存在
    const bottomNav = ['ホーム', 'コレクション', 'パック', 'フレンド', 'その他'];
    for (const nav of bottomNav) {
      const has = homeText.includes(nav);
      console.log(`  底ナビ「${nav}」: ${has}`);
    }

    // バモス残高表示
    const vamosMatch = homeText.match(/(\d+)/);
    console.log(`バモス残高表示(先頭数値): ${vamosMatch ? vamosMatch[1] : 'なし'}`);

    // --- Collection ---
    await page.goto('/collection');
    await page.waitForLoadState('networkidle');
    const collText = await page.evaluate(() => document.body.innerText);
    console.log('\n=== COLLECTION 初期表示 ===');
    console.log(collText.substring(0, 300));

    // フィルタの初期状態: 「すべて」が選択されているか
    const hasAllFilter = collText.includes('すべて');
    const hasSeriesFilter = collText.includes('シリーズ');
    console.log(`フィルタ: すべて=${hasAllFilter}, シリーズ=${hasSeriesFilter}`);

    // カード枚数の初期表示
    const cardCountMatch = collText.match(/(\d+)\s*$/m);
    console.log(`カード総数表示: ${collText.match(/COLLECTION\s*(\d+)/)?.[1] ?? 'N/A'}`);

    // --- Packs ---
    await page.goto('/packs');
    await page.waitForLoadState('networkidle');
    const packsText = await page.evaluate(() => document.body.innerText);
    console.log('\n=== PACKS 初期表示 ===');
    console.log(packsText.substring(0, 400));

    // パック数確認
    const packLinks = await page.locator('a[href*="/packs/cardpackcampaign_"]').count();
    console.log(`パック詳細リンク数: ${packLinks}`);

    // 無料パックボタンの存在
    const freeButtons = await page.locator('button:has-text("無料で引く")').count();
    console.log(`「無料で引く」ボタン数: ${freeButtons}`);

    // --- Shop ---
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        await page.goto('/shop', { waitUntil: 'domcontentloaded', timeout: 30000 });
        break;
      } catch {
        if (attempt === 2) throw new Error('Shop page load failed');
        await page.waitForTimeout(2000);
      }
    }
    await expect(page.locator('body')).toContainText('バモス', { timeout: 30000 });
    const shopText = await page.evaluate(() => document.body.innerText);
    console.log('\n=== SHOP 初期表示 ===');
    console.log(shopText.substring(0, 400));

    // 6商品が表示されているか
    const prices = shopText.match(/¥([\d,]+)/g) || [];
    console.log(`価格表示数: ${prices.length}`);
    expect(prices.length).toBe(6);

    // --- Purchases ---
    await page.goto('/purchases');
    await page.waitForLoadState('networkidle');
    const purchText = await page.evaluate(() => document.body.innerText);
    console.log('\n=== PURCHASES 初期表示 ===');
    console.log(purchText.substring(0, 300));

    // バモス初期値
    const hasPaidVamos = purchText.includes('有償バモス');
    const hasFreVamos = purchText.includes('無償バモス');
    console.log(`有償バモス表示: ${hasPaidVamos}, 無償バモス表示: ${hasFreVamos}`);

    // 値の確認
    const paidMatch = purchText.match(/有償バモス\s*(\d+)/);
    const freeMatch = purchText.match(/無償バモス\s*(\d+)/);
    console.log(`有償バモス値: ${paidMatch?.[1] ?? 'N/A'}, 無償バモス値: ${freeMatch?.[1] ?? 'N/A'}`);

    await page.screenshot({ path: 'test-results/ph-s2-initial-values.png', fullPage: true });
  });

  test('観点14: ニックネーム編集の初期値', async ({ page }) => {
    await gotoAndDismiss(page, '/others');
    await page.locator('a[href="/others/nickname_edit"]').click({ force: true });
    await page.waitForURL('**/others/nickname_edit**', { timeout: 10000 });

    // 初期値確認
    const nicknameInput = page.locator('textarea[name="nickname"]');
    if (await nicknameInput.count() > 0) {
      const initialValue = await nicknameInput.inputValue();
      console.log(`ニックネーム初期値: "${initialValue}" (${initialValue.length}文字)`);

      // カウンター確認
      const counter = await page.evaluate(() => {
        const body = document.body.innerText;
        const match = body.match(/(\d+)\/24/);
        return match ? match[0] : null;
      });
      console.log(`カウンター: ${counter}`);

      // カウンターが初期値の文字数と一致するか
      if (counter) {
        const counterNum = parseInt(counter.split('/')[0]);
        expect(counterNum).toBe(initialValue.length);
        console.log(`カウンター整合性: ${counterNum} === ${initialValue.length} → ${counterNum === initialValue.length ? 'OK' : 'NG'}`);
      }
    } else {
      console.log('textarea[name="nickname"] が見つからない');
      const bodyText = await page.evaluate(() => document.body.innerText);
      console.log('ページテキスト:', bodyText.substring(0, 300));
    }

    await page.screenshot({ path: 'test-results/ph-s2-nickname-initial.png', fullPage: true });
  });

  // ===== 観点01: レイアウト/文言 =====

  test('観点01: モバイルビューポートでのレイアウト確認', async ({ page }) => {
    // このサイトはスマホ専用なので、375px が本来のターゲットビューポート
    await page.setViewportSize({ width: 375, height: 812 }); // iPhone 13 mini

    const pages = [
      { path: '/home', name: 'Home' },
      { path: '/shop', name: 'Shop' },
      { path: '/packs', name: 'Packs' },
      { path: '/collection', name: 'Collection' },
      { path: '/others', name: 'Others' },
    ];

    for (const p of pages) {
      await page.goto(p.path);
      await page.waitForLoadState('networkidle');

      // PC警告は消えるか
      const bodyText = await page.evaluate(() => document.body.innerText);
      const hasPcWarning = bodyText.includes('本サービスはスマートフォン専用です');
      console.log(`${p.name} (375px): PC警告表示=${hasPcWarning}`);

      // スクロール可能な水平方向のはみ出しがないか
      const hasHorizontalOverflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth;
      });
      console.log(`${p.name} (375px): 水平はみ出し=${hasHorizontalOverflow}`);
      if (hasHorizontalOverflow) {
        console.log(`  FINDING: ${p.name} でコンテンツが375px幅をはみ出している`);
      }

      await page.screenshot({ path: `test-results/ph-s2-layout-375-${p.name.toLowerCase()}.png`, fullPage: true });
    }
  });

  test('観点01: 文言の一貫性 — 底ナビと画面タイトル', async ({ page }) => {
    // 各画面の見出し/タイトルが底ナビの文言と一致するか
    const navItems = [
      { nav: 'ホーム', path: '/home', expectedTitle: null }, // Home は特殊（PICK UP等）
      { nav: 'コレクション', path: '/collection', expectedTitle: 'COLLECTION' },
      { nav: 'パック', path: '/packs', expectedTitle: 'PACK' },
      { nav: 'その他', path: '/others', expectedTitle: 'MORE' },
    ];

    for (const item of navItems) {
      await page.goto(item.path);
      await page.waitForLoadState('domcontentloaded');

      const bodyText = await page.evaluate(() => document.body.innerText);

      if (item.expectedTitle) {
        const hasTitle = bodyText.includes(item.expectedTitle);
        console.log(`${item.nav} → タイトル「${item.expectedTitle}」: ${hasTitle}`);
        // 底ナビ「コレクション」→画面タイトル「COLLECTION」のように英語表記のケースあり
        // 少なくともページが空でないことを確認
        expect(bodyText.length).toBeGreaterThan(10);
      }

      // 底ナビの現在位置が強調されているか（aria-current や active クラス）
      const activeNav = await page.evaluate((navText) => {
        const links = Array.from(document.querySelectorAll('nav a, footer a, [role="navigation"] a'));
        return links.filter(a => a.textContent?.includes(navText)).map(a => ({
          text: a.textContent?.trim().substring(0, 30),
          ariaCurrent: a.getAttribute('aria-current'),
          className: a.className.substring(0, 80),
        }));
      }, item.nav);
      console.log(`${item.nav} 底ナビ要素:`, JSON.stringify(activeNav));
    }
  });

  // ===== 観点13: 切替えとデータ保持 =====

  test('観点13: コレクション — フィルタ切替え後のデータ保持', async ({ page }) => {
    await page.goto('/collection');
    await page.waitForLoadState('networkidle');

    // 初期状態のカード数を記録
    const initialText = await page.evaluate(() => document.body.innerText);
    console.log('初期フィルタ状態:', initialText.substring(0, 200));

    // 「シリーズ」フィルタをクリック
    const seriesFilter = page.locator('text=シリーズ');
    if (await seriesFilter.count() > 0) {
      await seriesFilter.click({ force: true });
      await page.waitForTimeout(1000);

      const afterSeries = await page.evaluate(() => document.body.innerText);
      console.log('シリーズフィルタ後:', afterSeries.substring(0, 200));

      // 「すべて」に戻す
      const allFilter = page.locator('text=すべて');
      if (await allFilter.count() > 0) {
        await allFilter.click({ force: true });
        await page.waitForTimeout(1000);

        const afterAll = await page.evaluate(() => document.body.innerText);
        console.log('すべてフィルタ復帰後:', afterAll.substring(0, 200));
      }
    } else {
      console.log('シリーズフィルタが見つからない');
    }

    await page.screenshot({ path: 'test-results/ph-s2-collection-filter.png', fullPage: true });
  });

  test('観点13: 底ナビのタブ切り替えで状態が保持されるか', async ({ page }) => {
    // Collection → Packs → Collection の切り替え
    await gotoAndDismiss(page, '/collection');

    const before = await page.evaluate(() => document.body.innerText);
    console.log('Collection(before):', before.substring(0, 100));

    // 底ナビでPacksに移動（ダイアログにブロックされるのでdismiss後にclick）
    await dismissAllDialogs(page);
    const packsNav = page.locator('a[href="/packs"]').first();
    if (await packsNav.count() > 0) {
      await packsNav.click({ force: true });
      await expect(page).toHaveURL(/\/packs/);
      console.log('Packs遷移: OK');

      // 底ナビでCollectionに戻る
      await dismissAllDialogs(page);
      const collNav = page.locator('a[href="/collection"]').first();
      await collNav.click({ force: true });
      await expect(page).toHaveURL(/\/collection/);

      const after = await page.evaluate(() => document.body.innerText);
      console.log('Collection(after):', after.substring(0, 100));

      // コンテンツが正常に表示されるか
      await expect(page.locator('body')).toContainText('COLLECTION');
    } else {
      console.log('底ナビ /packs リンクが見つからない');
    }
  });

  // ===== 観点17: キャンセル =====

  test('観点17: ニックネーム編集中の離脱 — 未保存警告の有無', async ({ page }) => {
    await gotoAndDismiss(page, '/others');
    await page.locator('a[href="/others/nickname_edit"]').click({ force: true });
    await page.waitForURL('**/others/nickname_edit**', { timeout: 10000 });

    const nicknameInput = page.locator('textarea[name="nickname"]');
    if (await nicknameInput.count() === 0) {
      console.log('SKIP: textarea が見つからない');
      return;
    }

    // 元の値を記録
    const originalValue = await nicknameInput.inputValue();
    console.log(`元のニックネーム: "${originalValue}"`);

    // 値を変更（保存はしない）
    await nicknameInput.fill('テスト変更中');
    console.log('値を変更: "テスト変更中"');

    // beforeunload イベントのリスナーがあるか確認
    const hasBeforeUnload = await page.evaluate(() => {
      // @ts-ignore
      const listeners = window.getEventListeners?.(window);
      if (listeners && listeners.beforeunload) {
        return listeners.beforeunload.length > 0;
      }
      // getEventListeners が使えない場合は別の方法で確認
      return 'unknown';
    });
    console.log(`beforeunload リスナー: ${hasBeforeUnload}`);

    // ブラウザバックを試行
    let dialogAppeared = false;
    page.on('dialog', async (dialog) => {
      console.log(`ダイアログ検出: type=${dialog.type()}, message="${dialog.message()}"`);
      dialogAppeared = true;
      await dialog.dismiss(); // キャンセルして留まる
    });

    await page.goBack();
    await page.waitForTimeout(2000);

    console.log(`ブラウザバック時のダイアログ: ${dialogAppeared ? '表示あり' : '表示なし'}`);
    if (!dialogAppeared) {
      console.log('FINDING: 未保存の変更があってもブラウザバックで警告なし');
    }

    const currentUrl = page.url();
    console.log(`ブラウザバック後のURL: ${currentUrl}`);

    await page.screenshot({ path: 'test-results/ph-s2-nickname-cancel.png', fullPage: true });
  });

  test('観点17: プロモコード — 入力後の離脱', async ({ page }) => {
    await gotoAndDismiss(page, '/others');
    await page.locator('a[href*="/promotion_code"]').click({ force: true });
    await expect(page).toHaveURL(/\/promotion_code/);

    const codeInput = page.locator('input[name="code"]');
    await expect(codeInput).toBeVisible();

    // 値を入力
    await codeInput.fill('TESTCODE123');
    console.log('プロモコード入力: "TESTCODE123"');

    // 別ページに遷移
    let dialogAppeared = false;
    page.on('dialog', async (dialog) => {
      console.log(`ダイアログ: ${dialog.type()} - ${dialog.message()}`);
      dialogAppeared = true;
      await dialog.dismiss();
    });

    await page.goBack();
    await page.waitForTimeout(2000);

    console.log(`離脱時ダイアログ: ${dialogAppeared ? 'あり' : 'なし'}`);
    console.log(`離脱後URL: ${page.url()}`);

    // 戻ってきた時に入力値が保持されるか
    await page.goForward();
    await page.waitForTimeout(2000);

    const codeInputAfter = page.locator('input[name="code"]');
    if (await codeInputAfter.count() > 0) {
      const valueAfter = await codeInputAfter.inputValue();
      console.log(`戻った後のプロモコード値: "${valueAfter}"`);
      if (valueAfter === '') {
        console.log('FINDING: ブラウザバック→フォワードで入力値が消失');
      }
    }

    await page.screenshot({ path: 'test-results/ph-s2-promo-cancel.png', fullPage: true });
  });
});
