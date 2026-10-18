import { describe, expect, it } from "vitest";
import {
  IMAGE_TOKEN,
  imageToken,
  imageDataUrl,
  isImageMediaType,
  prepareImage,
  PromptImageError,
  withPreviewImages,
} from "@/lib/prompt-image";

describe("withPreviewImages", () => {
  const A = "data:image/jpeg;base64,AA";
  const B = "data:image/jpeg;base64,BB";

  it("points each numbered token at its image", () => {
    const code = `<img src="${imageToken(2)}" /><img src="${imageToken(1)}" /><img src="${imageToken(2)}" />`;
    expect(withPreviewImages(code, [A, B])).toBe(
      `<img src="${B}" /><img src="${A}" /><img src="${B}" />`,
    );
  });

  it("treats the bare token from the first version as image 1", () => {
    expect(withPreviewImages(`<img src="${IMAGE_TOKEN}" />`, [A, B])).toBe(
      `<img src="${A}" />`,
    );
  });

  it("leaves tokens without an image, and code without images, alone", () => {
    const code = `<img src="${imageToken(3)}" />`;
    expect(withPreviewImages(code, [A])).toBe(code);
    expect(withPreviewImages(code, [])).toBe(code);
    expect(withPreviewImages("<div />", [A])).toBe("<div />");
  });
});

describe("prompt image helpers", () => {
  it("builds the data URL", () => {
    expect(
      imageDataUrl({ mediaType: "image/png", data: "AAAA", name: "a.png" }),
    ).toBe("data:image/png;base64,AAAA");
  });

  it("accepts only PNG, JPEG and WebP", () => {
    expect(isImageMediaType("image/png")).toBe(true);
    expect(isImageMediaType("image/webp")).toBe(true);
    expect(isImageMediaType("image/gif")).toBe(false);
    expect(isImageMediaType("image/svg+xml")).toBe(false);
  });

  it("refuses other file types and huge files before reading them", async () => {
    await expect(
      prepareImage(new File(["x"], "a.gif", { type: "image/gif" })),
    ).rejects.toThrow(PromptImageError);
    const huge = new File(["x"], "a.png", { type: "image/png" });
    Object.defineProperty(huge, "size", { value: 16 * 1024 * 1024 });
    await expect(prepareImage(huge)).rejects.toThrow(/15 MB/);
  });
});
