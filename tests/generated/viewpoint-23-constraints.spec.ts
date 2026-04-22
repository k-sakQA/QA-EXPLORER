import { expect, test } from "@playwright/test";

const reserveUrl = "https://hotel-example-site.takeyaqa.dev/ja/reserve.html?plan-id=0";

function overThreeMonthsDate() {
  const date = new Date();
  date.setMonth(date.getMonth() + 4);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}/${month}/${day}`;
}

async function fillBase(page: import("@playwright/test").Page) {
  await page.goto(reserveUrl, { waitUntil: "networkidle" });
  await page.locator("#username").fill("山田太郎");
  await page.locator("#contact").selectOption("no");
}

test.describe("観点23: 排他処理 - 禁則", () => {
  test("3ヶ月超の宿泊日は確認画面へ進めない", async ({ page }) => {
    await fillBase(page);

    await page.locator("#date").fill(overThreeMonthsDate());
    await page.locator("#date").press("Tab");
    await page.locator("#term").fill("1");
    await page.locator("#head-count").fill("1");
    await page.locator("#submit-button").click();

    await expect(page).toHaveURL(/reserve\.html/);
    await expect(page.locator("#date")).toHaveValue(overThreeMonthsDate());
  });

  test("宿泊数0は確認画面へ進めない", async ({ page }) => {
    await fillBase(page);

    await page.locator("#date").fill("2026/04/29");
    await page.locator("#date").press("Tab");
    await page.locator("#term").fill("0");
    await page.locator("#head-count").fill("1");
    await page.locator("#submit-button").click();

    await expect(page).toHaveURL(/reserve\.html/);
    await expect(page.locator("#term:invalid")).toHaveCount(1);
  });

  test("人数0は確認画面へ進めない", async ({ page }) => {
    await fillBase(page);

    await page.locator("#date").fill("2026/04/29");
    await page.locator("#date").press("Tab");
    await page.locator("#term").fill("1");
    await page.locator("#head-count").fill("0");
    await page.locator("#submit-button").click();

    await expect(page).toHaveURL(/reserve\.html/);
    await expect(page.locator("#head-count:invalid")).toHaveCount(1);
  });
});
