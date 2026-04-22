import { expect, test } from "@playwright/test";

const reserveUrl = "https://hotel-example-site.takeyaqa.dev/ja/reserve.html?plan-id=0";

function validReserveDate() {
  const date = new Date();
  date.setDate(date.getDate() + 7);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}/${month}/${day}`;
}

async function gotoReady(page: import("@playwright/test").Page) {
  await page.goto(reserveUrl, { waitUntil: "domcontentloaded" });
  await expect(page.locator("#reserve-form")).toBeVisible();
  await page.waitForLoadState("networkidle");
}

test.describe("観点02: エラー表示(正常系)", () => {
  test("必須項目未入力時にフィールド別エラーが表示される", async ({ page }) => {
    await gotoReady(page);

    await page.locator("#date").fill("");
    await page.locator("#term").fill("");
    await page.locator("#head-count").fill("");
    await page.locator("#submit-button").click();

    await expect(page.locator("#date:invalid")).toHaveCount(1);
    await expect(page.locator("#term:invalid")).toHaveCount(1);
    await expect(page.locator("#head-count:invalid")).toHaveCount(1);
    await expect(page.locator("#username:invalid")).toHaveCount(1);
    await expect(page.locator("#contact:invalid")).toHaveCount(1);
    await expect(page.locator("#date")).toBeFocused();

    const invalidFeedbackCount = await page.locator(".invalid-feedback").filter({ hasText: /.+/ }).count();
    expect(invalidFeedbackCount).toBeGreaterThan(0);
  });

  test("メール連絡を選ぶと email が必須になり、対象箇所にエラーが出る", async ({ page }) => {
    await gotoReady(page);

    await page.locator("#date").fill(validReserveDate());
    await page.locator("#term").fill("1");
    await page.locator("#head-count").fill("1");
    await page.locator("#username").fill("山田太郎");
    await page.locator("#contact").selectOption("email");

    await page.locator("#submit-button").click();

    await expect(page.locator("#email")).toBeVisible();
    await expect(page.locator("#email:invalid")).toHaveCount(1);
    await expect(page.locator("#email + .invalid-feedback")).not.toHaveText("");
  });

  test("電話連絡を選ぶと電話番号の形式エラーが示される", async ({ page }) => {
    await gotoReady(page);

    await page.locator("#date").fill(validReserveDate());
    await page.locator("#term").fill("1");
    await page.locator("#head-count").fill("1");
    await page.locator("#username").fill("山田太郎");
    await page.locator("#contact").selectOption("tel");
    await page.locator("#tel").fill("090-1234-5678");

    await page.locator("#submit-button").click();

    await expect(page.locator("#tel")).toBeVisible();
    await expect(page.locator("#tel:invalid")).toHaveCount(1);
    const validationMessage = await page.locator("#tel").evaluate(
      (el) => (el as HTMLInputElement).validationMessage,
    );
    expect(validationMessage.length).toBeGreaterThan(0);
  });
});
