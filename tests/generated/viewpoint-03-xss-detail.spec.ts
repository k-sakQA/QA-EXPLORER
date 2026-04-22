import { test, expect } from '@playwright/test';

/**
 * XSS脆弱性の詳細確認
 */

test.describe('XSS脆弱性詳細確認', () => {
  const baseUrl = 'https://hotel-example-site.takeyaqa.dev/ja/reserve.html?plan-id=0';

  test('imgタグのonerrorがHTMLとして解釈されるか確認', async ({ page }) => {
    await page.goto(baseUrl);
    
    const xssPayload = '<img src="x" onerror="alert(\'XSS\')">';
    
    await page.fill('#username', xssPayload);
    await page.selectOption('#contact', 'no');
    
    await page.click('button[type="submit"]');
    await page.waitForLoadState('networkidle');
    
    // HTMLソースを確認
    const pageContent = await page.content();
    
    // img要素として解釈されているか確認
    const imgElements = await page.locator('img[src="x"]').count();
    console.log('img[src="x"] elements count:', imgElements);
    
    // エスケープされているか確認
    const hasEscapedLt = pageContent.includes('&lt;img');
    const hasUnescapedImg = pageContent.includes('<img src="x"');
    console.log('Has escaped &lt;img:', hasEscapedLt);
    console.log('Has unescaped <img src="x":', hasUnescapedImg);
    
    // テキストノードとして表示されているか確認
    const bodyText = await page.textContent('body');
    const hasPayloadAsText = bodyText?.includes('<img src="x"');
    console.log('Payload appears as text:', hasPayloadAsText);
    
    if (imgElements > 0) {
      console.log('CRITICAL: XSS vulnerability - img tag interpreted as HTML!');
    } else if (hasPayloadAsText) {
      console.log('SAFE: Payload displayed as text (properly escaped)');
    }
  });

  test('確認画面でのレンダリング方法を確認', async ({ page }) => {
    await page.goto(baseUrl);
    
    await page.fill('#username', '<b>太郎</b>');
    await page.selectOption('#contact', 'no');
    
    await page.click('button[type="submit"]');
    await page.waitForLoadState('networkidle');
    
    // bタグが解釈されているか
    const boldElements = await page.locator('b:has-text("太郎")').count();
    console.log('Bold elements with 太郎:', boldElements);
    
    // テキストとして表示されているか
    const bodyText = await page.textContent('body');
    console.log('Body contains <b>:', bodyText?.includes('<b>'));
    
    if (boldElements > 0) {
      console.log('WARNING: HTML tags are being rendered');
    }
  });
});
