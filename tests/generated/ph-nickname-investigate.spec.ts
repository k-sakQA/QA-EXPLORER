import { test, expect } from '@playwright/test';
import { gotoAndDismiss, dismissAllDialogs } from './helpers/dismiss-dialogs';

/**
 * ニックネーム編集ページ遷移の調査テスト
 *
 * Finding: /others の「ニックネームの編集」リンク(href="/others/nickname_edit")を
 * クリックしても URL が /others のまま。直接アクセスした場合も確認する。
 */
test.describe('ニックネーム編集 遷移調査', () => {

  test('直接 /others/nickname_edit にアクセス', async ({ page }) => {
    await page.goto('/others/nickname_edit');
    await page.waitForLoadState('networkidle');
    await dismissAllDialogs(page);

    const url = page.url();
    console.log(`直接アクセス URL: ${url}`);

    const bodyText = await page.evaluate(() => document.body.innerText);
    console.log(`Body text: ${bodyText.substring(0, 500)}`);

    // DOM 構造を確認
    const inputs = await page.evaluate(() =>
      Array.from(document.querySelectorAll('input, textarea, [contenteditable]')).map(el => ({
        tag: el.tagName,
        name: (el as HTMLInputElement).name,
        type: (el as HTMLInputElement).type,
        value: (el as HTMLInputElement).value?.substring(0, 100),
        placeholder: (el as HTMLInputElement).placeholder,
        maxLength: (el as HTMLInputElement).maxLength,
      }))
    );
    console.log('Inputs:', JSON.stringify(inputs, null, 2));

    const buttons = await page.evaluate(() =>
      Array.from(document.querySelectorAll('button')).map(el => ({
        text: el.textContent?.trim().substring(0, 50),
        disabled: el.disabled,
        type: el.type,
      }))
    );
    console.log('Buttons:', JSON.stringify(buttons, null, 2));

    await page.screenshot({ path: 'test-results/ph-nickname-direct.png', fullPage: true });
  });

  test('Others ページからリンクをクリック（waitForURL で待つ）', async ({ page }) => {
    await gotoAndDismiss(page, '/others');

    const link = page.locator('a[href="/others/nickname_edit"]');
    await expect(link).toBeVisible();
    console.log('リンク要素: visible');

    // クリック前にリンクの属性を確認
    const href = await link.getAttribute('href');
    const target = await link.getAttribute('target');
    console.log(`href="${href}" target="${target}"`);

    await link.click();

    // URL変化を最大10秒待つ
    try {
      await page.waitForURL('**/others/nickname_edit**', { timeout: 10000 });
      console.log(`遷移成功: ${page.url()}`);
    } catch {
      console.log(`遷移失敗: URL は ${page.url()} のまま`);

      // ページ内にモーダルやオーバーレイが出ていないか確認
      const dialogs = await page.evaluate(() =>
        Array.from(document.querySelectorAll('dialog')).map(d => ({
          open: d.hasAttribute('open'),
          className: d.className,
          text: d.textContent?.trim().substring(0, 200),
        }))
      );
      console.log('dialog 要素:', JSON.stringify(dialogs, null, 2));

      // 遷移をブロックしている要素の確認
      const overlays = await page.evaluate(() =>
        Array.from(document.querySelectorAll('[style*="position: fixed"], [style*="position: absolute"], [class*="modal"], [class*="overlay"], [class*="dialog"]')).map(el => ({
          tag: el.tagName,
          className: el.className.substring(0, 100),
          visible: (el as HTMLElement).offsetHeight > 0,
          text: el.textContent?.trim().substring(0, 100),
        }))
      );
      console.log('Overlays:', JSON.stringify(overlays, null, 2));
    }

    await page.waitForTimeout(2000);
    const bodyText = await page.evaluate(() => document.body.innerText);
    console.log(`最終的なBody text: ${bodyText.substring(0, 500)}`);

    await page.screenshot({ path: 'test-results/ph-nickname-from-others.png', fullPage: true });
  });

  test('Others ページからリンクを force:true でクリック', async ({ page }) => {
    await gotoAndDismiss(page, '/others');

    const link = page.locator('a[href="/others/nickname_edit"]');
    await link.click({ force: true });

    await page.waitForTimeout(3000);
    const url = page.url();
    console.log(`force click 後 URL: ${url}`);

    const bodyText = await page.evaluate(() => document.body.innerText);
    console.log(`Body text: ${bodyText.substring(0, 500)}`);

    await page.screenshot({ path: 'test-results/ph-nickname-force-click.png', fullPage: true });
  });
});
