import { expect, test, type Locator, type Page } from "@playwright/test";

test.use({ viewport: { width: 1280, height: 900 } });

const card = (page: Page, name: string) =>
  page.getByRole("listitem", { name: `Card ${name}` });

async function dragByHandle(page: Page, from: Locator, to: Locator) {
  const handle = from.locator("[data-drag-handle]");
  const start = await handle.boundingBox();
  const target = await to.boundingBox();
  if (!start || !target) throw new Error("missing boxes");
  await page.mouse.move(start.x + start.width / 2, start.y + start.height / 2);
  await page.mouse.down();
  const tx = target.x + target.width / 2;
  const ty = target.y + target.height / 2;
  // Small, paced steps so the grid sees the drag and reorders on the way.
  for (let i = 1; i <= 20; i++) {
    await page.mouse.move(
      start.x + ((tx - start.x) * i) / 20,
      start.y + ((ty - start.y) * i) / 20,
    );
    await page.waitForTimeout(30);
  }
  await page.mouse.up();
}

test("cards swap places by dragging the grip and the order survives a reload", async ({
  page,
}) => {
  await page.goto("/");
  const prompt = card(page, "Prompt");
  const preview = card(page, "Preview");
  await expect(prompt).toHaveAttribute("aria-posinset", "1");
  await expect(preview).toHaveAttribute("aria-posinset", "2");
  // Let the cards' entrance animation settle before grabbing one.
  await page.waitForTimeout(1000);

  await dragByHandle(page, prompt, preview);
  await expect(prompt).toHaveAttribute("aria-posinset", "2");
  await expect(preview).toHaveAttribute("aria-posinset", "1");

  // Typing in the prompt still works (drag only starts from the grip).
  const field = page.getByRole("textbox", { name: "Prompt" });
  await field.click();
  await field.fill("Um botão azul");
  await expect(field).toHaveValue("Um botão azul");

  await page.reload();
  await expect(card(page, "Prompt")).toHaveAttribute("aria-posinset", "2");

  await page.getByRole("button", { name: "Restaurar layout" }).click();
  await expect(card(page, "Prompt")).toHaveAttribute("aria-posinset", "1");
});
