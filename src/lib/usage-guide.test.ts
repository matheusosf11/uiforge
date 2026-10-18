/// <reference types="vitest/globals" />
import { usageReadme, usageSteps } from "./usage-guide";

const PLAIN = `export default function PriceCard() {\n  return <div className="p-4">R$ 10</div>;\n}`;
const RICH = `import { useState } from "react";\nexport default function Toggle() {\n  const [on, setOn] = useState(false);\n  return <button className="bg-white dark:bg-slate-900"><img src="uiforge:image-1" alt="" /></button>;\n}`;

describe("usageSteps", () => {
  it("covers setup, copy and import with the component's own name", () => {
    const titles = usageSteps(PLAIN).map((s) => s.title);
    expect(titles).toEqual([
      "Requisitos",
      "Se ainda não tem Tailwind",
      "Ative o plugin e importe o CSS",
      "Copie o arquivo",
      "Use o componente",
    ]);
    const use = usageSteps(PLAIN).find((s) => s.title === "Use o componente");
    expect(use?.code).toContain('import PriceCard from "./components/PriceCard";');
    expect(use?.code).toContain("<PriceCard />");
  });

  it("adds use client, dark mode and image notes only when the code needs them", () => {
    const titles = usageSteps(RICH).map((s) => s.title);
    expect(titles).toContain("Next.js (App Router)");
    expect(titles).toContain("Modo escuro");
    expect(titles).toContain("Imagens de referência");
  });
});

describe("usageReadme", () => {
  it("is a numbered markdown guide with fenced code", () => {
    const md = usageReadme(PLAIN);
    expect(md.startsWith("# PriceCard\n")).toBe(true);
    expect(md).toContain("- `PriceCard.tsx`: o componente (export default)");
    expect(md).toContain("## 5. Use o componente");
    expect(md).toContain("```bash\nnpm install tailwindcss @tailwindcss/vite\n```");
  });
});
