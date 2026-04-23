import { test, expect } from '@playwright/test';

/**
 * 初期スナップショット v3: POST は通すが networkidle は待たない
 * RSC のリフレッシュでリダイレクトされる前にキャプチャ
 */
test.describe('pocket-heroes: 初期スナップショット v3', () => {

  test('Home ページ構造', async ({ page }) => {
    // 307 リダイレクトをインターセプトして認証切れリダイレクトを防止
    await page.route('**/*', async (route) => {
      const req = route.request();
      // signin/unauthenticated_error へのナビゲーションを阻止
      if (req.url().includes('/signin') || req.url().includes('/unauthenticated_error')) {
        route.abort();
        return;
      }
      const resp = await route.fetch();
      if (resp.status() === 307) {
        const location = resp.headers()['location'] || '';
        if (location.includes('signin') || location.includes('unauthenticated')) {
          console.log(`[BLOCKED] 307 redirect to ${location}`);
          route.fulfill({ status: 200, body: '' });
          return;
        }
      }
      route.fulfill({ response: resp });
    });

    await page.goto('/home', { waitUntil: 'domcontentloaded' });
    // コンテンツ描画を待つ (ナビゲーション等の主要要素)
    await page.waitForTimeout(5000);

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
        .map(a => ({
          text: (a as HTMLAnchorElement).innerText.trim().substring(0, 60),
          href: (a as HTMLAnchorElement).getAttribute('href') || '',
        }))
        .filter(l => l.href.startsWith('/') || l.href.includes(host));
    });
    const uniqueLinks = [...new Map(links.map(l => [l.href, l])).values()];
    for (const l of uniqueLinks) console.log(`  [${l.text}] -> ${l.href}`);

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
          required: (i as HTMLInputElement).required, placeholder: (i as HTMLInputElement).placeholder,
        })),
      }))
    );
    for (const f of forms) {
      console.log(`  Form: action=${f.action} method=${f.method}`);
      for (const i of f.inputs) console.log(`    - name="${i.name}" type="${i.type}" required=${i.required} placeholder="${i.placeholder}"`);
    }

    // ナビゲーション
    console.log('=== Nav ===');
    const navItems = await page.evaluate(() =>
      Array.from(document.querySelectorAll('nav a, [role="navigation"] a, footer a')).map(a => ({
        text: (a as HTMLAnchorElement).innerText.trim().substring(0, 40),
        href: (a as HTMLAnchorElement).getAttribute('href') || '',
      }))
    );
    for (const n of navItems) console.log(`  [${n.text}] -> ${n.href}`);

    // ページテキスト
    console.log('=== Page Text ===');
    const bodyText = await page.evaluate(() => document.body.innerText.substring(0, 3000));
    console.log(bodyText);

    // 画像
    console.log('=== Images ===');
    const images = await page.evaluate(() =>
      Array.from(document.querySelectorAll('img')).map(img => ({
        alt: img.alt || '(no alt)', src: img.src.substring(0, 120),
      }))
    );
    for (const img of images) console.log(`  alt="${img.alt}" src=${img.src}`);

    await page.screenshot({ path: 'test-results/snapshot-home-v3.png', fullPage: true });

    expect(page.url()).toContain('/home');
  });

  test('主要ページを浅く探索', async ({ page }) => {
    // 同様にリダイレクトをブロック
    await page.route('**/*', async (route) => {
      const req = route.request();
      if (req.url().includes('/signin') || req.url().includes('/unauthenticated_error')) {
        route.abort();
        return;
      }
      const resp = await route.fetch();
      if (resp.status() === 307) {
        const location = resp.headers()['location'] || '';
        if (location.includes('signin') || location.includes('unauthenticated')) {
          route.fulfill({ status: 200, body: '' });
          return;
        }
      }
      route.fulfill({ response: resp });
    });

    const pages = [
      { name: 'Shop', path: '/shop' },
      { name: 'Packs', path: '/packs' },
      { name: 'Collection', path: '/collection' },
      { name: 'Others', path: '/others' },
    ];

    for (const p of pages) {
      console.log(`\n========== ${p.name} (${p.path}) ==========`);
      try {
        await page.goto(p.path, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(5000);

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
        console.log(`  Internal links: ${uniqueLinks.length}`);
        for (const l of uniqueLinks.slice(0, 15)) console.log(`    [${l.text}] -> ${l.href}`);

        const formCount = await page.evaluate(() => document.querySelectorAll('form').length);
        if (formCount > 0) {
          console.log(`  *** Forms: ${formCount} ***`);
          const formDetails = await page.evaluate(() =>
            Array.from(document.querySelectorAll('form')).map(f => ({
              action: f.action, method: f.method,
              inputs: Array.from(f.querySelectorAll('input,select,textarea')).map(i => ({
                name: (i as HTMLInputElement).name, type: (i as HTMLInputElement).type,
              })),
            }))
          );
          for (const f of formDetails) {
            console.log(`    Form: ${f.action} ${f.method}`);
            for (const i of f.inputs) console.log(`      - name="${i.name}" type="${i.type}"`);
          }
        }

        const bodyText = await page.evaluate(() => document.body.innerText.substring(0, 1500));
        console.log(`  Text: ${bodyText.substring(0, 500)}`);

        await page.screenshot({ path: `test-results/snapshot-${p.name.toLowerCase()}-v3.png`, fullPage: true });
      } catch (e) {
        console.log(`  Error: ${(e as Error).message.substring(0, 200)}`);
      }
    }
  });
});
