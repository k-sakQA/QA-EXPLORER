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

async function fillValidReservation(page: import("@playwright/test").Page) {
  await page.goto(reserveUrl, { waitUntil: "networkidle" });
  await page.locator("#date").fill(validReserveDate());
  await page.locator("#date").press("Tab");
  await page.locator("#term").fill("1");
  await page.locator("#head-count").fill("1");
  await page.locator("#username").fill("山田太郎");
  await page.locator("#contact").selectOption("email");
  await page.locator("#email").fill("qa@example.com");
}

test.describe("観点10: 動作確認 - 単機能", () => {
  test("有効な入力で確認画面へ遷移できる", async ({ page }) => {
    await fillValidReservation(page);

    await expect(page.locator("#submit-button")).toBeEnabled();
    await page.locator("#submit-button").click();

    await expect(page).toHaveURL(/confirm\.html/);
    await expect(page.getByRole("heading", { name: "宿泊予約確認" })).toBeVisible();
    await expect(page.locator("body")).toContainText("山田太郎");
    await expect(page.locator("body")).toContainText("qa@example.com");
  });

  test("確認画面から戻っても入力内容が保持される", async ({ page }) => {
    await fillValidReservation(page);
    await page.locator("#submit-button").click();

    await expect(page).toHaveURL(/confirm\.html/);
    await page.goBack({ waitUntil: "networkidle" });

    await expect(page.locator("#username")).toHaveValue("山田太郎");
    await expect(page.locator("#contact")).toHaveValue("email");
    await expect(page.locator("#email")).toHaveValue("qa@example.com");
  });
});
