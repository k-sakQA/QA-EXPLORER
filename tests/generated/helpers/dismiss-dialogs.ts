import { Page } from '@playwright/test';

/**
 * pocket-heroes 固有のモーダルダイアログを全て閉じるヘルパー
 * 
 * このサイトは <dialog open=""> 要素でモーダルを表示し、
 * ページ全体のクリックをブロックする。
 * テスト操作の前にこれを呼び出す必要がある。
 * 
 * 参考: RegressionEcho の dismissAllDialogs パターン
 */
export async function dismissAllDialogs(page: Page, maxAttempts = 5): Promise<void> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    let closed = false;

    // 1. cross (×) ボタンで閉じる (トースト / PWA訴求など)
    const crossButtons = page.locator('button:has(img[src*="cross"])');
    const crossCount = await crossButtons.count();
    for (let i = 0; i < crossCount; i++) {
      try {
        const btn = crossButtons.nth(i);
        if (await btn.isVisible({ timeout: 500 })) {
          await btn.click({ force: true });
          closed = true;
          await page.waitForTimeout(300);
        }
      } catch { /* 要素が消えた等 */ }
    }

    // 2. open 状態の dialog を JS で直接閉じる
    const dialogsClosed = await page.evaluate(() => {
      const dialogs = document.querySelectorAll('dialog[open]');
      let count = 0;
      dialogs.forEach(d => {
        (d as HTMLDialogElement).close();
        d.removeAttribute('open');
        count++;
      });
      return count;
    });
    if (dialogsClosed > 0) {
      closed = true;
      await page.waitForTimeout(300);
    }

    if (!closed) break;
  }
}

/**
 * ページ遷移してダイアログを閉じた状態にする
 */
export async function gotoAndDismiss(page: Page, path: string): Promise<void> {
  await page.goto(path);
  await page.waitForLoadState('networkidle');
  await dismissAllDialogs(page);
}
