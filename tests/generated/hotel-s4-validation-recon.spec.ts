import { test, expect } from '@playwright/test';

const BASE = 'https://hotel-example-site.takeyaqa.dev/ja';

/**
 * Session #4 — 予約フォームバリデーション偵察
 * 目的: 各プランの予約フォームDOM構造を把握し、
 *       プランごとのフォーム差異を確認する
 */
test.describe('S4: 予約フォーム偵察 (バリデーション属性)', () => {

  // plan-id=0: 未ログインでアクセス可能な最初のプラン
  test('plan-id=0 フォームの全入力要素とバリデーション属性', async ({ page }) => {
    await page.goto(`${BASE}/reserve.html?plan-id=0`);
    await page.waitForLoadState('networkidle');
    console.log('=== plan-id=0 予約フォーム ===');
    console.log('URL:', page.url());
    console.log('Title:', await page.title());

    // プラン名
    const planName = await page.locator('h2, h3, .plan-name, [id*="plan"]').first().textContent();
    console.log('Plan Name:', planName?.trim());

    // 全入力要素のバリデーション属性を網羅的に取得
    const inputs = await page.locator('input, select, textarea').all();
    console.log(`\n入力要素数: ${inputs.length}`);
    for (const input of inputs) {
      const attrs = await input.evaluate(el => {
        const a: Record<string, string | null> = {};
        for (const attr of el.attributes) {
          a[attr.name] = attr.value;
        }
        return a;
      });
      console.log(`  [${attrs['id'] || attrs['name'] || '?'}]`, JSON.stringify(attrs));
    }

    // ラベル一覧
    const labels = await page.locator('label').all();
    console.log(`\nラベル数: ${labels.length}`);
    for (const label of labels) {
      const text = await label.textContent();
      const forAttr = await label.getAttribute('for');
      console.log(`  label[for=${forAttr}]: "${text?.trim()}"`);
    }

    // 連絡方法セレクト選択肢
    const contactSelect = page.locator('select#contact');
    if (await contactSelect.count() > 0) {
      const options = await contactSelect.locator('option').all();
      console.log('\n連絡方法の選択肢:');
      for (const opt of options) {
        const val = await opt.getAttribute('value');
        const text = await opt.textContent();
        console.log(`  value="${val}" text="${text?.trim()}"`);
      }
    }

    await page.screenshot({ path: 'test-results/s4-plan0-form.png', fullPage: true });
  });

  // plan-id=7: プレミアムツインなど別プラン
  test('plan-id=7 フォーム構成差異チェック', async ({ page }) => {
    await page.goto(`${BASE}/reserve.html?plan-id=7`);
    await page.waitForLoadState('networkidle');
    console.log('=== plan-id=7 予約フォーム ===');

    const planName = await page.locator('h2, h3, .plan-name, [id*="plan"]').first().textContent();
    console.log('Plan Name:', planName?.trim());

    const inputs = await page.locator('input, select, textarea').all();
    console.log(`入力要素数: ${inputs.length}`);
    for (const input of inputs) {
      const attrs = await input.evaluate(el => {
        const a: Record<string, string | null> = {};
        for (const attr of el.attributes) {
          a[attr.name] = attr.value;
        }
        return a;
      });
      console.log(`  [${attrs['id'] || attrs['name'] || '?'}]`, JSON.stringify(attrs));
    }

    await page.screenshot({ path: 'test-results/s4-plan7-form.png', fullPage: true });
  });

  // 会員限定プランの偵察 — ログイン済み状態が必要
  test('plan-id=1 (会員限定) フォーム構成', async ({ page }) => {
    // storageState で認証済みの想定
    await page.goto(`${BASE}/reserve.html?plan-id=1`);
    await page.waitForLoadState('networkidle');
    console.log('=== plan-id=1 会員限定プラン ===');
    console.log('URL:', page.url());

    const planName = await page.locator('h2, h3, .plan-name, [id*="plan"]').first().textContent();
    console.log('Plan Name:', planName?.trim());

    // フォーム要素
    const inputs = await page.locator('input, select, textarea').all();
    console.log(`入力要素数: ${inputs.length}`);
    for (const input of inputs) {
      const attrs = await input.evaluate(el => {
        const a: Record<string, string | null> = {};
        for (const attr of el.attributes) {
          a[attr.name] = attr.value;
        }
        return a;
      });
      console.log(`  [${attrs['id'] || attrs['name'] || '?'}]`, JSON.stringify(attrs));
    }

    // 追加プランのチェックボックス
    const checkboxes = await page.locator('input[type="checkbox"]').all();
    console.log(`\nチェックボックス数: ${checkboxes.length}`);
    for (const cb of checkboxes) {
      const id = await cb.getAttribute('id');
      const name = await cb.getAttribute('name');
      const label = page.locator(`label[for="${id}"]`);
      const labelText = await label.count() > 0 ? await label.textContent() : '(no label)';
      console.log(`  checkbox: id=${id} name=${name} label="${labelText?.trim()}"`);
    }

    await page.screenshot({ path: 'test-results/s4-plan1-member-form.png', fullPage: true });
  });

  // 会員限定プラン plan-id=2
  test('plan-id=2 (会員限定) フォーム構成', async ({ page }) => {
    await page.goto(`${BASE}/reserve.html?plan-id=2`);
    await page.waitForLoadState('networkidle');
    console.log('=== plan-id=2 会員限定プラン ===');

    const planName = await page.locator('h2, h3, .plan-name, [id*="plan"]').first().textContent();
    console.log('Plan Name:', planName?.trim());

    const inputs = await page.locator('input, select, textarea').all();
    console.log(`入力要素数: ${inputs.length}`);
    for (const input of inputs) {
      const attrs = await input.evaluate(el => {
        const a: Record<string, string | null> = {};
        for (const attr of el.attributes) {
          a[attr.name] = attr.value;
        }
        return a;
      });
      console.log(`  [${attrs['id'] || attrs['name'] || '?'}]`, JSON.stringify(attrs));
    }

    await page.screenshot({ path: 'test-results/s4-plan2-member-form.png', fullPage: true });
  });
});
