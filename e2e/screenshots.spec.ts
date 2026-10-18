import { test, expect } from "@playwright/test";

// Opt-in: regenerates docs/screenshot-dark.png. Run with SCREENSHOTS=1 (mock model only).
// The site is dark-only (forcedTheme="dark"), so there is a single capture.
test.describe("readme screenshots", () => {
  test.skip(process.env.SCREENSHOTS !== "1", "set SCREENSHOTS=1 to regenerate");
  test.use({ viewport: { width: 1280, height: 800 } });

  test("capture dark", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("textbox", { name: "Prompt" }).fill("A pricing card");
    await page.getByRole("button", { name: "Gerar" }).click();
    await expect(page.getByText("Pronto")).toBeVisible({ timeout: 15000 });
    await expect(
      page
        .frameLocator('iframe[title="Live preview"]')
        .getByText("FixtureCard")
        .first(),
    ).toBeVisible({ timeout: 20000 });
    await page.screenshot({ path: "docs/screenshot-dark.png", fullPage: true });
  });
});
