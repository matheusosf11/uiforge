export const COMPONENT_PATH = "/Component.tsx";
export const APP_PATH = "/App.tsx";
export const APP_WRAPPER = `import Component from "./Component";

export default function App() {
  return (
    <div className="min-h-screen bg-white p-6 text-slate-900">
      <Component />
    </div>
  );
}
`;

export function buildSandpackFiles(code: string): {
  [path: string]: { code: string; hidden: boolean };
} {
  return {
    [COMPONENT_PATH]: { code, hidden: true },
    [APP_PATH]: { code: APP_WRAPPER, hidden: true },
  };
}

export function hasDefaultExport(code: string): boolean {
  return /export\s+default/.test(code);
}
