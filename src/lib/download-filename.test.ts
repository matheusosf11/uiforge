/// <reference types="vitest/globals" />
import { componentFilename } from "./download-filename";

describe("componentFilename", () => {
  it("usa o nome da funcao exportada por default", () => {
    expect(componentFilename("export default function PricingCard() {}")).toBe(
      "PricingCard.tsx",
    );
  });

  it("aceita funcao async", () => {
    expect(componentFilename("export default async function Foo() {}")).toBe(
      "Foo.tsx",
    );
  });

  it("aceita classe", () => {
    expect(componentFilename("export default class Panel {}")).toBe(
      "Panel.tsx",
    );
  });

  it("aceita alias com inicial maiuscula", () => {
    expect(componentFilename("const Btn = () => null;\nexport default Btn;")).toBe(
      "Btn.tsx",
    );
  });

  it("aceita alias sem ponto e virgula no fim da linha", () => {
    expect(
      componentFilename("const Card = () => null\nexport default Card\n"),
    ).toBe("Card.tsx");
  });

  it("cai em Component.tsx para casos sem nome claro", () => {
    expect(componentFilename("export default function () {}")).toBe(
      "Component.tsx",
    );
    expect(componentFilename("export default memo(Button)")).toBe(
      "Component.tsx",
    );
    expect(componentFilename("export default React.memo(Card);")).toBe(
      "Component.tsx",
    );
    expect(
      componentFilename("export default Object.assign(Root, { Item });"),
    ).toBe("Component.tsx");
    expect(componentFilename("")).toBe("Component.tsx");
    expect(componentFilename("const A = 1;")).toBe("Component.tsx");
  });

  it("sempre devolve um identificador seguro com sufixo .tsx", () => {
    const inputs = [
      "export default function PricingCard() {}",
      "export default class Panel {}",
      "export default function ../../etc() {}",
      "export default ../evil;",
      "",
    ];
    for (const input of inputs) {
      const name = componentFilename(input);
      expect(name).toMatch(/^[A-Za-z_$][\w$]*\.tsx$/);
      expect(name).not.toContain("/");
      expect(name).not.toContain("..");
    }
  });
});
