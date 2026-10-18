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
    // Scoped to the status line so it cannot also match the robot bubble
    // ("Pronto! Esta é a v1.") if the viewport ever shows the mascot.
    await expect(page.locator('[aria-live="polite"][aria-atomic="true"]')).toContainText(
      "Pronto",
      { timeout: 15000 },
    );
    await expect(
      page
        .frameLocator('iframe[title="Live preview"]')
        .getByText("FixtureCard")
        .first(),
    ).toBeVisible({ timeout: 20000 });
    await page.screenshot({ path: "docs/screenshot-dark.png", fullPage: true });
  });
});
