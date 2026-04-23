/**
 * Session #3: サイト全体スナップショット（浅く広く）
 *
 * 目的:
 * - plans.html のプラン一覧の構造を把握
 * - サイト全体のナビゲーション・リンク整合性を確認
 * - ログイン画面の存在と構造を確認
 * - 各ページのDOM構造・アクセシブルネームを記録
 */
import { test, expect } from '@playwright/test';

const BASE = 'https://hotel-example-site.takeyaqa.dev/ja';

test.describe('Session #3: サイト全体スナップショット', () => {

  test('plans.html - プラン一覧ページの構造把握', async ({ page }) => {
    await page.goto(`${BASE}/plans.html`);
    await page.waitForLoadState('networkidle');

    // ページタイトル
    const title = await page.title();
    console.log('[plans.html] title:', title);

    // ナビゲーション要素
    const navLinks = await page.locator('nav a, header a, .navbar a').all();
    console.log('[plans.html] nav/header links:');
    for (const link of navLinks) {
      const text = await link.textContent();
      const href = await link.getAttribute('href');
      console.log(`  "${text?.trim()}" -> ${href}`);
    }

    // プラン一覧のカード/リスト
    const planCards = await page.locator('.card, .plan-card, [class*="plan"], .col-lg-4, .col-12').all();
    console.log(`[plans.html] plan-like elements: ${planCards.length}`);
    for (let i = 0; i < Math.min(planCards.length, 20); i++) {
      const text = (await planCards[i].textContent())?.trim().substring(0, 100);
      console.log(`  card[${i}]: "${text}"`);
    }

    // 全リンク一覧
    const allLinks = await page.locator('a[href]').all();
    console.log(`[plans.html] all links (${allLinks.length}):`);
    for (const link of allLinks) {
      const href = await link.getAttribute('href');
      const text = (await link.textContent())?.trim().substring(0, 60);
      console.log(`  "${text}" -> ${href}`);
    }

    // ログインリンクの存在確認
    const loginLink = page.locator('a:has-text("ログイン"), a:has-text("Login"), a[href*="login"], a[href*="mypage"]');
    const loginCount = await loginLink.count();
    console.log(`[plans.html] login-related links: ${loginCount}`);
    if (loginCount > 0) {
      for (let i = 0; i < loginCount; i++) {
        const href = await loginLink.nth(i).getAttribute('href');
        const text = await loginLink.nth(i).textContent();
        console.log(`  login link: "${text?.trim()}" -> ${href}`);
      }
    }

    // 会員限定プランの有無
    const memberOnly = page.locator(':has-text("会員限定"), :has-text("プレミアム"), :has-text("member"), :has-text("ログイン")');
    const memberOnlyCount = await memberOnly.count();
    console.log(`[plans.html] member-related text elements: ${memberOnlyCount}`);

    // スクリーンショット
    await page.screenshot({ path: 'reports/hotel-example-site-takeyaqa-dev/screenshots/plans-page-full.png', fullPage: true });
  });

  test('トップページの構造把握', async ({ page }) => {
    await page.goto(`${BASE}/index.html`);
    await page.waitForLoadState('networkidle');

    const title = await page.title();
    console.log('[index.html] title:', title);

    const allLinks = await page.locator('a[href]').all();
    console.log(`[index.html] all links (${allLinks.length}):`);
    for (const link of allLinks) {
      const href = await link.getAttribute('href');
      const text = (await link.textContent())?.trim().substring(0, 60);
      console.log(`  "${text}" -> ${href}`);
    }

    await page.screenshot({ path: 'reports/hotel-example-site-takeyaqa-dev/screenshots/index-page.png', fullPage: true });
  });

  test('ログインページの構造把握', async ({ page }) => {
    // まずログインページの存在を確認
    await page.goto(`${BASE}/login.html`);
    const status1 = page.url();
    console.log('[login.html] navigated to:', status1);

    if (status1.includes('login')) {
      const title = await page.title();
      console.log('[login.html] title:', title);

      // フォーム要素
      const inputs = await page.locator('input').all();
      console.log(`[login.html] input fields: ${inputs.length}`);
      for (const input of inputs) {
        const type = await input.getAttribute('type');
        const name = await input.getAttribute('name');
        const id = await input.getAttribute('id');
        const placeholder = await input.getAttribute('placeholder');
        console.log(`  input: type="${type}" name="${name}" id="${id}" placeholder="${placeholder}"`);
      }

      // ボタン
      const buttons = await page.locator('button, input[type="submit"]').all();
      for (const btn of buttons) {
        const text = (await btn.textContent())?.trim();
        console.log(`  button: "${text}"`);
      }

      await page.screenshot({ path: 'reports/hotel-example-site-takeyaqa-dev/screenshots/login-page.png', fullPage: true });
    }

    // signup.html も確認
    await page.goto(`${BASE}/signup.html`);
    const status2 = page.url();
    console.log('[signup.html] navigated to:', status2);
    if (status2.includes('signup')) {
      const signupInputs = await page.locator('input').all();
      console.log(`[signup.html] input fields: ${signupInputs.length}`);
      for (const input of signupInputs) {
        const type = await input.getAttribute('type');
        const name = await input.getAttribute('name');
        const id = await input.getAttribute('id');
        console.log(`  input: type="${type}" name="${name}" id="${id}"`);
      }
      await page.screenshot({ path: 'reports/hotel-example-site-takeyaqa-dev/screenshots/signup-page.png', fullPage: true });
    }
  });

  test('マイページの構造把握', async ({ page }) => {
    await page.goto(`${BASE}/mypage.html`);
    const url = page.url();
    console.log('[mypage.html] navigated to:', url);

    const title = await page.title();
    console.log('[mypage.html] title:', title);

    // マイページの要素
    const headings = await page.locator('h1, h2, h3').all();
    for (const h of headings) {
      const text = (await h.textContent())?.trim();
      console.log(`  heading: "${text}"`);
    }

    const allLinks = await page.locator('a[href]').all();
    console.log(`[mypage.html] all links (${allLinks.length}):`);
    for (const link of allLinks) {
      const href = await link.getAttribute('href');
      const text = (await link.textContent())?.trim().substring(0, 60);
      console.log(`  "${text}" -> ${href}`);
    }

    await page.screenshot({ path: 'reports/hotel-example-site-takeyaqa-dev/screenshots/mypage.png', fullPage: true });
  });

  test('サイトマップ的リンク巡回 - 404チェック', async ({ page }) => {
    // 主要ページ一覧
    const pages = [
      `${BASE}/index.html`,
      `${BASE}/plans.html`,
      `${BASE}/login.html`,
      `${BASE}/signup.html`,
      `${BASE}/mypage.html`,
      'https://hotel-example-site.takeyaqa.dev/ja/',
      'https://hotel-example-site.takeyaqa.dev/',
      'https://hotel-example-site.takeyaqa.dev/ja/not-exist-page.html',
    ];

    for (const url of pages) {
      const response = await page.goto(url);
      const status = response?.status() ?? 'no response';
      const finalUrl = page.url();
      console.log(`[${status}] ${url} -> ${finalUrl}`);
    }
  });

  test('plans.html - 各プランの「このプランで予約」リンク先確認', async ({ page }) => {
    await page.goto(`${BASE}/plans.html`);
    await page.waitForLoadState('networkidle');

    // 予約リンクを全取得
    const reserveLinks = await page.locator('a[href*="reserve"], a:has-text("予約"), a:has-text("このプランで予約")').all();
    console.log(`[plans.html] reserve links: ${reserveLinks.length}`);

    for (let i = 0; i < reserveLinks.length; i++) {
      const href = await reserveLinks[i].getAttribute('href');
      const text = (await reserveLinks[i].textContent())?.trim().substring(0, 80);
      const isVisible = await reserveLinks[i].isVisible();
      console.log(`  [${i}] visible=${isVisible} "${text}" -> ${href}`);
    }

    // 会員限定プランの特定（非表示またはdisabledなリンク）
    const disabledElements = await page.locator('[disabled], .disabled, [aria-disabled="true"]').all();
    console.log(`[plans.html] disabled elements: ${disabledElements.length}`);
    for (const el of disabledElements) {
      const text = (await el.textContent())?.trim().substring(0, 80);
      console.log(`  disabled: "${text}"`);
    }
  });
});
