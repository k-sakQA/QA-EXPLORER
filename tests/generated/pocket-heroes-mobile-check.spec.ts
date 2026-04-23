import { test, expect, devices } from '@playwright/test';

/**
 * モバイルUA でアクセスして認証が通るか確認
 */
test.use({
  ...devices['iPhone 14'],
});

test('モバイルUA で /home にアクセス', async ({ page }) => {
  const response = await page.goto('/home');
  console.log('=== Response ===');
  console.log('Status:', response?.status());
  console.log('URL:', page.url());
  await page.waitForLoadState('networkidle');

  const finalUrl = page.url();
  console.log('Final URL:', finalUrl);

  const title = await page.title();
  console.log('Title:', title);

  const bodyText = await page.evaluate(() => document.body.innerText.substring(0, 3000));
  console.log('=== Body Text ===');
  console.log(bodyText);

  // リンク一覧
  const links = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('a[href]')).map(a => ({
      text: (a as HTMLAnchorElement).innerText.trim().substring(0, 80),
      href: (a as HTMLAnchorElement).href,
    }));
  });
  console.log('=== Links ===');
  for (const l of links) {
    console.log(`  [${l.text}] -> ${l.href}`);
  }

  // ボタン
  const buttons = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('button, [role="button"]')).map(b => ({
      text: (b as HTMLElement).innerText?.trim().substring(0, 80) || '',
      tag: b.tagName,
    }));
  });
  console.log('=== Buttons ===');
  for (const b of buttons) {
    console.log(`  [${b.text}] (${b.tag})`);
  }

  // フォーム
  const forms = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('form')).map(f => ({
      action: f.action,
      method: f.method,
      inputs: Array.from(f.querySelectorAll('input, select, textarea')).map(i => ({
        name: (i as HTMLInputElement).name || '',
        type: (i as HTMLInputElement).type || i.tagName.toLowerCase(),
      })),
    }));
  });
  console.log('=== Forms ===');
  for (const form of forms) {
    console.log(`  Form: action=${form.action} method=${form.method}`);
    for (const i of form.inputs) {
      console.log(`    - name="${i.name}" type="${i.type}"`);
    }
  }

  await page.screenshot({ path: 'test-results/snapshot-home-mobile.png', fullPage: true });
  console.log('Screenshot: test-results/snapshot-home-mobile.png');
});
