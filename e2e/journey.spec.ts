import { test, expect, type Page } from "@playwright/test";

// Same conventions as generate.spec.ts (D-02), redefined locally on purpose.
const IFRAME = 'iframe[title="Live preview"]';

const isGenerate = (r: import("@playwright/test").Request) =>
  r.method() === "POST" && r.url().includes("/api/generate");

async function generate(page: Page, prompt = "a simple card") {
  await page.goto("/");
  await page.getByRole("textbox", { name: "Prompt" }).fill(prompt);
  await page.getByRole("button", { name: "Gerar" }).click();
}

test.describe.configure({ mode: "serial" });

// D-03: only final states and network requests are asserted, never the
// transient badges shown while a request is in flight.
test("journey: generate, refine, undo, edit, refine after edit, failed refine keeps previous", async ({
  page,
}) => {
  const iframe = page.locator(IFRAME);
  const field = page.getByRole("textbox", { name: "Descreva a mudança" });
  const refineButton = page.getByRole("button", { name: "Refinar", exact: true });
  const editor = page.getByRole("textbox", { name: "Editor de código" });

  // (1) Generate v1.
  await generate(page);
  await expect(page.getByText("Pronto — v1")).toBeVisible({ timeout: 15000 });
  // The preview is a dynamic chunk, so give it time to mount.
  await expect(iframe).toHaveAttribute("srcdoc", /FixtureCard/, {
    timeout: 15000,
  });

  // (2) Refine to v2; the request carries v1 as currentCode.
  await field.fill("azul");
  const refineReq = page.waitForRequest(isGenerate);
  const refineRes = page.waitForResponse((res) => isGenerate(res.request()));
  await refineButton.click();
  expect((await refineReq).postDataJSON().currentCode).toContain("FixtureCard");
  expect((await refineRes).ok()).toBe(true);
  await expect(page.getByText("Pronto — v2")).toBeVisible({ timeout: 15000 });
  await expect(iframe).toHaveAttribute("srcdoc", /Refinado/, { timeout: 15000 });
  await expect(page.getByText("v2 · 2 versões")).toBeVisible();

  // (3) Undo back to v1; v2 survives as a later version.
  await page.getByRole("button", { name: "Desfazer" }).click();
  await expect(page.getByText("Voltou para v1")).toBeVisible();
  await expect(iframe).toHaveAttribute("srcdoc", /FixtureCard/);
  await expect(iframe).not.toHaveAttribute("srcdoc", /Refinado/);
  await expect(
    page.getByText("Refinar a partir da v1 — v2 será descartada"),
  ).toBeVisible();

  // (4) Manual edit on v1 becomes a draft and reaches the preview.
  const original = await editor.inputValue();
  await editor.fill(`${original}\n// __edited__ marca-journey`);
  const codeSection = page.getByRole("region", { name: "Código" });
  await expect(codeSection.getByText("Editado", { exact: true })).toBeVisible();
  // Debounced draft (500 ms).
  await expect(iframe).toHaveAttribute("srcdoc", /marca-journey/, {
    timeout: 15000,
  });

  // (5) Refine after the edit. Committing the edit from v1 discards v2, so the
  // manual edit is recorded as v2 and the refined result becomes v3.
  await field.fill("borda maior");
  const editReq = page.waitForRequest(isGenerate);
  await refineButton.click();
  const editBody = (await editReq).postDataJSON();
  expect(editBody.currentCode).toContain("__edited__");
  expect(editBody.currentCode).toContain("marca-journey");
  await expect(page.getByText("Pronto — v3")).toBeVisible({ timeout: 15000 });
  await expect(iframe).toHaveAttribute("srcdoc", /Refinado/, { timeout: 15000 });
  await expect(iframe).toHaveAttribute("srcdoc", /EditedSeen/);
  await expect(
    page.getByRole("list", { name: "Histórico de versões" }),
  ).toContainText("Edição manual");
  await expect(page.getByText("v3 · 3 versões")).toBeVisible();

  // (6) A failed refine keeps v3: same code, same preview, alert shown.
  const srcdocBefore = await iframe.getAttribute("srcdoc");
  const codeBefore = await editor.inputValue();
  await field.fill("__e2e_error__ journey");
  await refineButton.click();
  // Filter by text so the preview's own load-timeout alert cannot match.
  const alert = page
    .getByRole("alert")
    .filter({ hasText: "Sua versão anterior foi mantida" });
  await expect(alert).toBeVisible({ timeout: 15000 });
  await expect(alert).toContainText("Sua versão anterior foi mantida");
  await expect(iframe).toHaveAttribute("srcdoc", srcdocBefore ?? "");
  await expect(editor).toHaveValue(codeBefore);
  await expect(page.getByText("v3 · 3 versões")).toBeVisible();
  await expect(field).toHaveValue("__e2e_error__ journey");
});
