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

export function buildPreviewSrcdoc(code: string): string {
  const rewritten = rewriteGeneratedCodeForPreview(code);
  const payload = JSON.stringify(rewritten).replace(/</g, "\\u003c");

  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="color-scheme" content="light" />
    <script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4.3.3/dist/index.global.js"></script>
    <style>
      html { color-scheme: light; }
      html, body, #root { margin: 0; min-height: 100%; background: #fff; color: #0f172a; }
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
    <script src="https://cdn.jsdelivr.net/npm/react@18.3.1/umd/react.development.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/react-dom@18.3.1/umd/react-dom.development.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/@babel/standalone@7.28.5/babel.min.js"></script>
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
