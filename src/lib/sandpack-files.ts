export const COMPONENT_PATH = "/Component.tsx";
export const APP_PATH = "/App.tsx";
export const INDEX_PATH = "/index.tsx";
export const STYLES_PATH = "/styles.css";

export const APP_WRAPPER = `import Component from "./Component";

export default function App() {
  return (
    <div className="min-h-[280px] bg-white p-6 text-slate-900">
      <Component />
    </div>
  );
}
`;

export const INDEX_ENTRY = `import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./styles.css";

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Root element #root not found");
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>
);
`;

export const PREVIEW_STYLES = `html, body, #root {
  margin: 0;
  min-height: 100%;
  background: #fff;
  color: #0f172a;
}

body {
  font-family: sans-serif;
  -webkit-font-smoothing: auto;
}
`;

export function buildSandpackFiles(code: string): {
  [path: string]: { code: string; hidden: boolean };
} {
  return {
    [COMPONENT_PATH]: { code, hidden: true },
    [APP_PATH]: { code: APP_WRAPPER, hidden: true },
    [INDEX_PATH]: { code: INDEX_ENTRY, hidden: true },
    [STYLES_PATH]: { code: PREVIEW_STYLES, hidden: true },
  };
}

export function hasDefaultExport(code: string): boolean {
  return /export\s+default/.test(code);
}
