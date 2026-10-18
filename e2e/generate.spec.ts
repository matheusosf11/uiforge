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

test.describe("refine smoke", () => {
  const isGenerate = (r: import("@playwright/test").Request) =>
    r.method() === "POST" && r.url().includes("/api/generate");

  test("refine, then undo back to v1", async ({ page }) => {
    await generate(page);
    await expect(page.getByText("Pronto — v1")).toBeVisible({ timeout: 15000 });

    const chip = page.getByRole("button", { name: "Cor mais forte" });
    await expect(chip).toBeVisible({ timeout: 15000 });
    const field = page.getByRole("textbox", { name: "Descreva a mudança" });
    let generateCalls = 0;
    page.on("request", (r) => {
      if (isGenerate(r)) generateCalls++;
    });
    await chip.click();
    await expect(field).toHaveValue(/cor de destaque mais forte/);
    expect(generateCalls).toBe(0);

    await page.getByRole("button", { name: "Refinar", exact: true }).click();
    await expect(page.getByText("Atualizando…")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("Pronto — v2")).toBeVisible({ timeout: 15000 });
    await expect(page.locator(IFRAME)).toHaveAttribute("srcdoc", /Refinado/);
    await expect(field).toHaveValue("");
    await expect(page.getByText("v2 · 2 versões")).toBeVisible();

    await page.getByRole("button", { name: "Desfazer" }).click();
    await expect(page.getByText("Voltou para v1")).toBeVisible();
    const iframe = page.locator(IFRAME);
    await expect(iframe).toHaveAttribute("srcdoc", /FixtureCard/);
    await expect(iframe).not.toHaveAttribute("srcdoc", /Refinado/);
  });

  test("refine failure keeps v1 and shows the alert", async ({ page }) => {
    await generate(page);
    await expect(page.getByText("Pronto — v1")).toBeVisible({ timeout: 15000 });

    const field = page.getByRole("textbox", { name: "Descreva a mudança" });
    await field.fill("__e2e_error__ refine");
    await page.getByRole("button", { name: "Refinar", exact: true }).click();

    const alert = page.getByRole("alert").first();
    await expect(alert).toBeVisible({ timeout: 15000 });
    await expect(alert).toContainText("Sua versão anterior foi mantida");
    await expect(page.locator(IFRAME)).toHaveAttribute("srcdoc", /FixtureCard/);
    await expect(page.getByText("v1 · 1 versão")).toBeVisible();
    await expect(field).toHaveValue("__e2e_error__ refine");
  });

  test("restore an earlier turn from the list", async ({ page }) => {
    await generate(page);
    await expect(page.getByText("Pronto — v1")).toBeVisible({ timeout: 15000 });

    await page.getByRole("textbox", { name: "Descreva a mudança" }).fill("azul");
    await page.getByRole("button", { name: "Refinar", exact: true }).click();
    await expect(page.getByText("Pronto — v2")).toBeVisible({ timeout: 15000 });

    const list = page.getByRole("list", { name: "Histórico de versões" });
    await expect(list).toBeVisible();
    await expect(list.getByRole("listitem")).toHaveCount(2);
    await expect(
      page.getByRole("button", { name: /^v2, versão atual:/ }),
    ).toHaveAttribute("aria-current", "true");

    await page.getByRole("button", { name: /^Restaurar v1:/ }).click();
    await expect(page.getByText("Voltou para v1")).toBeVisible();
    const iframe = page.locator(IFRAME);
    await expect(iframe).toHaveAttribute("srcdoc", /FixtureCard/);
    await expect(iframe).not.toHaveAttribute("srcdoc", /Refinado/);
    await expect(
      page.getByText("Refinar a partir da v1 — v2 será descartada"),
    ).toBeVisible();
    // The accessible name changes after restore, so re-query by the new name.
    const v1Current = page.getByRole("button", { name: /^v1, versão atual:/ });
    await expect(v1Current).toBeFocused();
    await expect(v1Current).toHaveAttribute("aria-current", "true");

    await page
      .getByRole("button", { name: /^Restaurar v2:.*Será descartada ao refinar\.$/ })
      .click();
    await expect(page.getByText("Foi para v2")).toBeVisible();
    await expect(iframe).toHaveAttribute("srcdoc", /Refinado/);
  });
});
