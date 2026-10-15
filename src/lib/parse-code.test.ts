/// <reference types="vitest/globals" />
import { parseCode } from "./parse-code";

const SAMPLE = `export default function Button() {
  return <button className="rounded bg-blue-600 px-4 py-2 text-white">Click</button>;
}`;

const UNTERMINATED_BODY = "export default function A(){return null}";

const FIXTURES: string[] = [
  "const x = 1;",
  "```tsx\n" + SAMPLE + "\n```",
  "```jsx\n" + SAMPLE + "\n```",
  "```react\n" + SAMPLE + "\n```",
  "```ts\nconst x = 1;\n```",
  "```\n" + SAMPLE + "\n```",
  "Here's your component:\n```tsx\n" + SAMPLE + "\n```",
  "```tsx\n" + SAMPLE + "\n```\nHope this helps!",
  "```tsx\n" + UNTERMINATED_BODY,
  "``",
  "",
];

describe("parseCode", () => {
  it("returns trimmed input when there is no fence", () => {
    expect(parseCode("const x = 1;")).toBe("const x = 1;");
    expect(parseCode("  const x = 1;  ")).toBe("const x = 1;");
  });

  it("strips a leading ```tsx fence and a trailing fence", () => {
    expect(parseCode("```tsx\n" + SAMPLE + "\n```")).toBe(SAMPLE);
  });

  it("strips a jsx fence and language tag", () => {
    expect(parseCode("```jsx\n" + SAMPLE + "\n```")).toBe(SAMPLE);
  });

  it("strips a react fence and language tag", () => {
    expect(parseCode("```react\n" + SAMPLE + "\n```")).toBe(SAMPLE);
  });

  it("strips a ts fence and language tag", () => {
    expect(parseCode("```ts\nconst x = 1;\n```")).toBe("const x = 1;");
  });

  it("strips an unlabelled fence", () => {
    expect(parseCode("```\n" + SAMPLE + "\n```")).toBe(SAMPLE);
  });

  it("strips leading prose around a fenced block", () => {
    expect(parseCode("Here's your component:\n```tsx\n" + SAMPLE + "\n```")).toBe(
      SAMPLE,
    );
  });

  it("strips trailing prose after a fenced block", () => {
    expect(parseCode("```tsx\n" + SAMPLE + "\n```\nHope this helps!")).toBe(
      SAMPLE,
    );
  });

  it("tolerates an unterminated mid-stream fence without inventing a closer", () => {
    const raw = "```tsx\n" + UNTERMINATED_BODY;
    expect(() => parseCode(raw)).not.toThrow();
    expect(parseCode(raw)).toBe(UNTERMINATED_BODY);
    expect(parseCode(raw)).not.toMatch(/```/);
  });

  it("never throws on a mid-stream incomplete fence marker", () => {
    expect(() => parseCode("``")).not.toThrow();
    const result = parseCode("``");
    expect(typeof result).toBe("string");
    expect(["", "``"]).toContain(result);
  });

  it("is idempotent for every fixture", () => {
    for (const fixture of FIXTURES) {
      expect(parseCode(parseCode(fixture))).toBe(parseCode(fixture));
    }
  });

  it("returns an empty string for empty input", () => {
    expect(parseCode("")).toBe("");
  });

  it("does not treat inner markdown fences in bare TSX as wrappers", () => {
    const src = `export default function Docs() {
  return (
    <pre>{\`\`\`tsx
const x = 1
\`\`\`}</pre>
  );
}`;
    expect(parseCode(src)).toBe(src);
  });
});
