import { ImageResponse } from "next/og";

export const alt = "UIForge - Prompt -> React + Tailwind, ao vivo";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#0a0a0a",
          color: "#fafafa",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ fontSize: 120, fontWeight: 700, letterSpacing: -4 }}>
          UIForge
        </div>
        <div style={{ fontSize: 40, marginTop: 24, color: "#a1a1aa" }}>
          Prompt -&gt; React + Tailwind, ao vivo
        </div>
      </div>
    ),
    { ...size },
  );
}
