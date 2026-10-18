// How to use a generated component in another project. The same steps feed
// the "Como usar" dialog and the README.md inside the downloaded package, and
// only mention what this component actually needs.
import { componentFilename } from "@/lib/download-filename";

export type UsageStep = { title: string; text: string; code?: string; lang?: string };

const IMAGE_TOKEN = /uiforge:image(?:-\d+)?/;
const REACT_HOOK = /\buse(State|Effect|Ref|Memo|Callback|Reducer|Id|LayoutEffect)\b/;

export function usageSteps(code: string): UsageStep[] {
  const file = componentFilename(code);
  const name = file.replace(/\.tsx$/, "");
  const steps: UsageStep[] = [
    {
      title: "Requisitos",
      text:
        "Um projeto React 18 ou mais novo com TypeScript e Tailwind CSS (v4 recomendado; v3 também funciona). O componente não usa outras bibliotecas.",
    },
    {
      title: "Se ainda não tem Tailwind",
      text: "Em um projeto Vite, instale o Tailwind e o plugin:",
      code: "npm install tailwindcss @tailwindcss/vite",
      lang: "bash",
    },
    {
      title: "Ative o plugin e importe o CSS",
      text:
        "Adicione tailwindcss() aos plugins do vite.config.ts e coloque esta linha no seu CSS principal. No Next.js, siga o guia oficial do Tailwind para Next (usa @tailwindcss/postcss).",
      code: '@import "tailwindcss";',
      lang: "css",
    },
    {
      title: "Copie o arquivo",
      text: `Coloque ${file} na pasta de componentes do projeto, por exemplo src/components/${file}.`,
    },
    {
      title: "Use o componente",
      text: "Importe e renderize onde quiser:",
      code: `import ${name} from "./components/${name}";\n\nexport default function App() {\n  return <${name} />;\n}`,
      lang: "tsx",
    },
  ];

  if (REACT_HOOK.test(code)) {
    steps.push({
      title: "Next.js (App Router)",
      text:
        'O componente usa hooks do React, então no App Router a primeira linha do arquivo precisa ser "use client".',
      code: '"use client";',
      lang: "tsx",
    });
  }

  if (/\bdark:/.test(code)) {
    steps.push({
      title: "Modo escuro",
      text:
        'As classes dark: seguem o sistema operacional por padrão. Para controlar pelo atributo class="dark" no <html> (como no preview), adicione ao CSS do Tailwind v4:',
      code: "@custom-variant dark (&:where(.dark, .dark *));",
      lang: "css",
    });
  }

  if (IMAGE_TOKEN.test(code)) {
    steps.push({
      title: "Imagens de referência",
      text:
        'O código usa marcadores como src="uiforge:image-1" no lugar das imagens anexadas. Troque cada um pelo caminho da sua imagem (por exemplo, um arquivo em public/ ou um import).',
    });
  }

  return steps;
}

/** README.md of the downloaded package. */
export function usageReadme(code: string): string {
  const file = componentFilename(code);
  const name = file.replace(/\.tsx$/, "");
  const body = usageSteps(code)
    .map((step, i) => {
      const block = step.code ? `\n\n\`\`\`${step.lang ?? ""}\n${step.code}\n\`\`\`` : "";
      return `## ${i + 1}. ${step.title}\n\n${step.text}${block}`;
    })
    .join("\n\n");
  return `# ${name}\n\nComponente React + Tailwind gerado com o UIForge.\n\nArquivos:\n\n- \`${file}\`: o componente (export default)\n- \`README.md\`: este guia\n\n${body}\n`;
}
