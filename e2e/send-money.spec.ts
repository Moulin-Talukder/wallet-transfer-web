import { expect, test, type Page } from "@playwright/test";
import { formatPaisa, parseBdtToPaisa } from "@/lib/money";

const API_URL = process.env.API_URL ?? "http://127.0.0.1:8000";

test.beforeAll(async () => {
  const response = await fetch(`${API_URL}/api/me`, { headers: { Accept: "application/json" } }).catch(() => null);
  if (!response) throw new Error(`The Laravel API is not reachable at ${API_URL}. Start it with "php artisan serve".`);
});

async function readBalance(page: Page): Promise<number> {
  const text = await page.locator("section[aria-labelledby=balance-heading] p").first().innerText();
  const parsed = parseBdtToPaisa(text.replace("৳", ""));
  if (!parsed.ok) throw new Error(`Unexpected balance text: ${text}`);
  return parsed.paisa;
}

test("sign in, send money, and find the transfer in the history", async ({ page }) => {
  // A random amount between ৳1.00 and ৳99.99, so this run's transfer can't be confused with an earlier one.
  const amountPaisa = 100 + Math.floor(Math.random() * 9_900);
  const amountInput = (amountPaisa / 100).toFixed(2);

  await test.step("sign in", async () => {
    await page.goto("/transfers");
    await expect(page).toHaveURL(/\/login$/);
    await page.getByLabel("Email").fill("alice@example.com");
    await page.getByLabel("Password").fill("password");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
  });

  const balanceBefore = await readBalance(page);

  const reference = await test.step("send money with a review step", async () => {
    await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Send money" }).click();
    await page.getByLabel("Receiver's email").fill("bob@example.com");
    await page.getByLabel("Amount (BDT)").fill(amountInput);
    await page.getByRole("button", { name: "Review transfer" }).click();

    await expect(page.getByRole("heading", { name: "Review transfer" })).toBeVisible();
    await page.getByRole("button", { name: `Send ${formatPaisa(amountPaisa)}` }).click();

    await expect(page.getByRole("heading", { name: "Transfer sent" })).toBeVisible();
    const ref = (await page.getByTestId("transfer-reference").innerText()).trim();
    expect(ref).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    return ref;
  });

  await test.step("the transfer is the newest entry in the history", async () => {
    await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "History" }).click();
    await expect(page).toHaveURL(/\/transfers$/);

    // :visible skips pages Next.js keeps mounted but hidden after navigation.
    const newest = page.locator("main li:visible").first();
    await expect(newest.locator(`[title="${reference}"]`)).toBeVisible();
    await expect(newest).toContainText("Money sent");
    await expect(newest).toContainText(formatPaisa(amountPaisa));
  });

  await test.step("the balance went down by exactly the amount", async () => {
    await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Dashboard" }).click();
    await expect.poll(() => readBalance(page)).toBe(balanceBefore - amountPaisa);
  });
});
