import { test, expect } from '@playwright/test';

/**
 * 開発用認証スキップで認証を通し、サイト全体を探索する
 */
test.describe('pocket-heroes: 開発認証スキップ + 探索', () => {

  test('認証スキップでログインしてサイト構造を把握', async ({ page }) => {
    // まず /signin ページに移動
    await page.goto('/signin', { waitUntil: 'load' });
    await page.waitForTimeout(2000);

    console.log('=== Signin Page ===');
    console.log('URL:', page.url());
    const bodyText = await page.evaluate(() => document.body.innerText.substring(0, 1000));
    console.log(bodyText);

    // ボタン一覧を確認
    const buttons = await page.evaluate(() =>
      Array.from(document.querySelectorAll('button,[role="button"]')).map(b => ({
        text: (b as HTMLElement).innerText?.trim().substring(0, 60) || '',
        ariaLabel: b.getAttribute('aria-label') || '',
      }))
    );
    console.log('Buttons:');
    for (const b of buttons) console.log(`  [${b.text || b.ariaLabel}]`);

    // リンク一覧
    const links = await page.evaluate(() =>
      Array.from(document.querySelectorAll('a[href]')).map(a => ({
        text: (a as HTMLAnchorElement).innerText.trim().substring(0, 60),
        href: (a as HTMLAnchorElement).getAttribute('href') || '',
      }))
    );
    console.log('Links:');
    for (const l of links) console.log(`  [${l.text}] -> ${l.href}`);

    await page.screenshot({ path: 'test-results/snapshot-signin.png', fullPage: true });

    // 「認証スキップ（開発用）」をクリック
    const skipButton = page.getByText('認証スキップ（開発用）');
    if (await skipButton.isVisible()) {
      console.log('\n=== Clicking 認証スキップ ===');
      await skipButton.click();
      await page.waitForTimeout(3000);
      console.log('After skip URL:', page.url());
      console.log('After skip title:', await page.title());
      const afterText = await page.evaluate(() => document.body.innerText.substring(0, 2000));
      console.log('After skip text:', afterText);
      await page.screenshot({ path: 'test-results/snapshot-after-skip.png', fullPage: true });
    } else {
      console.log('認証スキップボタンが見つかりません');
    }
  });

  test('認証スキップ後に各ページを探索', async ({ page }) => {
    // 認証スキップ
    await page.goto('/signin', { waitUntil: 'load' });
    await page.waitForTimeout(2000);

    const skipButton = page.getByText('認証スキップ（開発用）');
    if (await skipButton.isVisible()) {
      await skipButton.click();
      await page.waitForTimeout(3000);
    }

    // 認証が通ったか確認
    const currentUrl = page.url();
    console.log('=== After auth skip ===');
    console.log('URL:', currentUrl);

    // /home に遷移
    if (!currentUrl.includes('/home')) {
      await page.goto('/home', { waitUntil: 'load' });
      await page.waitForTimeout(3000);
    }

    // Home ページ構造
    console.log('\n========== /home ==========');
    console.log('URL:', page.url());
    console.log('Title:', await page.title());

    const headings = await page.evaluate(() =>
      Array.from(document.querySelectorAll('h1,h2,h3,h4,h5,h6')).map(h => `${h.tagName}: ${h.textContent?.trim().substring(0, 100)}`)
    );
    headings.forEach(h => console.log(`  ${h}`));

    const links = await page.evaluate(() =>
      Array.from(document.querySelectorAll('a[href]'))
        .map(a => ({ text: (a as HTMLAnchorElement).innerText.trim().substring(0, 60), href: (a as HTMLAnchorElement).getAttribute('href') || '' }))
        .filter(l => l.href.startsWith('/'))
    );
    const uniqueLinks = [...new Map(links.map(l => [l.href, l])).values()];
    console.log('Links:');
    for (const l of uniqueLinks) console.log(`  [${l.text}] -> ${l.href}`);

    const buttons = await page.evaluate(() =>
      Array.from(document.querySelectorAll('button,[role="button"]')).map(b => ({
        text: (b as HTMLElement).innerText?.trim().substring(0, 60) || '',
      })).filter(b => b.text && !b.text.startsWith('OK'))
    );
    console.log('Buttons:');
    for (const b of buttons) console.log(`  [${b.text}]`);

    const bodyText = await page.evaluate(() => document.body.innerText.substring(0, 3000));
    console.log('Text:', bodyText);

    const images = await page.evaluate(() =>
      Array.from(document.querySelectorAll('img')).map(img => ({
        alt: img.alt || '(no alt)', src: img.src.substring(0, 120),
      }))
    );
    console.log('Images:');
    for (const img of images) console.log(`  alt="${img.alt}" src=${img.src}`);

    const forms = await page.evaluate(() =>
      Array.from(document.querySelectorAll('form')).map(f => ({
        action: f.action, method: f.method,
        inputs: Array.from(f.querySelectorAll('input,select,textarea')).map(i => ({
          name: (i as HTMLInputElement).name, type: (i as HTMLInputElement).type,
          required: (i as HTMLInputElement).required,
        })),
      }))
    );
    if (forms.length > 0) {
      console.log('Forms:');
      for (const f of forms) {
        console.log(`  Form: action=${f.action} method=${f.method}`);
        for (const i of f.inputs) console.log(`    - name="${i.name}" type="${i.type}" required=${i.required}`);
      }
    }

    await page.screenshot({ path: 'test-results/snapshot-home-authed.png', fullPage: true });

    // 各ページを探索
    const pages = ['/shop', '/packs', '/collection', '/others'];
    for (const p of pages) {
      console.log(`\n========== ${p} ==========`);
      await page.goto(p, { waitUntil: 'load' });
      await page.waitForTimeout(3000);

      console.log('URL:', page.url());
      console.log('Title:', await page.title());

      const pHeadings = await page.evaluate(() =>
        Array.from(document.querySelectorAll('h1,h2,h3')).map(h => `${h.tagName}: ${h.textContent?.trim().substring(0, 80)}`)
      );
      pHeadings.forEach(h => console.log(`  ${h}`));

      const pLinks = await page.evaluate(() =>
        Array.from(document.querySelectorAll('a[href]'))
          .map(a => ({ text: (a as HTMLAnchorElement).innerText.trim().substring(0, 60), href: (a as HTMLAnchorElement).getAttribute('href') || '' }))
          .filter(l => l.href.startsWith('/'))
      );
      const pUniqueLinks = [...new Map(pLinks.map(l => [l.href, l])).values()];
      console.log('Links:', pUniqueLinks.length);
      for (const l of pUniqueLinks.slice(0, 15)) console.log(`  [${l.text}] -> ${l.href}`);

      const pText = await page.evaluate(() => document.body.innerText.substring(0, 1500));
      console.log('Text:', pText.substring(0, 500));

      const pForms = await page.evaluate(() => document.querySelectorAll('form').length);
      if (pForms > 0) {
        console.log(`*** Forms: ${pForms} ***`);
        const fd = await page.evaluate(() =>
          Array.from(document.querySelectorAll('form')).map(f => ({
            action: f.action, method: f.method,
            inputs: Array.from(f.querySelectorAll('input,select,textarea')).map(i => ({
              name: (i as HTMLInputElement).name, type: (i as HTMLInputElement).type,
            })),
          }))
        );
        for (const f of fd) {
          console.log(`  Form: ${f.action} ${f.method}`);
          for (const i of f.inputs) console.log(`    - name="${i.name}" type="${i.type}"`);
        }
      }

      await page.screenshot({ path: `test-results/snapshot-${p.replace('/', '')}-authed.png`, fullPage: true });
    }
  });
});
