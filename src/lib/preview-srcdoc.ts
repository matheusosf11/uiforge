const REACT_IMPORT =
  /import\s+([\s\S]*?)\s+from\s+["']react["']\s*;?/g;

export function rewriteGeneratedCodeForPreview(code: string): string {
  let next = code.trim();
  next = next.replace(/^[ \t]*import[ \t]+type\b(?:\{[^}]*\}|[^\n;{])*(?:;|$)/gm, "");
  next = next.replace(REACT_IMPORT, (_match, spec: string) => {
    const trimmed = spec.trim();
    const named = trimmed.match(/\{([^}]+)\}/);
    if (named) {
      return `const {${named[1]}} = React;`;
    }
    if (trimmed === "React" || trimmed.startsWith("* as ")) {
      return "";
    }
    return `const ${trimmed} = React;`;
  });
  next = next.replace(/export\s+default\s+/, "const __Generated = ");
  next = next.replace(/export\s+\{[^}]*\}\s*;?/g, "");
  return next.trim();
}

// Runtime scripts are self-hosted from public/preview-runtime (same site as the
// app) instead of a third-party CDN: ad/privacy blockers that block jsDelivr
// left the iframe stuck on a blank page with no error. A srcdoc document
// resolves root-relative URLs against the embedding page.
export const PREVIEW_RUNTIME = {
  tailwind: "/preview-runtime/tailwind-browser-4.3.3.js",
  react: "/preview-runtime/react-18.3.1.development.js",
  reactDom: "/preview-runtime/react-dom-18.3.1.development.js",
  babel: "/preview-runtime/babel-standalone-7.28.5.min.js",
} as const;

export type PreviewTheme = "light" | "dark";

// Page colors behind the component in each preview theme.
const THEME_COLORS: Record<PreviewTheme, { background: string; color: string }> = {
  light: { background: "#fff", color: "#0f172a" },
  dark: { background: "#020617", color: "#e2e8f0" },
};

export function buildPreviewSrcdoc(
  code: string,
  opts: { theme?: PreviewTheme } = {},
): string {
  const theme = opts.theme ?? "light";
  const colors = THEME_COLORS[theme];
  const rewritten = rewriteGeneratedCodeForPreview(code);
  const payload = JSON.stringify(rewritten).replace(/</g, "\\u003c");

  return `<!DOCTYPE html>
<html${theme === "dark" ? ' class="dark"' : ""}>
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="color-scheme" content="${theme}" />
    <script src="${PREVIEW_RUNTIME.tailwind}"></script>
    <style type="text/tailwindcss">
      /* dark: utilities follow the "dark" class on <html>, not the OS. */
      @custom-variant dark (&:where(.dark, .dark *));
    </style>
    <style>
      html { color-scheme: ${theme}; }
      html, body, #root { margin: 0; min-height: 100%; background: ${colors.background}; color: ${colors.color}; }
      body { font-family: ui-sans-serif, system-ui, sans-serif; padding: 1.5rem; }
      #uiforge-error {
        display: none;
        margin: 0 0 1rem;
        padding: 0.75rem 1rem;
        border: 1px solid #fecaca;
        border-radius: 0.75rem;
        background: #fef2f2;
        color: #b91c1c;
        font-size: 0.875rem;
        white-space: pre-wrap;
      }
    </style>
  </head>
  <body>
    <pre id="uiforge-error"></pre>
    <div id="root"></div>
    <script src="${PREVIEW_RUNTIME.react}"></script>
    <script src="${PREVIEW_RUNTIME.reactDom}"></script>
    <script src="${PREVIEW_RUNTIME.babel}"></script>
    <script>
      (function () {
        var errorEl = document.getElementById("uiforge-error");
        function fail(err) {
          var message = (err && err.message) ? err.message : String(err);
          errorEl.style.display = "block";
          errorEl.textContent = message;
          if (window.parent) {
            window.parent.postMessage({ type: "uiforge-preview-error", message: message }, "*");
          }
        }
        window.onerror = function (message) {
          fail(message);
        };
        try {
          if (!window.Babel || !window.React || !window.ReactDOM) {
            throw new Error("Falha ao carregar o runtime do preview.");
          }
          var source = ${payload};
          var transformed = window.Babel.transform(source, {
            presets: [["react", { runtime: "classic" }], "typescript"],
            filename: "Component.tsx"
          }).code;
          var run = new Function("React", "ReactDOM", transformed + "\\nreturn typeof __Generated !== 'undefined' ? __Generated : undefined;");
          var Component = run(window.React, window.ReactDOM);
          if (typeof Component !== "function") {
            throw new Error("O código gerado não exporta um componente padrão.");
          }
          var rootEl = document.getElementById("root");
          window.ReactDOM.createRoot(rootEl).render(window.React.createElement(Component));
          if (window.parent) {
            window.parent.postMessage({ type: "uiforge-preview-ready" }, "*");
          }
        } catch (err) {
          fail(err);
        }
      })();
    </script>
  </body>
</html>`;
}
