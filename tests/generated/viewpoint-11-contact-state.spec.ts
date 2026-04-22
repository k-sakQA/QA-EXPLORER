import { expect, test } from "@playwright/test";

const reserveUrl = "https://hotel-example-site.takeyaqa.dev/ja/reserve.html?plan-id=0";

test.describe("観点11: 状態遷移 - イベントによる状態変化", () => {
  test("メール連絡選択で email 欄が表示・有効化される", async ({ page }) => {
    await page.goto(reserveUrl, { waitUntil: "networkidle" });

    await page.locator("#contact").selectOption("email");

    await expect(page.locator("label[for='email']")).toBeVisible();
    await expect(page.locator("#email")).toBeEnabled();
    await expect(page.locator("#tel")).toBeDisabled();
  });

  test("電話連絡選択で tel 欄が表示・有効化される", async ({ page }) => {
    await page.goto(reserveUrl, { waitUntil: "networkidle" });

    await page.locator("#contact").selectOption("tel");

    await expect(page.locator("label[for='tel']")).toBeVisible();
    await expect(page.locator("#tel")).toBeEnabled();
    await expect(page.locator("#email")).toBeDisabled();
  });

  test("希望しない選択で email/tel 欄が無効化される", async ({ page }) => {
    await page.goto(reserveUrl, { waitUntil: "networkidle" });

    await page.locator("#contact").selectOption("email");
    await page.locator("#email").fill("qa@example.com");
    await page.locator("#contact").selectOption("no");

    await expect(page.locator("#email")).toBeDisabled();
    await expect(page.locator("#tel")).toBeDisabled();
  });
});
