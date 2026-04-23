import { test, expect } from '@playwright/test';

/**
 * 認証デバッグ: リクエスト/レスポンスヘッダーを確認してリダイレクトの原因を特定する
 */
test('認証フローデバッグ', async ({ page, context }) => {
  // Cookie が context に設定されているか確認
  const cookies = await context.cookies('https://development.pocket-heroes.net');
  console.log('=== Cookies loaded in context ===');
  for (const c of cookies) {
    console.log(`  ${c.name} = ${c.value.substring(0, 50)}...  domain=${c.domain} path=${c.path} secure=${c.secure}`);
  }

  // リクエスト/レスポンスをキャプチャ
  page.on('request', req => {
    if (req.url().includes('pocket-heroes')) {
      console.log(`>> REQUEST: ${req.method()} ${req.url()}`);
      const headers = req.headers();
      if (headers['cookie']) {
        console.log(`   Cookie header: ${headers['cookie'].substring(0, 200)}...`);
      }
    }
  });

  page.on('response', resp => {
    if (resp.url().includes('pocket-heroes')) {
      console.log(`<< RESPONSE: ${resp.status()} ${resp.url()}`);
      const setCookie = resp.headers()['set-cookie'];
      if (setCookie) {
        console.log(`   Set-Cookie: ${setCookie.substring(0, 200)}`);
      }
      const location = resp.headers()['location'];
      if (location) {
        console.log(`   Location: ${location}`);
      }
    }
  });

  console.log('\n=== Navigating to /home ===');
  const response = await page.goto('/home', { waitUntil: 'commit' });
  console.log(`\nFinal URL: ${page.url()}`);
  console.log(`Final Status: ${response?.status()}`);

  await page.waitForLoadState('networkidle');
  console.log(`After networkidle URL: ${page.url()}`);

  // ページ内容
  const bodyText = await page.evaluate(() => document.body.innerText.substring(0, 500));
  console.log(`\nBody: ${bodyText}`);
});
