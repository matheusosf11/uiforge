import { simulateReadableStream } from "ai";
import { MockLanguageModelV4 } from "ai/test";

// Derived from declared packages only (avoids importing undeclared @ai-sdk/provider).
type LanguageModelV4StreamPart =
  Awaited<ReturnType<MockLanguageModelV4["doStream"]>>["stream"] extends ReadableStream<
    infer P
  >
    ? P
    : never;

// Deterministic, hooks-free component streamed by the e2e mock model (D-01).
export const FIXED_COMPONENT = `import React from "react";

export default function FixtureCard() {
  return (
    <div className="mx-auto max-w-sm rounded-xl border border-slate-200 bg-white p-6 shadow-md">
      <h2 className="text-xl font-semibold text-slate-900">FixtureCard</h2>
      <p className="mt-2 text-sm text-slate-600">
        Componente fixo usado nos testes e2e.
      </p>
      <button className="mt-4 rounded-lg bg-indigo-600 px-4 py-2 text-white">
        Acao
      </button>
    </div>
  );
}
`;

// Deterministic refine output (D-14). The slot line is a valid JSX comment child;
// it is swapped for a visible EditedSeen marker when currentCode has __edited__.
const EDITED_SLOT = "{/*__EDITED_SLOT__*/}";
export const REFINED_COMPONENT = `import React from "react";

export default function FixtureCard() {
  return (
    <div className="mx-auto max-w-sm rounded-xl border border-slate-200 bg-white p-6 shadow-md">
      <h2 className="text-xl font-semibold text-slate-900">FixtureCard</h2>
      <p className="mt-2 text-sm text-slate-600">Refinado</p>
      ${EDITED_SLOT}
      <button className="mt-4 rounded-lg bg-indigo-600 px-4 py-2 text-white">
        Acao
      </button>
    </div>
  );
}
`;

const ERROR_KEYWORD = "__e2e_error__";
const CHUNK_SIZE = 40;
const ID = "mock-text";

function chunkText(text: string): string[] {
  const out: string[] = [];
  for (let i = 0; i < text.length; i += CHUNK_SIZE) {
    out.push(text.slice(i, i + CHUNK_SIZE));
  }
  return out;
}

export function createE2EMockModel(prompt: string, currentCode?: string) {
  const text = currentCode
    ? REFINED_COMPONENT.replace(
        EDITED_SLOT,
        currentCode.includes("__edited__")
          ? '<p className="text-sm">EditedSeen</p>'
          : EDITED_SLOT,
      )
    : FIXED_COMPONENT;
  const deltas = chunkText(text).map((delta) => ({
    type: "text-delta" as const,
    id: ID,
    delta,
  }));
  const shouldFail = prompt.includes(ERROR_KEYWORD);

  const chunks: LanguageModelV4StreamPart[] = shouldFail
    ? [
        { type: "text-start" as const, id: ID },
        ...deltas.slice(0, 4),
        {
          type: "error" as const,
          error: new Error("e2e mock mid-stream failure"),
        },
      ]
    : [
        { type: "text-start" as const, id: ID },
        ...deltas,
        { type: "text-end" as const, id: ID },
        {
          type: "finish" as const,
          finishReason: { unified: "stop" as const, raw: "stop" },
          usage: {
            inputTokens: {
              total: 10,
              noCache: 10,
              cacheRead: undefined,
              cacheWrite: undefined,
            },
            outputTokens: { total: 50, text: 50, reasoning: undefined },
          },
        },
      ];

  return new MockLanguageModelV4({
    doStream: async () => ({
      stream: simulateReadableStream({
        chunks,
        initialDelayInMs: 50,
        chunkDelayInMs: 30,
      }),
    }),
  });
}
