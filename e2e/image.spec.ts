import { expect, test, type Page } from "@playwright/test";
import { fillPromptWhenReady } from "./helpers";

const IFRAME = 'iframe[title="Live preview"]';
const FILE_INPUT = 'input[type="file"]';

// 2x2 red PNG.
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAEElEQVR4nGP4z8AARAwQCgAf7gP9i18U1AAAAABJRU5ErkJggg==",
  "base64",
);
const png = (name: string) => ({ name, mimeType: "image/png", buffer: PNG });

const thumbs = (page: Page) =>
  page.getByRole("list", { name: /Imagens de referência/ }).getByRole("listitem");

test("several attached images are sent in order and each shows in the preview", async ({
  page,
}) => {
  await page.goto("/");
  await fillPromptWhenReady(page, "layout da imagem 1 com a foto da imagem 2");
  await page.locator(FILE_INPUT).setInputFiles([png("layout.png"), png("foto.png")]);
  await expect(thumbs(page)).toHaveCount(2);
  await expect(page.getByRole("img", { name: "Imagem 1 anexada" })).toBeVisible();
  await expect(page.getByText("foto.png")).toBeVisible();
  await expect(page.getByRole("button", { name: "Imagem (2/4)" })).toBeVisible();

  // Removing one and adding another keeps the order of what is left.
  await page.getByRole("button", { name: "Remover imagem 1" }).click();
  await page.locator(FILE_INPUT).setInputFiles(png("logo.png"));
  await expect(thumbs(page)).toHaveCount(2);
  await expect(thumbs(page).nth(0)).toContainText("foto.png");
  await expect(thumbs(page).nth(1)).toContainText("logo.png");

  const request = page.waitForRequest(
    (r) => r.method() === "POST" && r.url().includes("/api/generate"),
  );
  await page.getByRole("button", { name: "Gerar" }).click();
  const body = (await request).postDataJSON();
  expect(body.images).toHaveLength(2);
  for (const img of body.images) {
    expect(img.mediaType).toBe("image/jpeg");
    expect(img.data.length).toBeGreaterThan(0);
    expect(img.name).toBeUndefined();
  }

  await expect(page.getByText("Pronto")).toBeVisible({ timeout: 15000 });
  // Committed: the attachments are cleared from the form.
  await expect(thumbs(page)).toHaveCount(0);

  // The preview swaps each token for its image; the code keeps the tokens.
  const preview = page.frameLocator(IFRAME);
  await expect(preview.getByText("ImageSeen 2")).toBeVisible({ timeout: 20000 });
  for (const name of ["Imagem 1", "Imagem 2"]) {
    await expect(preview.getByRole("img", { name })).toHaveAttribute(
      "src",
      /^data:image\/jpeg;base64,/,
    );
  }
  const editor = page.locator("#code-editor");
  await expect(editor).toHaveValue(/src="uiforge:image-1"/);
  await expect(editor).toHaveValue(/src="uiforge:image-2"/);
});

test("at most 4 images are attached and the extras are reported", async ({ page }) => {
  await page.goto("/");
  await fillPromptWhenReady(page, "x");
  await page
    .locator(FILE_INPUT)
    .setInputFiles(["1", "2", "3", "4", "5"].map((n) => png(`${n}.png`)));
  await expect(thumbs(page)).toHaveCount(4);
  await expect(
    page.getByText("Você pode anexar no máximo 4 imagens; as extras foram ignoradas."),
  ).toHaveAttribute("role", "alert");
  await expect(page.getByRole("button", { name: "Imagem (4/4)" })).toBeDisabled();
});

test("a file that is not an image is refused with a message", async ({ page }) => {
  await page.goto("/");
  await fillPromptWhenReady(page, "x");
  await page.locator(FILE_INPUT).setInputFiles({
    name: "anim.gif",
    mimeType: "image/gif",
    buffer: Buffer.from("GIF89a"),
  });
  await expect(page.getByText("Use uma imagem PNG, JPG ou WebP.")).toHaveAttribute(
    "role",
    "alert",
  );
});
