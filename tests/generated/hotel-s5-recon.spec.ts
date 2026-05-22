import { test, expect } from '@playwright/test';

const BASE = 'https://hotel-example-site.takeyaqa.dev/ja';

test.describe('Session 5: 初期偵察', () => {

  test('プラン一覧ページのDOM構造を取得', async ({ page }) => {
    await page.goto(`${BASE}/plans.html`);
    await page.waitForLoadState('networkidle');

    // ページタイトル
    const title = await page.title();
    console.log(`[RECON] Title: ${title}`);

    // プラン一覧のカード構造
    const plans = page.locator('.card');
    const planCount = await plans.count();
    console.log(`[RECON] プラン数: ${planCount}`);

    for (let i = 0; i < planCount; i++) {
      const card = plans.nth(i);
      const heading = await card.locator('.card-title').textContent();
      const link = await card.locator('a').getAttribute('href');
      console.log(`[RECON] Plan ${i}: "${heading?.trim()}" -> ${link}`);
    }

    expect(planCount).toBeGreaterThan(0);
  });

  test('予約フォーム(plan-id=0)のフォーム構造を取得', async ({ page }) => {
    // plan-id=0 を直接開く
    await page.goto(`${BASE}/reserve.html?plan-id=0`);
    await page.waitForLoadState('networkidle');

    const title = await page.title();
    console.log(`[RECON] Reserve page title: ${title}`);

    // フォーム内のすべてのinput/select/textarea
    const inputs = page.locator('input, select, textarea');
    const count = await inputs.count();
    console.log(`[RECON] フォーム要素数: ${count}`);

    for (let i = 0; i < count; i++) {
      const el = inputs.nth(i);
      const tag = await el.evaluate(e => e.tagName);
      const type = await el.getAttribute('type') || '';
      const name = await el.getAttribute('name') || '';
      const id = await el.getAttribute('id') || '';
      const required = await el.getAttribute('required');
      const min = await el.getAttribute('min') || '';
      const max = await el.getAttribute('max') || '';
      const maxlength = await el.getAttribute('maxlength') || '';
      const value = await el.inputValue().catch(() => '');
      const placeholder = await el.getAttribute('placeholder') || '';
      console.log(`[RECON] ${tag} type=${type} name=${name} id=${id} required=${required} min=${min} max=${max} maxlength=${maxlength} value="${value}" placeholder="${placeholder}"`);
    }

    // ラベル一覧
    const labels = page.locator('label');
    const labelCount = await labels.count();
    for (let i = 0; i < labelCount; i++) {
      const text = await labels.nth(i).textContent();
      const forAttr = await labels.nth(i).getAttribute('for');
      console.log(`[RECON] Label: "${text?.trim()}" for=${forAttr}`);
    }

    // ボタン一覧
    const buttons = page.locator('button');
    const btnCount = await buttons.count();
    for (let i = 0; i < btnCount; i++) {
      const text = await buttons.nth(i).textContent();
      const type = await buttons.nth(i).getAttribute('type');
      console.log(`[RECON] Button: "${text?.trim()}" type=${type}`);
    }

    // ラジオボタン・チェックボックスのグループ
    const radios = page.locator('input[type="radio"]');
    const radioCount = await radios.count();
    for (let i = 0; i < radioCount; i++) {
      const name = await radios.nth(i).getAttribute('name');
      const value = await radios.nth(i).getAttribute('value');
      const checked = await radios.nth(i).isChecked();
      console.log(`[RECON] Radio: name=${name} value=${value} checked=${checked}`);
    }

    const checkboxes = page.locator('input[type="checkbox"]');
    const cbCount = await checkboxes.count();
    for (let i = 0; i < cbCount; i++) {
      const name = await checkboxes.nth(i).getAttribute('name');
      const id = await checkboxes.nth(i).getAttribute('id');
      const checked = await checkboxes.nth(i).isChecked();
      console.log(`[RECON] Checkbox: name=${name} id=${id} checked=${checked}`);
    }

    // select の option
    const selects = page.locator('select');
    const selCount = await selects.count();
    for (let i = 0; i < selCount; i++) {
      const id = await selects.nth(i).getAttribute('id');
      const options = selects.nth(i).locator('option');
      const optCount = await options.count();
      const optTexts: string[] = [];
      for (let j = 0; j < optCount; j++) {
        optTexts.push(await options.nth(j).textContent() || '');
      }
      console.log(`[RECON] Select id=${id}: [${optTexts.join(', ')}]`);
    }

    // 確認ボタンの存在
    const submitBtn = page.locator('button[type="submit"], input[type="submit"]');
    const submitCount = await submitBtn.count();
    console.log(`[RECON] Submit buttons: ${submitCount}`);
  });

  test('予約フォームの確認画面・完了画面フロー確認', async ({ page }) => {
    await page.goto(`${BASE}/reserve.html?plan-id=0`);
    await page.waitForLoadState('networkidle');

    // フォームに正常値を入力
    const dateInput = page.locator('#date');
    // 日付入力 — 明後日
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 2);
    const dateStr = `${futureDate.getFullYear()}/${String(futureDate.getMonth() + 1).padStart(2, '0')}/${String(futureDate.getDate()).padStart(2, '0')}`;
    
    // 日付フィールドをクリアして入力
    await dateInput.click();
    await dateInput.fill(dateStr);

    // 宿泊数
    const termInput = page.locator('#term');
    await termInput.fill('1');

    // 人数
    const headCountInput = page.locator('#head-count');
    await headCountInput.fill('1');

    // 氏名（未ログインの場合）
    const nameInput = page.locator('#username');
    if (await nameInput.isVisible()) {
      await nameInput.fill('テスト太郎');
    }

    // 連絡方法
    const contactSelect = page.locator('#contact');
    if (await contactSelect.isVisible()) {
      await contactSelect.selectOption('no');
    }

    // 確認ページへボタン
    const confirmBtn = page.getByRole('button', { name: /確認/ });
    if (await confirmBtn.count() > 0) {
      await confirmBtn.click();
      await page.waitForLoadState('networkidle');
      console.log(`[RECON] 確認画面 URL: ${page.url()}`);
      console.log(`[RECON] 確認画面 content: ${await page.locator('.container, main, #content, body').first().textContent()}`);
    }

    // 完了ボタン
    const completeBtn = page.getByRole('button', { name: /予約|確定|送信|complete/i });
    if (await completeBtn.count() > 0) {
      await completeBtn.click();
      await page.waitForLoadState('networkidle');
      console.log(`[RECON] 完了画面 URL: ${page.url()}`);
    }
  });
});
