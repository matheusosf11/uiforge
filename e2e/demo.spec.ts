import { test, expect } from "@playwright/test";

// Opt-in: records the README demo video (mock model only). Run with DEMO=1, or
// `npm run demo:gif` to also convert it to docs/demo.gif.
// D-07: waits only on app status text and the preview iframe, never on the
// robot (Spline) or the topology background, so it works if those fail to load.
const IFRAME = 'iframe[title="Live preview"]';
const PAUSE = 1200;

// 1600x900 so the robot mascot (>= 1536px) is on screen (D-06). Top-level:
// Playwright does not allow use({ video }) inside a describe group.
test.use({
  viewport: { width: 1600, height: 900 },
  video: { mode: "on", size: { width: 1600, height: 900 } },
});

test.describe("demo recording", () => {
  test.skip(process.env.DEMO !== "1", "set DEMO=1 to record the demo");

  test("generate, refine, undo and edit", async ({ page }) => {
    test.setTimeout(120000);
    const preview = page.frameLocator(IFRAME);

    await page.goto("/");
    await page.waitForTimeout(1500);

    // 1. Type the prompt key by key so the robot types along.
    const prompt = page.getByRole("textbox", { name: "Prompt" });
    await prompt.click();
    await prompt.pressSequentially("Um card de preços com três planos", { delay: 45 });
    await page.waitForTimeout(600);

    // 2. Generate.
    await page.getByRole("button", { name: "Gerar" }).click();
    await expect(page.getByText("Pronto — v1", { exact: true })).toBeVisible({ timeout: 15000 });
    await expect(preview.getByText("FixtureCard").first()).toBeVisible({ timeout: 20000 });
    await page.waitForTimeout(PAUSE);

    // 3. Refine with a suggestion chip.
    const chip = page.getByRole("button", { name: "Cor mais forte" });
    await expect(chip).toBeVisible({ timeout: 15000 });
    await chip.click();
    await page.waitForTimeout(900);
    await page.getByRole("button", { name: "Refinar", exact: true }).click();
    await expect(page.getByText("Pronto — v2", { exact: true })).toBeVisible({ timeout: 15000 });
    await expect(page.locator(IFRAME)).toHaveAttribute("srcdoc", /Refinado/, {
      timeout: 15000,
    });
    await expect(preview.getByText("Refinado").first()).toBeVisible({ timeout: 20000 });
    await page.waitForTimeout(PAUSE);

    // 4. Undo back to v1.
    await page.getByRole("button", { name: "Desfazer" }).click();
    await expect(page.getByText("Voltou para v1", { exact: true })).toBeVisible({ timeout: 15000 });
    await page.waitForTimeout(PAUSE);

    // 5. Manual edit: select the button label in the editor and type over it.
    const editor = page.getByRole("textbox", { name: "Editor de código" });
    await editor.click();
    const start = await editor.evaluate((el) => {
      const ta = el as HTMLTextAreaElement;
      const i = ta.value.indexOf("Acao");
      if (i >= 0) {
        ta.focus();
        ta.setSelectionRange(i, i + "Acao".length);
      }
      return i;
    });
    expect(start, "mock fixture must contain the 'Acao' label").toBeGreaterThanOrEqual(0);
    await page.waitForTimeout(500);
    await page.keyboard.type("Assinar agora", { delay: 60 });
    await expect(preview.getByText("Assinar agora").first()).toBeVisible({
      timeout: 15000,
    });
    await page.waitForTimeout(2000);

    const video = page.video();
    await page.close();
    await video?.saveAs("test-results/demo/demo.webm");
  });
});
