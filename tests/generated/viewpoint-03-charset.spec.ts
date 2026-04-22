import { test, expect } from '@playwright/test';

/**
 * 観点03: 入力 - 文字種
 * 狙うバグ:
 * 1. XSS脆弱性 (<script>タグ等が動作)
 * 2. SQLインジェクション脆弱性
 * 3. サロゲートペア(絵文字)でクラッシュ・文字化け
 * 4. 制御文字での予期しない動作
 * 5. サニタイズ不足で表示崩れ
 */

test.describe('観点03: 文字種テスト', () => {
  const baseUrl = 'https://hotel-example-site.takeyaqa.dev/ja/reserve.html?plan-id=0';

  test('XSS脆弱性: scriptタグを氏名に入力', async ({ page }) => {
    await page.goto(baseUrl);
    
    const xssPayload = '<script>alert("XSS")</script>';
    
    await page.fill('#username', xssPayload);
    await page.selectOption('#contact', 'no');
    
    await page.click('button[type="submit"]');
    await page.waitForLoadState('networkidle');
    
    // 確認画面のHTMLを取得
    const pageContent = await page.content();
    
    // scriptタグがそのまま実行可能な状態で存在しないか確認
    const hasUnescapedScript = pageContent.includes('<script>alert');
    console.log('Has unescaped script tag:', hasUnescapedScript);
    
    // 表示されているテキストを確認(エスケープされていれば表示される)
    const bodyText = await page.textContent('body');
    console.log('Body contains script text:', bodyText?.includes('<script>'));
    
    await page.screenshot({ path: 'test-results/viewpoint-03-xss-test.png', fullPage: true });
  });

  test('XSS脆弱性: imgタグのonerrorを氏名に入力', async ({ page }) => {
    await page.goto(baseUrl);
    
    const xssPayload = '<img src="x" onerror="alert(\'XSS\')">';
    
    await page.fill('#username', xssPayload);
    await page.selectOption('#contact', 'no');
    
    await page.click('button[type="submit"]');
    await page.waitForLoadState('networkidle');
    
    const pageContent = await page.content();
    const hasUnescapedImg = pageContent.includes('onerror=');
    console.log('Has unescaped onerror:', hasUnescapedImg);
  });

  test('SQLインジェクション風の文字列を入力', async ({ page }) => {
    await page.goto(baseUrl);
    
    const sqlPayload = "'; DROP TABLE users; --";
    
    await page.fill('#username', sqlPayload);
    await page.selectOption('#contact', 'no');
    
    await page.click('button[type="submit"]');
    await page.waitForLoadState('networkidle');
    
    // エラーにならず正常に表示されるか
    const currentUrl = page.url();
    console.log('URL after SQL injection attempt:', currentUrl);
    
    const bodyText = await page.textContent('body');
    console.log('Body contains SQL:', bodyText?.includes('DROP TABLE'));
  });

  test('サロゲートペア(絵文字)を氏名に入力', async ({ page }) => {
    await page.goto(baseUrl);
    
    const emojiName = '太郎😀🎉🏨';
    
    await page.fill('#username', emojiName);
    await page.selectOption('#contact', 'no');
    
    await page.click('button[type="submit"]');
    await page.waitForLoadState('networkidle');
    
    const bodyText = await page.textContent('body');
    console.log('Body text includes emojis:', bodyText?.includes('😀'));
    console.log('Body text includes hotel emoji:', bodyText?.includes('🏨'));
    
    // 文字化けしていないか確認
    expect(bodyText).toContain('太郎');
  });

  test('特殊文字(&, <, >, ", \')を入力', async ({ page }) => {
    await page.goto(baseUrl);
    
    const specialChars = 'テスト&太郎<>"\' test';
    
    await page.fill('#username', specialChars);
    await page.selectOption('#contact', 'no');
    
    await page.click('button[type="submit"]');
    await page.waitForLoadState('networkidle');
    
    const bodyText = await page.textContent('body');
    console.log('Special chars preserved in body:', bodyText?.includes('&') && bodyText?.includes('<'));
    
    // HTMLエスケープされて正しく表示されるべき
    const pageContent = await page.content();
    console.log('Has &amp;:', pageContent.includes('&amp;'));
    console.log('Has &lt;:', pageContent.includes('&lt;'));
  });

  test('コメント欄にマルチバイト文字を大量入力', async ({ page }) => {
    await page.goto(baseUrl);
    
    // 日本語で長いコメント
    const longComment = 'あいうえお'.repeat(100); // 500文字
    
    await page.fill('#username', 'マルチバイトテスト');
    await page.selectOption('#contact', 'no');
    await page.fill('#comment', longComment);
    
    await page.click('button[type="submit"]');
    await page.waitForLoadState('networkidle');
    
    const bodyText = await page.textContent('body');
    console.log('Long comment preserved:', bodyText?.includes('あいうえお'));
    
    // 文字数が正しく保持されているか
    const commentCount = (bodyText?.match(/あいうえお/g) || []).length;
    console.log('Comment pattern count:', commentCount);
  });

  test('制御文字(タブ・改行)を入力', async ({ page }) => {
    await page.goto(baseUrl);
    
    const withControlChars = 'テスト\t太郎\n次の行';
    
    await page.fill('#comment', withControlChars);
    await page.fill('#username', '制御文字テスト');
    await page.selectOption('#contact', 'no');
    
    await page.click('button[type="submit"]');
    await page.waitForLoadState('networkidle');
    
    const bodyText = await page.textContent('body');
    console.log('Control char test - body includes テスト:', bodyText?.includes('テスト'));
    console.log('Control char test - body includes 太郎:', bodyText?.includes('太郎'));
  });

  test('全角スペース・半角スペースのみの氏名', async ({ page }) => {
    await page.goto(baseUrl);
    
    // 全角スペースのみ
    await page.fill('#username', '　　　'); // 全角スペース3つ
    await page.selectOption('#contact', 'no');
    
    await page.click('button[type="submit"]');
    await page.waitForLoadState('networkidle');
    
    const currentUrl = page.url();
    console.log('URL after fullwidth space only:', currentUrl);
    
    // 空白のみでも通ってしまうか確認
    if (currentUrl.includes('confirm')) {
      console.log('BUG: 全角スペースのみで確認画面に進めてしまった');
    }
  });
});
