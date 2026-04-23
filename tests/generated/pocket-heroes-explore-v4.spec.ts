import { test, expect } from '@playwright/test';

/**
 * 初期スナップショット v4: load イベントで待機し、リダイレクト前に素早くキャプチャ
 * クライアントサイド認証チェックが走る前に DOM を取得する
 */
test.describe('pocket-heroes: 初期スナップショット v4', () => {

  test('Home ページ構造', async ({ page }) => {
    // クライアントサイドの /signin や /unauthenticated_error へのナビゲーションを防止
    // (window.location の変更をインターセプト)
    await page.addInitScript(() => {
      const origPushState = history.pushState.bind(history);
      const origReplaceState = history.replaceState.bind(history);
      history.pushState = function(...args: Parameters<typeof history.pushState>) {
        const url = args[2]?.toString() || '';
        if (url.includes('signin') || url.includes('unauthenticated')) {
          console.log('[BLOCKED pushState]', url);
          return;
        }
        return origPushState(...args);
      };
      history.replaceState = function(...args: Parameters<typeof history.replaceState>) {
        const url = args[2]?.toString() || '';
        if (url.includes('signin') || url.includes('unauthenticated')) {
          console.log('[BLOCKED replaceState]', url);
          return;
        }
        return origReplaceState(...args);
      };
    });

    await page.goto('/home', { waitUntil: 'load' });
    // コンテンツが描画されるまで待つ（ただし認証リダイレクトが走る前に）
    await page.waitForTimeout(3000);

    const url = page.url();
    const title = await page.title();
    console.log('=== Page Title ===');
    console.log(title);
    console.log('=== URL ===');
    console.log(url);

    // ページ全体の HTML 構造を確認
    console.log('=== Body innerHTML (first 5000) ===');
    const innerHTML = await page.evaluate(() => document.body.innerHTML.substring(0, 5000));
    console.log(innerHTML);

    // ページテキスト
    console.log('=== Page Text ===');
    const bodyText = await page.evaluate(() => document.body.innerText.substring(0, 3000));
    console.log(bodyText);

    // 見出し
    console.log('=== Headings ===');
    const headings = await page.evaluate(() =>
      Array.from(document.querySelectorAll('h1,h2,h3,h4,h5,h6')).map(h => `${h.tagName}: ${h.textContent?.trim().substring(0, 100)}`)
    );
    headings.forEach(h => console.log(`  ${h}`));

    // リンク
    console.log('=== Links ===');
    const links = await page.evaluate(() =>
      Array.from(document.querySelectorAll('a[href]'))
        .map(a => ({ text: (a as HTMLAnchorElement).innerText.trim().substring(0, 60), href: (a as HTMLAnchorElement).getAttribute('href') || '' }))
        .filter(l => l.href.startsWith('/'))
    );
    const uniqueLinks = [...new Map(links.map(l => [l.href, l])).values()];
    for (const l of uniqueLinks) console.log(`  [${l.text}] -> ${l.href}`);

    // ボタン
    console.log('=== Buttons ===');
    const buttons = await page.evaluate(() =>
      Array.from(document.querySelectorAll('button,[role="button"]')).map(b => ({
        text: (b as HTMLElement).innerText?.trim().substring(0, 60) || '',
        ariaLabel: b.getAttribute('aria-label') || '',
      }))
    );
    for (const b of buttons) console.log(`  [${b.text || b.ariaLabel}]`);

    // フォーム
    console.log('=== Forms ===');
    const forms = await page.evaluate(() =>
      Array.from(document.querySelectorAll('form')).map(f => ({
        action: f.action, method: f.method,
        inputs: Array.from(f.querySelectorAll('input,select,textarea')).map(i => ({
          name: (i as HTMLInputElement).name, type: (i as HTMLInputElement).type,
          required: (i as HTMLInputElement).required,
        })),
      }))
    );
    for (const f of forms) {
      console.log(`  Form: action=${f.action} method=${f.method}`);
      for (const i of f.inputs) console.log(`    - name="${i.name}" type="${i.type}" required=${i.required}`);
    }

    // img
    console.log('=== Images ===');
    const images = await page.evaluate(() =>
      Array.from(document.querySelectorAll('img')).map(img => ({
        alt: img.alt || '(no alt)', src: img.src.substring(0, 120),
      }))
    );
    for (const img of images) console.log(`  alt="${img.alt}" src=${img.src}`);

    await page.screenshot({ path: 'test-results/snapshot-home-v4.png', fullPage: true });
  });

  test('主要ページの構造', async ({ page }) => {
    await page.addInitScript(() => {
      const origPushState = history.pushState.bind(history);
      const origReplaceState = history.replaceState.bind(history);
      history.pushState = function(...args: Parameters<typeof history.pushState>) {
        const url = args[2]?.toString() || '';
        if (url.includes('signin') || url.includes('unauthenticated')) return;
        return origPushState(...args);
      };
      history.replaceState = function(...args: Parameters<typeof history.replaceState>) {
        const url = args[2]?.toString() || '';
        if (url.includes('signin') || url.includes('unauthenticated')) return;
        return origReplaceState(...args);
      };
    });

    const pages = ['/shop', '/packs', '/collection', '/others'];

    for (const path of pages) {
      console.log(`\n========== ${path} ==========`);
      await page.goto(path, { waitUntil: 'load' });
      await page.waitForTimeout(3000);

      console.log(`URL: ${page.url()}`);
      console.log(`Title: ${await page.title()}`);

      const headings = await page.evaluate(() =>
        Array.from(document.querySelectorAll('h1,h2,h3')).map(h => `${h.tagName}: ${h.textContent?.trim().substring(0, 80)}`)
      );
      headings.forEach(h => console.log(`  ${h}`));

      const links = await page.evaluate(() =>
        Array.from(document.querySelectorAll('a[href]'))
          .map(a => ({ text: (a as HTMLAnchorElement).innerText.trim().substring(0, 60), href: (a as HTMLAnchorElement).getAttribute('href') || '' }))
          .filter(l => l.href.startsWith('/'))
      );
      const uniqueLinks = [...new Map(links.map(l => [l.href, l])).values()];
      console.log(`  Links: ${uniqueLinks.length}`);
      for (const l of uniqueLinks.slice(0, 15)) console.log(`    [${l.text}] -> ${l.href}`);

      const bodyText = await page.evaluate(() => document.body.innerText.substring(0, 1500));
      console.log(`  Text: ${bodyText.substring(0, 500)}`);

      const formCount = await page.evaluate(() => document.querySelectorAll('form').length);
      if (formCount > 0) {
        console.log(`  *** Forms: ${formCount} ***`);
        const fd = await page.evaluate(() =>
          Array.from(document.querySelectorAll('form')).map(f => ({
            action: f.action, method: f.method,
            inputs: Array.from(f.querySelectorAll('input,select,textarea')).map(i => ({
              name: (i as HTMLInputElement).name, type: (i as HTMLInputElement).type,
            })),
          }))
        );
        for (const f of fd) {
          console.log(`    Form: ${f.action} ${f.method}`);
          for (const i of f.inputs) console.log(`      - name="${i.name}" type="${i.type}"`);
        }
      }

      await page.screenshot({ path: `test-results/snapshot-${path.replace('/', '')}-v4.png`, fullPage: true });
    }
  });
});
