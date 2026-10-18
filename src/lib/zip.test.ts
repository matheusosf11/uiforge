/// <reference types="vitest/globals" />
import { crc32, createZip } from "./zip";

const enc = new TextEncoder();

describe("crc32", () => {
  it("matches the standard check value", () => {
    expect(crc32(enc.encode("123456789"))).toBe(0xcbf43926);
    expect(crc32(new Uint8Array())).toBe(0);
  });
});

describe("createZip", () => {
  it("writes stored entries, a central directory and the end record", () => {
    const zip = createZip(
      [
        { name: "Card.tsx", content: "export default function Card() {}" },
        { name: "README.md", content: "# Card — guia" },
      ],
      new Date(2026, 9, 18, 12, 30, 10),
    );
    const view = new DataView(zip.buffer);
    expect(view.getUint32(0, true)).toBe(0x04034b50);
    expect(view.getUint16(8, true)).toBe(0); // stored
    const end = zip.length - 22;
    expect(view.getUint32(end, true)).toBe(0x06054b50);
    expect(view.getUint16(end + 10, true)).toBe(2);
    const centralOffset = view.getUint32(end + 16, true);
    expect(view.getUint32(centralOffset, true)).toBe(0x02014b50);

    // First entry: name, then the raw content.
    const nameLen = view.getUint16(26, true);
    const name = new TextDecoder().decode(zip.slice(30, 30 + nameLen));
    expect(name).toBe("Card.tsx");
    const size = view.getUint32(18, true);
    const content = new TextDecoder().decode(zip.slice(30 + nameLen, 30 + nameLen + size));
    expect(content).toBe("export default function Card() {}");
    expect(view.getUint32(14, true)).toBe(crc32(enc.encode(content)));
  });
});
