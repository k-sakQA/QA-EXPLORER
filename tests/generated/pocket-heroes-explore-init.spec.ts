import { test, expect } from '@playwright/test';

/**
 * 初期スナップショット: SSR レスポンスを素早くキャプチャする
 * Next.js RSC の POST リクエストが認証切れを起こす前に DOM を取得
 */
test.describe('pocket-heroes: 初期スナップショット', () => {

  test('Home ページ構造 (SSR直後)', async ({ page }) => {
    // RSC POST による認証リダイレクトをブロック
    await page.route('**/*', (route) => {
      const req = route.request();
      if (req.method() === 'POST' && req.url().includes('pocket-heroes.net')) {
        // RSC の POST リクエストをブロックしてリダイレクトを防ぐ
        route.abort();
      } else {
        route.continue();
      }
    });

    await page.goto('/home', { waitUntil: 'domcontentloaded' });
    // SSR コンテンツが描画されるまで少し待つ
    await page.waitForTimeout(2000);

    const title = await page.title();
    console.log('=== Page Title ===');
    console.log(title);
    console.log('=== URL ===');
    console.log(page.url());

    // 見出し
    console.log('=== Headings ===');
    const headings = await page.evaluate(() =>
      Array.from(document.querySelectorAll('h1,h2,h3,h4,h5,h6')).map(h => `${h.tagName}: ${h.textContent?.trim().substring(0, 100)}`)
    );
    headings.forEach(h => console.log(`  ${h}`));

    // リンク一覧
    console.log('=== Internal Links ===');
    const links = await page.evaluate(() => {
      const host = location.host;
      return Array.from(document.querySelectorAll('a[href]'))
        .map(a => ({ text: (a as HTMLAnchorElement).innerText.trim().substring(0, 60), href: (a as HTMLAnchorElement).getAttribute('href') || '' }))
        .filter(l => l.href.startsWith('/') || l.href.includes(host));
    });
    for (const l of links) console.log(`  [${l.text}] -> ${l.href}`);

    // ボタン
    console.log('=== Buttons ===');
    const buttons = await page.evaluate(() =>
      Array.from(document.querySelectorAll('button,[role="button"]')).map(b => ({
        text: (b as HTMLElement).innerText?.trim().substring(0, 60) || '',
        ariaLabel: b.getAttribute('aria-label') || '',
        disabled: (b as HTMLButtonElement).disabled,
      }))
    );
    for (const b of buttons) console.log(`  [${b.text || b.ariaLabel}] disabled=${b.disabled}`);

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

    // ナビゲーション / メニュー構造
    console.log('=== Nav elements ===');
    const navs = await page.evaluate(() =>
      Array.from(document.querySelectorAll('nav,[role="navigation"],[role="tablist"]')).map(n => ({
        tag: n.tagName,
        text: n.textContent?.trim().substring(0, 200) || '',
        childLinks: Array.from(n.querySelectorAll('a')).map(a => ({
          text: (a as HTMLAnchorElement).innerText.trim().substring(0, 40),
          href: (a as HTMLAnchorElement).getAttribute('href') || '',
        })),
      }))
    );
    for (const n of navs) {
      console.log(`  <${n.tag}> text="${n.text.substring(0, 60)}"`);
      for (const l of n.childLinks) console.log(`    [${l.text}] -> ${l.href}`);
    }

    // ページテキスト
    console.log('=== Page Text (first 3000) ===');
    const bodyText = await page.evaluate(() => document.body.innerText.substring(0, 3000));
    console.log(bodyText);

    // 画像
    console.log('=== Images ===');
    const images = await page.evaluate(() =>
      Array.from(document.querySelectorAll('img')).map(img => ({
        alt: img.alt || '(no alt)', src: img.src.substring(0, 100),
      }))
    );
    for (const img of images) console.log(`  alt="${img.alt}" src=${img.src}`);

    await page.screenshot({ path: 'test-results/snapshot-home-ssr.png', fullPage: true });

    expect(page.url()).toContain('/home');
    expect(title).toBeTruthy();
  });

  test('主要ページを浅く探索 (SSR直後)', async ({ page }) => {
    // RSC POST をブロック
    await page.route('**/*', (route) => {
      const req = route.request();
      if (req.method() === 'POST' && req.url().includes('pocket-heroes.net')) {
        route.abort();
      } else {
        route.continue();
      }
    });

    const pages = [
      { name: 'Home', path: '/home' },
      { name: 'Shop', path: '/shop' },
      { name: 'Packs', path: '/packs' },
      { name: 'Collection', path: '/collection' },
      { name: 'Others', path: '/others' },
    ];

    for (const p of pages) {
      console.log(`\n========== ${p.name} (${p.path}) ==========`);
      try {
        await page.goto(p.path, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(2000);

        console.log(`URL: ${page.url()}`);
        console.log(`Title: ${await page.title()}`);

        const headings = await page.evaluate(() =>
          Array.from(document.querySelectorAll('h1,h2,h3')).map(h => `${h.tagName}: ${h.textContent?.trim().substring(0, 80)}`)
        );
        headings.forEach(h => console.log(`  ${h}`));

        const links = await page.evaluate(() => {
          const host = location.host;
          return Array.from(document.querySelectorAll('a[href]'))
            .map(a => ({ text: (a as HTMLAnchorElement).innerText.trim().substring(0, 60), href: (a as HTMLAnchorElement).getAttribute('href') || '' }))
            .filter(l => l.href.startsWith('/') || l.href.includes(host));
        });
        const uniqueHrefs = [...new Set(links.map(l => l.href))];
        console.log(`  Internal links: ${uniqueHrefs.length}`);
        for (const l of links.slice(0, 10)) console.log(`    [${l.text}] -> ${l.href}`);

        const formCount = await page.evaluate(() => document.querySelectorAll('form').length);
        if (formCount > 0) console.log(`  *** Forms: ${formCount} ***`);

        const bodyText = await page.evaluate(() => document.body.innerText.substring(0, 1000));
        console.log(`  Text: ${bodyText.substring(0, 300)}`);

        await page.screenshot({ path: `test-results/snapshot-${p.name.toLowerCase()}.png`, fullPage: true });
      } catch (e) {
        console.log(`  Error: ${(e as Error).message.substring(0, 200)}`);
      }
    }
  });
});
