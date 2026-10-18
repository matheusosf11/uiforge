import { expect, test, type Page } from "@playwright/test";
import { fillPromptWhenReady } from "./helpers";

const IFRAME = 'iframe[title="Live preview"]';

async function generate(page: Page, prompt = "um card") {
  await page.goto("/");
  await fillPromptWhenReady(page, prompt);
  await page.getByRole("button", { name: "Gerar" }).click();
  await expect(page.getByText("Pronto — v1")).toBeVisible({ timeout: 15000 });
  await expect(page.frameLocator(IFRAME).getByText("FixtureCard").first()).toBeVisible({
    timeout: 20000,
  });
}

test("the project survives a reload and is listed in Projetos", async ({ page }) => {
  await generate(page);
  await page.reload();
  await expect(page.getByText("Projeto aberto — v1")).toBeVisible({ timeout: 15000 });
  await expect(page.frameLocator(IFRAME).getByText("FixtureCard").first()).toBeVisible({
    timeout: 20000,
  });
  await page.getByRole("button", { name: /^Projetos/ }).click();
  const dialog = page.getByRole("dialog", { name: "Projetos salvos" });
  await expect(dialog.getByText("um card")).toBeVisible();
  await expect(dialog.getByText(/Aberto agora/)).toBeVisible();
});

test("preview sizes and the dark page, with dark: classes following it", async ({ page }) => {
  await generate(page);
  await page.getByRole("radio", { name: "Celular (375px)" }).click();
  await expect
    .poll(async () => (await page.locator(IFRAME).boundingBox())?.width ?? 0)
    .toBeLessThanOrEqual(375);

  // Give the root a dark: background through the editor, then go dark.
  const editor = page.locator("#code-editor");
  const code = await editor.inputValue();
  await editor.fill(code.replace("bg-white p-6", "bg-white p-6 dark:bg-black"));
  await page.getByRole("button", { name: "Preview no modo escuro" }).click();
  const card = page.frameLocator(IFRAME).locator("div.shadow-md").first();
  await expect(card).toHaveCSS("background-color", "rgb(0, 0, 0)", { timeout: 20000 });
  await expect(page.frameLocator(IFRAME).locator("body")).toHaveCSS(
    "background-color",
    "rgb(2, 6, 23)",
  );

  // Back to light: the dark: class no longer applies.
  await page.getByRole("button", { name: "Preview no modo escuro" }).click();
  await expect(card).toHaveCSS("background-color", "rgb(255, 255, 255)", { timeout: 20000 });
});

test("visual editor recolors the preview and saves a version", async ({ page }) => {
  await generate(page);
  await page.getByRole("button", { name: "Visual" }).click();
  const button = page.frameLocator(IFRAME).getByRole("button", { name: "Acao" });
  const before = await button.evaluate((el) => getComputedStyle(el).backgroundColor);
  // The swatch input is visually hidden behind its circle.
  await page.getByRole("radio", { name: "Esmeralda" }).check({ force: true });
  await expect(button).toHaveClass(/bg-emerald-600/, { timeout: 20000 });
  await expect(button).not.toHaveCSS("background-color", before);
  await page.getByRole("button", { name: "Salvar como versão" }).click();
  await expect(page.getByText("Edição salva como v2")).toBeVisible();
});

test("Como usar downloads a zip with the component and a README", async ({ page }) => {
  await generate(page);
  await page.getByRole("button", { name: "Como usar" }).click();
  const dialog = page.getByRole("dialog", { name: "Usar FixtureCard.tsx em outro projeto" });
  await expect(dialog.getByText(/import FixtureCard from/)).toBeVisible();
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    dialog.getByRole("button", { name: "Baixar pacote (.zip)" }).click(),
  ]);
  expect(download.suggestedFilename()).toBe("FixtureCard.zip");
});

test("the gallery switches category and fills a complete prompt", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("radio", { name: "Dashboards" }).click();
  await page.getByRole("button", { name: /^Kanban:/ }).click();
  await expect(page.getByRole("textbox", { name: "Prompt" })).toHaveValue(/Quadro kanban/);
});
