/**
 * Captures the README screenshots from a running production build.
 *
 *   (API)  php artisan migrate:fresh --seed && php artisan serve
 *   (web)  npm run build && npx next start --port 3001
 *          BASE_URL=http://localhost:3001 node scripts/capture-screenshots.mjs
 *
 * It first creates a little transfer history through the API, so the dashboard
 * shows both incoming and outgoing transfers.
 */
import { mkdir } from "node:fs/promises";
import { chromium } from "@playwright/test";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3001";
const API_URL = process.env.API_URL ?? "http://127.0.0.1:8000";
const OUT = new URL("../docs/screenshots/", import.meta.url);

const VIEWPORTS = [
  { name: "mobile", width: 375, height: 812 },
  { name: "desktop", width: 1440, height: 900 },
];

async function api(path, { token, body, headers = {} } = {}) {
  const response = await fetch(`${API_URL}/api${path}`, {
    method: body ? "POST" : "GET",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
      ...headers,
    },
    body: body && JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`${path}: ${response.status} ${await response.text()}`);
  return response.json();
}

async function send(token, receiver_email, amount) {
  await api("/transfers", {
    token,
    body: { receiver_email, amount },
    headers: { "Idempotency-Key": crypto.randomUUID() },
  });
}

async function seedHistory() {
  const { token: alice } = await api("/login", { body: { email: "alice@example.com", password: "password" } });
  const { token: bob } = await api("/login", { body: { email: "bob@example.com", password: "password" } });
  await send(bob, "alice@example.com", 75000);
  await send(alice, "bob@example.com", 120050);
  await send(bob, "alice@example.com", 32500);
}

async function capture(browser, viewport) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: 2 });
  const page = await context.newPage();
  const shot = (name) =>
    page.screenshot({ path: new URL(`${name}-${viewport.name}.png`, OUT).pathname, fullPage: true });

  await page.goto(`${BASE_URL}/login`);
  await shot("login");

  await page.getByLabel("Email").fill("alice@example.com");
  await page.getByLabel("Password").fill("password");
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL("**/dashboard");
  await page.getByText("Money received").first().waitFor();
  await shot("dashboard");

  await page.getByRole("navigation").getByRole("link", { name: "Send money" }).click();
  await page.getByLabel("Receiver's email").fill("bob@example.com");
  await page.getByLabel("Amount (BDT)").fill("1,500.50");
  await page.getByRole("button", { name: "Review transfer" }).click();
  await page.getByRole("heading", { name: "Review transfer" }).waitFor();
  await page.mouse.move(0, 0);
  await shot("review");

  await page.getByRole("button", { name: /^Send ৳/ }).click();
  await page.getByRole("heading", { name: "Transfer sent" }).waitFor();
  await page.mouse.move(0, 0);
  await shot("success");

  await context.close();
}

await mkdir(OUT, { recursive: true });
await seedHistory();
const browser = await chromium.launch();
try {
  for (const viewport of VIEWPORTS) await capture(browser, viewport);
} finally {
  await browser.close();
}
console.log(`Saved screenshots to ${OUT.pathname}`);
