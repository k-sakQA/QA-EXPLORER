import { test, expect } from '@playwright/test';

/**
 * 初期スナップショット: development.pocket-heroes.net のサイト構造を把握する
 * - /home ページのDOM構造、ナビゲーション、主要リンクを収集
 * - 主要画面への遷移確認
 */
test.describe('development-pocket-heroes-net: 初期スナップショット', () => {

  test('Home ページの構造を取得', async ({ page }) => {
    await page.goto('/home');
    await page.waitForLoadState('networkidle');

    // ページタイトル
    const title = await page.title();
    console.log('=== Page Title ===');
    console.log(title);

    // URL確認
    console.log('=== Current URL ===');
    console.log(page.url());

    // メインナビゲーション / ヘッダーのリンク一覧
    console.log('=== All Links ===');
    const links = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('a[href]')).map(a => ({
        text: (a as HTMLAnchorElement).innerText.trim().substring(0, 80),
        href: (a as HTMLAnchorElement).href,
      }));
    });
    for (const link of links) {
      console.log(`  [${link.text}] -> ${link.href}`);
    }

    // ボタン一覧
    console.log('=== All Buttons ===');
    const buttons = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('button, [role="button"], input[type="submit"], input[type="button"]')).map(b => ({
        text: (b as HTMLElement).innerText?.trim().substring(0, 80) || (b as HTMLInputElement).value || '',
        type: b.tagName,
        disabled: (b as HTMLButtonElement).disabled,
      }));
    });
    for (const btn of buttons) {
      console.log(`  [${btn.text}] (${btn.type}) disabled=${btn.disabled}`);
    }

    // フォーム一覧
    console.log('=== All Forms ===');
    const forms = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('form')).map(f => ({
        action: f.action,
        method: f.method,
        inputs: Array.from(f.querySelectorAll('input, select, textarea')).map(i => ({
          name: (i as HTMLInputElement).name || '',
          type: (i as HTMLInputElement).type || i.tagName.toLowerCase(),
          placeholder: (i as HTMLInputElement).placeholder || '',
          required: (i as HTMLInputElement).required,
        })),
      }));
    });
    for (const form of forms) {
      console.log(`  Form action=${form.action} method=${form.method}`);
      for (const input of form.inputs) {
        console.log(`    - name="${input.name}" type="${input.type}" placeholder="${input.placeholder}" required=${input.required}`);
      }
    }

    // 見出し構造
    console.log('=== Headings ===');
    const headings = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6')).map(h => ({
        level: h.tagName,
        text: h.textContent?.trim().substring(0, 100) || '',
      }));
    });
    for (const h of headings) {
      console.log(`  ${h.level}: ${h.text}`);
    }

    // 画像
    console.log('=== Images ===');
    const images = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('img')).map(img => ({
        alt: img.alt || '(no alt)',
        src: img.src.substring(0, 120),
      }));
    });
    for (const img of images) {
      console.log(`  alt="${img.alt}" src=${img.src}`);
    }

    // ページ全体のテキスト概要 (最初の3000文字)
    console.log('=== Page Text (first 3000 chars) ===');
    const bodyText = await page.evaluate(() => document.body.innerText.substring(0, 3000));
    console.log(bodyText);

    // スクリーンショット
    await page.screenshot({ path: 'test-results/snapshot-home.png', fullPage: true });
    console.log('=== Screenshot saved to test-results/snapshot-home.png ===');

    expect(title).toBeTruthy();
  });

  test('主要リンク先のページ構造を浅く探索', async ({ page }) => {
    await page.goto('/home');
    await page.waitForLoadState('networkidle');

    // まずリンク一覧を取得
    const links = await page.evaluate(() => {
      const baseHost = location.host;
      return Array.from(document.querySelectorAll('a[href]'))
        .map(a => ({
          text: (a as HTMLAnchorElement).innerText.trim().substring(0, 80),
          href: (a as HTMLAnchorElement).href,
        }))
        .filter(l => {
          try {
            const url = new URL(l.href);
            return url.host === baseHost && !l.href.includes('#');
          } catch { return false; }
        });
    });

    // 重複排除
    const uniqueHrefs = [...new Set(links.map(l => l.href))];
    console.log(`=== Found ${uniqueHrefs.length} unique internal links ===`);

    // 各リンク先を浅く調査 (最大10ページ)
    for (const href of uniqueHrefs.slice(0, 10)) {
      console.log(`\n--- Visiting: ${href} ---`);
      try {
        await page.goto(href);
        await page.waitForLoadState('networkidle');
        const pageTitle = await page.title();
        const pageUrl = page.url();
        console.log(`  Title: ${pageTitle}`);
        console.log(`  URL: ${pageUrl}`);

        // 見出し
        const headings = await page.evaluate(() => {
          return Array.from(document.querySelectorAll('h1, h2, h3')).map(h => ({
            level: h.tagName,
            text: h.textContent?.trim().substring(0, 80) || '',
          }));
        });
        for (const h of headings) {
          console.log(`  ${h.level}: ${h.text}`);
        }

        // フォーム有無
        const formCount = await page.evaluate(() => document.querySelectorAll('form').length);
        if (formCount > 0) {
          console.log(`  *** Forms found: ${formCount} ***`);
          const formDetails = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('form')).map(f => ({
              action: f.action,
              method: f.method,
              inputCount: f.querySelectorAll('input, select, textarea').length,
              inputs: Array.from(f.querySelectorAll('input, select, textarea')).map(i => ({
                name: (i as HTMLInputElement).name || '',
                type: (i as HTMLInputElement).type || i.tagName.toLowerCase(),
                required: (i as HTMLInputElement).required,
              })),
            }));
          });
          for (const form of formDetails) {
            console.log(`    Form: action=${form.action} method=${form.method} fields=${form.inputCount}`);
            for (const input of form.inputs) {
              console.log(`      - name="${input.name}" type="${input.type}" required=${input.required}`);
            }
          }
        }
      } catch (e) {
        console.log(`  Error: ${(e as Error).message.substring(0, 200)}`);
      }
    }
  });
});
