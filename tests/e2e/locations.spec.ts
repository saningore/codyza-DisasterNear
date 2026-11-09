import { expect, test } from "@playwright/test";

const ZIPS = ["10001", "33101", "73102", "90012", "99501", "96813", "00901"];

test("explains the limits, rejects a bad ZIP, and keeps the footer on every page", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("If you are in immediate danger, call 911.")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Know hazards around your location" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Codyza" })).toHaveAttribute("href", "https://codyza.com");
  await expect(page.getByText("does not mean the area is completely safe")).toBeVisible();

  await page.getByLabel("ZIP code, city, or street address").fill("1234");
  await page.getByRole("button", { name: "Check hazards" }).click();
  await expect(page.getByText("Enter a 5-digit U.S. ZIP code.")).toBeVisible();

  await page.getByRole("link", { name: "Sources" }).click();
  await expect(page.getByRole("heading", { name: "Where the information comes from" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Codyza" })).toBeVisible();
  await page.getByRole("link", { name: "About" }).click();
  await expect(page.getByRole("heading", { name: "About DisasterNear" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Codyza" })).toBeVisible();

  const missing = await page.goto("/not-a-page");
  expect(missing?.status()).toBe(404);
  await expect(page.getByRole("link", { name: "Codyza" })).toBeVisible();
});

for (const zip of ZIPS) {
  test(`checks live sources for ZIP ${zip}`, async ({ page }) => {
    await openZip(page, zip);
  });
}

test("tells the user when location permission is denied", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Use my location" }).click();
  await expect(page.getByText("Location permission was denied. Enter a ZIP code or street address.")).toBeVisible();
});

test("checks a granted device location in the United States", async ({ page, context }) => {
  await context.grantPermissions(["geolocation"]);
  await context.setGeolocation({ latitude: 40.75065, longitude: -73.9973 });
  await page.goto("/");
  await page.getByRole("button", { name: "Use my location" }).click();
  await expect(page.getByRole("heading", { name: "Hazards for Device location" })).toBeVisible({ timeout: 90_000 });
  await expectChecked(page);
});

test("stays usable on a phone-width screen", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openZip(page, "10001");
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2);
  expect(overflow).toBe(false);
  await expect(page.getByRole("link", { name: "Codyza" })).toBeVisible();
});

async function openZip(page: import("@playwright/test").Page, zip: string) {
  await page.goto("/");
  await page.getByLabel("ZIP code, city, or street address").fill(zip);
  await page.getByRole("button", { name: "Check hazards" }).click();
  await expect(page.getByRole("heading", { name: `Hazards for ZIP code ${zip}` })).toBeVisible({ timeout: 90_000 });
  await expect(page.getByText("Results use the center of this ZIP code.")).toBeVisible();
  await expectChecked(page);
  const unchecked = page.getByText("The National Weather Service could not be checked.");
  if (await unchecked.count()) {
    await expect(page.locator("article[data-alert='active']")).toHaveCount(0);
    return;
  }
  const empty = page.getByText("No matching active alerts were returned by the sources checked.");
  const cards = page.locator("article[data-alert='active'], article[data-alert='zone']");
  if (await empty.count()) {
    await expect(empty).toBeVisible();
  } else {
    expect(await cards.count()).toBeGreaterThan(0);
    const card = cards.first();
    await expect(card.getByText("Alert type", { exact: true })).toBeVisible();
    await expect(card.getByText("Severity", { exact: true })).toBeVisible();
    await expect(card.getByText("Area affected", { exact: true })).toBeVisible();
    await expect(card.getByText("Start time", { exact: true })).toBeVisible();
    await expect(card.getByText("Expiration / end", { exact: true })).toBeVisible();
    await expect(card.getByText("Official instructions", { exact: true })).toBeVisible();
    await expect(card.getByText("Issuing authority", { exact: true })).toBeVisible();
    const official = card.getByRole("link", { name: "Open the NWS alert record" });
    await expect(official).toHaveAttribute("href", /weather\.gov|noaa\.gov/);
  }
}

test("opens a readable copy when the National Weather Service returns an alert", async ({ page }) => {
  await openZip(page, "33101");
  const readable = page.getByRole("link", { name: "Readable copy of this NWS record" });
  if (await readable.count()) {
    await readable.first().click();
    await expect(page.getByText("This page repeats the current NWS alert record.")).toBeVisible({ timeout: 60_000 });
    await expect(page.getByRole("link", { name: "Codyza" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Open the NWS alert record" })).toHaveAttribute("href", /api\.weather\.gov\/alerts\//);
  }
});

async function expectChecked(page: import("@playwright/test").Page) {
  await expect(page.locator("[data-source='nws']")).toContainText("National Weather Service");
  await expect(page.locator("[data-source='usgs']")).toContainText("U.S. Geological Survey");
  await expect(page.locator("[data-source='fema']")).toContainText("FEMA");
  await expect(page.locator("[data-safety='no-guarantee']")).toContainText("does not mean the area is completely safe");
  await expect(page.getByRole("link", { name: "Codyza" })).toHaveAttribute("href", "https://codyza.com");
  await expect(page.locator("[data-map-ready='true']")).toBeVisible({ timeout: 45_000 });
}
