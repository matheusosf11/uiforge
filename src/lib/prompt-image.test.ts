import { describe, expect, it } from "vitest";
import {
  IMAGE_TOKEN,
  imageDataUrl,
  isImageMediaType,
  prepareImage,
  PromptImageError,
  withPreviewImage,
} from "@/lib/prompt-image";

describe("withPreviewImage", () => {
  const code = `<img src="${IMAGE_TOKEN}" /><img src="${IMAGE_TOKEN}" />`;

  it("points every token at the image", () => {
    expect(withPreviewImage(code, "data:image/jpeg;base64,AA")).toBe(
      '<img src="data:image/jpeg;base64,AA" /><img src="data:image/jpeg;base64,AA" />',
    );
  });

  it("leaves the code alone without an image or a token", () => {
    expect(withPreviewImage(code, null)).toBe(code);
    expect(withPreviewImage("<div />", "data:x")).toBe("<div />");
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
