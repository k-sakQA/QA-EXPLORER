import { test, expect } from '@playwright/test';

/**
 * P-20260423-01: /others 配下の全サブページに直接アクセスしてリダイレクトを確認
 * 仮説 H-20260423-01: SSRルーティングとCSRルーティングの不整合
 */
test.describe('Probe: SSR直接アクセスリダイレクト確認', () => {

  const subPages = [
    { path: '/others/nickname_edit', label: 'ニックネーム編集' },
    { path: '/purchases', label: '購入履歴' },
    { path: '/payment_methods', label: 'お支払い方法' },
    { path: '/terms_and_policies', label: '規約・ポリシー' },
    { path: '/promotion_code', label: 'プロモーションコード' },
    { path: '/collection', label: 'コレクション (対照群)' },
    { path: '/packs', label: 'パック (対照群)' },
    { path: '/shop', label: 'ショップ (対照群)' },
  ];

  for (const sub of subPages) {
    test(`直接アクセス: ${sub.label} (${sub.path})`, async ({ page }) => {
      const response = await page.goto(sub.path, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForLoadState('networkidle').catch(() => {});

      const finalUrl = page.url();
      const redirected = !finalUrl.includes(sub.path);
      const statusCode = response?.status();

      console.log(`${sub.label}: ${sub.path}`);
      console.log(`  Final URL: ${finalUrl}`);
      console.log(`  Redirected: ${redirected}`);
      console.log(`  Status: ${statusCode}`);

      const bodyText = await page.evaluate(() => document.body.innerText);
      console.log(`  Body (first 200): ${bodyText.substring(0, 200)}`);

      if (redirected) {
        console.log(`  ⚠️ リダイレクト発生: ${sub.path} → ${finalUrl}`);
      } else {
        console.log(`  ✓ 正常遷移`);
      }
    });
  }
});
