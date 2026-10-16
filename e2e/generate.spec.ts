import { test, expect, type Page } from "@playwright/test";

const IFRAME = 'iframe[title="Live preview"]';

async function generate(page: Page, prompt = "a simple card") {
  await page.goto("/");
  await page.getByRole("textbox", { name: "Prompt" }).fill(prompt);
  await page.getByRole("button", { name: "Gerar" }).click();
}

test("happy path: prompt streams code and preview mounts FixtureCard", async ({
  page,
}) => {
  await generate(page);
  await expect(page.getByText("Pronto")).toBeVisible({ timeout: 15000 });
  const iframe = page.locator(IFRAME);
  await expect(iframe).toBeVisible();
  // Offline-safe assertion on the generated document.
  await expect(iframe).toHaveAttribute("srcdoc", /FixtureCard/);
  // Depends on the CDN-hosted runtime inside the iframe, hence the long timeout.
  await expect(
    page.frameLocator(IFRAME).getByText("FixtureCard").first(),
  ).toBeVisible({ timeout: 20000 });
});

test("mid-stream error shows alert and retry resends the same prompt", async ({
  page,
}) => {
  const prompt = "__e2e_error__ test";
  const isGenerate = (r: import("@playwright/test").Request) =>
    r.method() === "POST" && r.url().includes("/api/generate");
  const firstReq = page.waitForRequest(isGenerate);
  await generate(page, prompt);
  const first = await firstReq;
  const alert = page.getByRole("alert").first();
  await expect(alert).toBeVisible({ timeout: 15000 });
  const retry = page.getByRole("button", { name: "Tentar de novo" });
  await expect(retry).toBeVisible();

  const secondReq = page.waitForRequest(isGenerate);
  await retry.click();
  const second = await secondReq;
  expect(second.postDataJSON().prompt).toBe(first.postDataJSON().prompt);
  // Fails again by design (same error keyword).
  await expect(page.getByRole("alert").first()).toBeVisible({ timeout: 15000 });
});

test.describe("copy and download", () => {
  test.use({ permissions: ["clipboard-read", "clipboard-write"] });

  test("Copiar fills clipboard and Baixar downloads FixtureCard.tsx", async ({
    page,
  }) => {
    await generate(page);
    await expect(page.getByText("Pronto")).toBeVisible({ timeout: 15000 });

    await page.getByRole("button", { name: "Copiar" }).click();
    const text = await page.evaluate(() => navigator.clipboard.readText());
    expect(text).toContain("export default function FixtureCard");

    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("button", { name: "Baixar" }).click(),
    ]);
    expect(download.suggestedFilename()).toBe("FixtureCard.tsx");
  });
});

test.describe("mobile", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("tabs switch between Preview and Código panels", async ({ page }) => {
    await generate(page);
    await expect(page.getByText("Pronto")).toBeVisible({ timeout: 15000 });

    const codeTab = page.getByRole("tab", { name: "Código" });
    await codeTab.click();
    await expect(codeTab).toHaveAttribute("aria-selected", "true");
    await expect(page.locator("#panel-code")).toBeVisible();
    await expect(page.locator("#panel-preview")).toBeHidden();

    await page.getByRole("tab", { name: "Preview" }).click();
    await expect(page.locator("#panel-preview")).toBeVisible();
  });
});
