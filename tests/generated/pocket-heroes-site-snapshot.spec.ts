import { test, expect } from '@playwright/test';

/**
 * pocket-heroes: サイト全体の初期スナップショット
 * - 全主要ページの構造、リンク、ボタン、フォーム、テキストを収集
 */
test.describe('pocket-heroes: サイト構造の把握', () => {

  test('Home ページの構造', async ({ page }) => {
    await page.goto('/home');
    await page.waitForLoadState('networkidle');

    console.log('=== URL ===');
    console.log(page.url());
    console.log('=== Title ===');
    console.log(await page.title());

    // 見出し
    console.log('=== Headings ===');
    const headings = await page.evaluate(() =>
      Array.from(document.querySelectorAll('h1,h2,h3,h4,h5,h6')).map(h => `${h.tagName}: ${h.textContent?.trim().substring(0, 100)}`)
    );
    headings.forEach(h => console.log(`  ${h}`));

    // リンク
    console.log('=== Internal Links ===');
    const links = await page.evaluate(() =>
      Array.from(document.querySelectorAll('a[href]'))
        .map(a => ({ text: (a as HTMLAnchorElement).innerText.trim().substring(0, 60), href: (a as HTMLAnchorElement).getAttribute('href') || '' }))
        .filter(l => l.href.startsWith('/'))
    );
    const uniqueLinks = [...new Map(links.map(l => [l.href, l])).values()];
    for (const l of uniqueLinks) console.log(`  [${l.text}] -> ${l.href}`);

    // ボタン（OK 以外）
    console.log('=== Buttons ===');
    const buttons = await page.evaluate(() =>
      Array.from(document.querySelectorAll('button,[role="button"]')).map(b => ({
        text: (b as HTMLElement).innerText?.trim().substring(0, 60) || '',
        ariaLabel: b.getAttribute('aria-label') || '',
        disabled: (b as HTMLButtonElement).disabled,
      })).filter(b => (b.text || b.ariaLabel) && b.text !== 'OK')
    );
    for (const b of buttons) console.log(`  [${b.text || b.ariaLabel}] disabled=${b.disabled}`);

    // フォーム
    console.log('=== Forms ===');
    const forms = await page.evaluate(() =>
      Array.from(document.querySelectorAll('form')).map(f => ({
        action: f.action, method: f.method,
        inputs: Array.from(f.querySelectorAll('input,select,textarea')).map(i => ({
          name: (i as HTMLInputElement).name, type: (i as HTMLInputElement).type,
          required: (i as HTMLInputElement).required, placeholder: (i as HTMLInputElement).placeholder || '',
        })),
      }))
    );
    for (const f of forms) {
      console.log(`  Form: action=${f.action} method=${f.method}`);
      for (const i of f.inputs) console.log(`    - name="${i.name}" type="${i.type}" required=${i.required} placeholder="${i.placeholder}"`);
    }

    // 画像
    console.log('=== Images ===');
    const images = await page.evaluate(() =>
      Array.from(document.querySelectorAll('img')).map(img => ({
        alt: img.alt || '(no alt)', src: img.src.substring(0, 120),
      }))
    );
    for (const img of images) console.log(`  alt="${img.alt}" src=${img.src}`);

    // ナビゲーション
    console.log('=== Nav ===');
    const navItems = await page.evaluate(() =>
      Array.from(document.querySelectorAll('nav a, footer a')).map(a => ({
        text: (a as HTMLAnchorElement).innerText.trim().substring(0, 40),
        href: (a as HTMLAnchorElement).getAttribute('href') || '',
      }))
    );
    for (const n of navItems) console.log(`  [${n.text}] -> ${n.href}`);

    // ページテキスト
    console.log('=== Page Text (3000 chars) ===');
    const bodyText = await page.evaluate(() => document.body.innerText.substring(0, 3000));
    console.log(bodyText);

    await page.screenshot({ path: 'test-results/ph-home.png', fullPage: true });
    expect(page.url()).toContain('/home');
  });

  test('主要ページを浅く探索', async ({ page }) => {
    const pages = [
      { name: 'shop', path: '/shop' },
      { name: 'packs', path: '/packs' },
      { name: 'collection', path: '/collection' },
      { name: 'others', path: '/others' },
    ];

    for (const p of pages) {
      console.log(`\n========== ${p.name} (${p.path}) ==========`);
      await page.goto(p.path);
      await page.waitForLoadState('networkidle');

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
      for (const l of uniqueLinks.slice(0, 20)) console.log(`    [${l.text}] -> ${l.href}`);

      const formCount = await page.evaluate(() => document.querySelectorAll('form').length);
      if (formCount > 0) {
        console.log(`  *** Forms: ${formCount} ***`);
        const formDetails = await page.evaluate(() =>
          Array.from(document.querySelectorAll('form')).map(f => ({
            action: f.action, method: f.method,
            inputs: Array.from(f.querySelectorAll('input,select,textarea')).map(i => ({
              name: (i as HTMLInputElement).name, type: (i as HTMLInputElement).type,
              required: (i as HTMLInputElement).required,
            })),
          }))
        );
        for (const f of formDetails) {
          console.log(`    Form: action=${f.action} method=${f.method}`);
          for (const i of f.inputs) console.log(`      - name="${i.name}" type="${i.type}" required=${i.required}`);
        }
      }

      const bodyText = await page.evaluate(() => document.body.innerText.substring(0, 2000));
      console.log(`  Text: ${bodyText.substring(0, 800)}`);

      await page.screenshot({ path: `test-results/ph-${p.name}.png`, fullPage: true });
    }
  });

  test('サブページを探索 (Home内リンク先)', async ({ page }) => {
    // まず Home からリンクを収集
    await page.goto('/home');
    await page.waitForLoadState('networkidle');

    const links = await page.evaluate(() => {
      const host = location.host;
      return Array.from(document.querySelectorAll('a[href]'))
        .map(a => ({ text: (a as HTMLAnchorElement).innerText.trim().substring(0, 60), href: (a as HTMLAnchorElement).getAttribute('href') || '' }))
        .filter(l => l.href.startsWith('/') && !['/', '/home', '/shop', '/packs', '/collection', '/others'].includes(l.href));
    });
    const uniqueLinks = [...new Map(links.map(l => [l.href, l])).values()];

    console.log(`=== Home内のサブリンク: ${uniqueLinks.length} 件 ===`);
    for (const l of uniqueLinks) console.log(`  [${l.text}] -> ${l.href}`);

    // 各サブページを探索 (最大10件)
    for (const l of uniqueLinks.slice(0, 10)) {
      console.log(`\n--- ${l.href} ---`);
      try {
        await page.goto(l.href);
        await page.waitForLoadState('networkidle');
        console.log(`URL: ${page.url()}`);

        const headings = await page.evaluate(() =>
          Array.from(document.querySelectorAll('h1,h2,h3')).map(h => `${h.tagName}: ${h.textContent?.trim().substring(0, 80)}`)
        );
        headings.forEach(h => console.log(`  ${h}`));

        const bodyText = await page.evaluate(() => document.body.innerText.substring(0, 500));
        console.log(`  Text: ${bodyText.substring(0, 300)}`);

        const formCount = await page.evaluate(() => document.querySelectorAll('form').length);
        if (formCount > 0) console.log(`  *** Forms: ${formCount} ***`);
      } catch (e) {
        console.log(`  Error: ${(e as Error).message.substring(0, 150)}`);
      }
    }
  });
});
