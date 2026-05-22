import { test, expect } from '@playwright/test';

const BASE = 'https://hotel-example-site.takeyaqa.dev/ja';

test.use({ storageState: undefined }); // このテストは未認証状態から開始

test.describe('Session3: ログイン＋予約フォーム構造スナップショット', () => {

  test('マイページログインとプラン一覧の構造把握', async ({ page }) => {
    // --- Step 1: マイページへログイン ---
    await page.goto(`${BASE}/index.html`);
    await page.waitForLoadState('networkidle');
    console.log('=== トップページ ===');
    console.log('URL:', page.url());

    // ナビゲーションリンクを列挙
    const navLinks = await page.locator('nav a, header a').all();
    for (const link of navLinks) {
      const text = await link.textContent();
      const href = await link.getAttribute('href');
      console.log(`Nav: [${text?.trim()}] -> ${href}`);
    }

    // マイページ or ログインリンクを探す
    const loginLink = page.getByRole('link', { name: /マイページ|ログイン|会員|login/i });
    const loginLinkCount = await loginLink.count();
    console.log(`\nログイン系リンク数: ${loginLinkCount}`);
    if (loginLinkCount > 0) {
      for (let i = 0; i < loginLinkCount; i++) {
        const text = await loginLink.nth(i).textContent();
        const href = await loginLink.nth(i).getAttribute('href');
        console.log(`  [${text?.trim()}] -> ${href}`);
      }
      await loginLink.first().click();
      await page.waitForLoadState('networkidle');
      console.log('\n=== ログインページ ===');
      console.log('URL:', page.url());

      // ログインフォーム構造
      const inputs = await page.locator('input, select, textarea, button').all();
      for (const el of inputs) {
        const tag = await el.evaluate(e => e.tagName);
        const type = await el.getAttribute('type');
        const name = await el.getAttribute('name');
        const id = await el.getAttribute('id');
        const placeholder = await el.getAttribute('placeholder');
        const role = await el.evaluate(e => e.getAttribute('role'));
        console.log(`  ${tag} type=${type} name=${name} id=${id} placeholder=${placeholder} role=${role}`);
      }

      // 電話番号でログイン
      const phoneInput = page.locator('input[type="tel"], input[name*="phone"], input[name*="tel"], input[id*="phone"], input[id*="tel"]');
      const emailInput = page.locator('input[type="email"], input[name*="email"], input[id*="email"]');
      const phoneCount = await phoneInput.count();
      const emailCount = await emailInput.count();
      console.log(`\n電話番号入力: ${phoneCount}件, Email入力: ${emailCount}件`);

      if (phoneCount > 0) {
        await phoneInput.first().fill('09055555555');
      } else if (emailCount > 0) {
        // メールアドレスフィールドに電話番号を入れる可能性
        console.log('電話番号フィールドなし。Emailフィールドを確認');
      }

      // 全input/selectのスナップ
      await page.screenshot({ path: 'test-results/s3-login-page.png', fullPage: true });

      // ログインボタンを探して押す
      const loginBtn = page.getByRole('button', { name: /ログイン|送信|login|submit/i });
      const loginBtnCount = await loginBtn.count();
      console.log(`ログインボタン: ${loginBtnCount}件`);
      if (loginBtnCount > 0) {
        await loginBtn.first().click();
        await page.waitForLoadState('networkidle');
        console.log('ログインボタン押下後URL:', page.url());
        await page.screenshot({ path: 'test-results/s3-after-login-click.png', fullPage: true });

        // 認証コード入力画面かチェック
        const codeInput = page.locator('input[type="number"], input[name*="code"], input[id*="code"], input[name*="token"]');
        const codeCount = await codeInput.count();
        console.log(`認証コード入力: ${codeCount}件`);
        if (codeCount > 0) {
          await codeInput.first().fill('99999');
          const verifyBtn = page.getByRole('button', { name: /認証|確認|verify|submit/i });
          if (await verifyBtn.count() > 0) {
            await verifyBtn.first().click();
            await page.waitForLoadState('networkidle');
          }
        }
        console.log('ログイン後URL:', page.url());
        await page.screenshot({ path: 'test-results/s3-after-login.png', fullPage: true });
      }
    }

    // --- Step 2: プラン一覧 ---
    await page.goto(`${BASE}/plans.html`);
    await page.waitForLoadState('networkidle');
    console.log('\n=== プラン一覧ページ ===');
    console.log('URL:', page.url());

    // プラン一覧構造
    const planCards = page.locator('.card, [class*="plan"], [class*="Plan"], article, .col');
    const planCount = await planCards.count();
    console.log(`プランカード数: ${planCount}`);
    for (let i = 0; i < Math.min(planCount, 10); i++) {
      const text = await planCards.nth(i).textContent();
      console.log(`  Plan ${i}: ${text?.trim().substring(0, 100)}`);
    }

    // 各プランのリンク
    const planLinks = page.locator('a[href*="reserve"], a[href*="Reserve"], a[href*="booking"]');
    const planLinkCount = await planLinks.count();
    console.log(`\n予約リンク数: ${planLinkCount}`);
    for (let i = 0; i < Math.min(planLinkCount, 10); i++) {
      const text = await planLinks.nth(i).textContent();
      const href = await planLinks.nth(i).getAttribute('href');
      console.log(`  [${text?.trim()}] -> ${href}`);
    }

    // プランタイトルのあるカード内のボタン/リンクを探す
    const allLinks = await page.locator('.card a, article a, .col a, a.btn').all();
    console.log(`\n全カードリンク数: ${allLinks.length}`);
    for (const link of allLinks.slice(0, 15)) {
      const text = await link.textContent();
      const href = await link.getAttribute('href');
      console.log(`  [${text?.trim()}] -> ${href}`);
    }

    await page.screenshot({ path: 'test-results/s3-plans-page.png', fullPage: true });

    // --- Step 3: 最初のプランを選んで予約フォームへ ---
    const firstPlanLink = page.locator('.card a, article a, .col a, a.btn').first();
    if (await firstPlanLink.count() > 0) {
      const [newPage] = await Promise.all([
        page.context().waitForEvent('page'),
        firstPlanLink.click()
      ]).catch(() => [null]);

      const targetPage = newPage || page;
      await targetPage.waitForLoadState('networkidle');
      console.log('\n=== 予約フォームページ ===');
      console.log('URL:', targetPage.url());

      // フォーム全要素のスナップショット
      const formElements = await targetPage.locator('input, select, textarea, button, [role="checkbox"], [role="radio"]').all();
      console.log(`\nフォーム要素数: ${formElements.length}`);
      for (const el of formElements) {
        const tag = await el.evaluate(e => e.tagName);
        const type = await el.getAttribute('type');
        const name = await el.getAttribute('name');
        const id = await el.getAttribute('id');
        const value = await el.inputValue().catch(() => '');
        const required = await el.getAttribute('required');
        const min = await el.getAttribute('min');
        const max = await el.getAttribute('max');
        const maxlength = await el.getAttribute('maxlength');
        const pattern = await el.getAttribute('pattern');
        const placeholder = await el.getAttribute('placeholder');
        const checked = await el.isChecked().catch(() => null);
        const options = [];
        if (tag === 'SELECT') {
          const opts = await el.locator('option').all();
          for (const opt of opts) {
            options.push(`${await opt.getAttribute('value')}:${await opt.textContent()}`);
          }
        }
        console.log(`  ${tag} type=${type} name=${name} id=${id} val="${value}" req=${required} min=${min} max=${max} maxlen=${maxlength} pattern=${pattern} placeholder=${placeholder} checked=${checked} ${options.length ? 'opts=[' + options.join(', ') + ']' : ''}`);
      }

      // ラベルの列挙
      const labels = await targetPage.locator('label').all();
      console.log(`\nラベル数: ${labels.length}`);
      for (const label of labels) {
        const text = await label.textContent();
        const forAttr = await label.getAttribute('for');
        console.log(`  label for=${forAttr}: ${text?.trim().substring(0, 80)}`);
      }

      // 「上映予定あり」関連の探索
      const screeningText = await targetPage.locator('text=上映予定').count();
      console.log(`\n「上映予定」テキスト: ${screeningText}件`);
      if (screeningText > 0) {
        const screeningEl = targetPage.locator(':has-text("上映予定")');
        const screeningCount = await screeningEl.count();
        for (let i = 0; i < Math.min(screeningCount, 5); i++) {
          const tag = await screeningEl.nth(i).evaluate(e => e.tagName);
          const text = await screeningEl.nth(i).textContent();
          console.log(`  上映予定要素 ${i}: ${tag} - ${text?.trim().substring(0, 100)}`);
        }
      }

      // クレジットカード関連の探索
      const creditText = await targetPage.locator('text=クレジット').count();
      const cardText = await targetPage.locator('text=カード').count();
      console.log(`「クレジット」テキスト: ${creditText}件, 「カード」テキスト: ${cardText}件`);

      await targetPage.screenshot({ path: 'test-results/s3-reserve-form.png', fullPage: true });

      // ページを閉じない（後のテストで再利用する可能性）
    }
  });
});
