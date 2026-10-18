/** Image types accepted as a visual reference (shared by the form and the route). */
export const IMAGE_MEDIA_TYPES = ["image/png", "image/jpeg", "image/webp"] as const;
export type ImageMediaType = (typeof IMAGE_MEDIA_TYPES)[number];

/** Max base64 length of the image sent to /api/generate (~1.1 MB of bytes). */
export const MAX_IMAGE_BASE64_LENGTH = 1_500_000;
/** Largest file the browser will try to shrink before refusing it. */
export const MAX_IMAGE_FILE_BYTES = 15 * 1024 * 1024;
/** Longest side of the image after shrinking. */
const MAX_IMAGE_SIDE = 1280;

/**
 * src the model uses for an <img> that shows the attached image. The preview
 * swaps it for the image itself; the downloaded code keeps it as a marker the
 * user replaces with a real path.
 */
export const IMAGE_TOKEN = "uiforge:image";

export type PromptImage = {
  mediaType: ImageMediaType;
  /** Base64 without the data: prefix. */
  data: string;
  name: string;
};

export const imageDataUrl = (image: PromptImage) =>
  `data:${image.mediaType};base64,${image.data}`;

export class PromptImageError extends Error {}

export function isImageMediaType(type: string): type is ImageMediaType {
  return (IMAGE_MEDIA_TYPES as readonly string[]).includes(type);
}

/**
 * Shrinks the file to at most MAX_IMAGE_SIDE px and re-encodes it as JPEG
 * (white background, so transparent PNGs don't turn black) until it fits
 * MAX_IMAGE_BASE64_LENGTH. Throws PromptImageError with a pt-BR message.
 */
export async function prepareImage(file: File): Promise<PromptImage> {
  if (!isImageMediaType(file.type)) {
    throw new PromptImageError("Use uma imagem PNG, JPG ou WebP.");
  }
  if (file.size > MAX_IMAGE_FILE_BYTES) {
    throw new PromptImageError("A imagem é grande demais (máximo de 15 MB).");
  }
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new PromptImageError("Não foi possível ler a imagem.");
  }
  try {
    for (const [side, quality] of [
      [MAX_IMAGE_SIDE, 0.85],
      [MAX_IMAGE_SIDE, 0.7],
      [960, 0.7],
      [720, 0.6],
    ] as const) {
      const scale = Math.min(1, side / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      const ctx = canvas.getContext("2d");
      if (!ctx) break;
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      const data = canvas.toDataURL("image/jpeg", quality).split(",")[1] ?? "";
      if (data && data.length <= MAX_IMAGE_BASE64_LENGTH) {
        return { mediaType: "image/jpeg", data, name: file.name || "imagem" };
      }
    }
  } finally {
    bitmap.close();
  }
  throw new PromptImageError("Não foi possível reduzir a imagem. Tente outra.");
}

/** Code for the preview with every IMAGE_TOKEN pointing at the image. */
export function withPreviewImage(code: string, dataUrl: string | null): string {
  if (!dataUrl || !code.includes(IMAGE_TOKEN)) return code;
  return code.split(IMAGE_TOKEN).join(dataUrl);
}
