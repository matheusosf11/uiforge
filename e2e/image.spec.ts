import { expect, test } from "@playwright/test";
import { fillPromptWhenReady } from "./helpers";

const IFRAME = 'iframe[title="Live preview"]';
const FILE_INPUT = 'input[type="file"]';

// 2x2 red PNG.
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAEElEQVR4nGP4z8AARAwQCgAf7gP9i18U1AAAAABJRU5ErkJggg==",
  "base64",
);

test("an attached image is sent as a reference and shows in the preview", async ({
  page,
}) => {
  await page.goto("/");
  await fillPromptWhenReady(page, "um card igual ao print");
  await page
    .locator(FILE_INPUT)
    .setInputFiles({ name: "print.png", mimeType: "image/png", buffer: PNG });
  await expect(
    page.getByRole("img", { name: "Imagem de referência anexada" }),
  ).toBeVisible();
  await expect(page.getByText("print.png")).toBeVisible();
  await expect(page.getByRole("button", { name: "Trocar imagem" })).toBeVisible();

  const request = page.waitForRequest(
    (r) => r.method() === "POST" && r.url().includes("/api/generate"),
  );
  await page.getByRole("button", { name: "Gerar" }).click();
  const body = (await request).postDataJSON();
  expect(body.image.mediaType).toBe("image/jpeg");
  expect(body.image.data.length).toBeGreaterThan(0);
  expect(body.image.name).toBeUndefined();

  await expect(page.getByText("Pronto")).toBeVisible({ timeout: 15000 });
  // Committed: the attachment is cleared from the form.
  await expect(
    page.getByRole("img", { name: "Imagem de referência anexada" }),
  ).toHaveCount(0);

  // The preview swaps the token for the image; the code keeps the token.
  const preview = page.frameLocator(IFRAME);
  await expect(preview.getByText("ImageSeen")).toBeVisible({ timeout: 20000 });
  await expect(preview.getByRole("img", { name: "Imagem enviada" })).toHaveAttribute(
    "src",
    /^data:image\/jpeg;base64,/,
  );
  await expect(page.locator("#code-editor")).toHaveValue(/src="uiforge:image"/);
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
