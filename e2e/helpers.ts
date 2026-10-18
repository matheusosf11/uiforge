import { expect, type Page } from "@playwright/test";

/**
 * Types the prompt once the form is live. A fill made before hydration is
 * wiped when React takes over (the field is controlled), which left Gerar
 * disabled and the test timing out; an enabled Gerar proves the text stuck.
 */
export async function fillPromptWhenReady(page: Page, text: string) {
  await expect(async () => {
    await page.getByRole("textbox", { name: "Prompt" }).fill(text);
    await expect(page.getByRole("button", { name: "Gerar" })).toBeEnabled({
      timeout: 1000,
    });
  }).toPass({ timeout: 15000 });
}
