import { describe, expect, it, vi } from "vitest";
import { streamGenerate } from "@/lib/stream-generate";

const enc = new TextEncoder();

function streamOf(chunks: string[], failAfter = false) {
  return new ReadableStream<Uint8Array>({
    start(controller) {
      for (const c of chunks) controller.enqueue(enc.encode(c));
      if (failAfter) controller.error(new Error("boom"));
      else controller.close();
    },
  });
}

const fetchOf = (res: Response | Error) =>
  vi.fn(async () => {
    if (!(res instanceof Response)) throw res;
    return res;
  }) as unknown as typeof fetch & ReturnType<typeof vi.fn>;

describe("streamGenerate", () => {
  it("accumulates chunks and returns ok", async () => {
    const onText = vi.fn();
    const fetchImpl = fetchOf(new Response(streamOf(["ab", "cd"]), { status: 200 }));
    const r = await streamGenerate(
      { prompt: "p" },
      { signal: new AbortController().signal, onText, fetchImpl },
    );
    expect(r).toEqual({ ok: true, text: "abcd" });
    expect(onText.mock.calls.map((c) => c[0])).toEqual(["ab", "abcd"]);
  });

  it("sends POST with json body, currentCode only when provided", async () => {
    const fetchImpl = fetchOf(new Response(streamOf(["x"])));
    const signal = new AbortController().signal;
    await streamGenerate({ prompt: "p" }, { signal, onText: () => {}, fetchImpl });
    const fetchImpl2 = fetchOf(new Response(streamOf(["x"])));
    await streamGenerate(
      { prompt: "p", currentCode: "c" },
      { signal, onText: () => {}, fetchImpl: fetchImpl2 },
    );
    const [url, init] = (fetchImpl as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe("/api/generate");
    expect(init.method).toBe("POST");
    expect(init.headers["content-type"]).toBe("application/json");
    expect(JSON.parse(init.body)).toEqual({ prompt: "p" });
    const init2 = (fetchImpl2 as unknown as ReturnType<typeof vi.fn>).mock.calls[0][1];
    expect(JSON.parse(init2.body)).toEqual({ prompt: "p", currentCode: "c" });
  });

  it("sends only the image type and data, never the file name", async () => {
    const fetchImpl = fetchOf(new Response(streamOf(["x"])));
    await streamGenerate(
      { prompt: "p", image: { mediaType: "image/jpeg", data: "AAAA", name: "eu.jpg" } },
      { signal: new AbortController().signal, onText: () => {}, fetchImpl },
    );
    const init = (fetchImpl as unknown as ReturnType<typeof vi.fn>).mock.calls[0][1];
    expect(JSON.parse(init.body)).toEqual({
      prompt: "p",
      image: { mediaType: "image/jpeg", data: "AAAA" },
    });
  });

  it("mid-stream error never yields ok true", async () => {
    const fetchImpl = fetchOf(new Response(streamOf(["ab"], true), { status: 200 }));
    const r = await streamGenerate(
      { prompt: "p" },
      { signal: new AbortController().signal, onText: () => {}, fetchImpl },
    );
    expect(r.ok).toBe(false);
    expect(r).toMatchObject({ ok: false, reason: "stream" });
  });

  it.each([413, 429, 502])("maps http %i with body", async (status) => {
    const fetchImpl = fetchOf(new Response("err-body", { status }));
    const r = await streamGenerate(
      { prompt: "p" },
      { signal: new AbortController().signal, onText: () => {}, fetchImpl },
    );
    expect(r).toEqual({ ok: false, reason: "http", status, body: "err-body" });
  });

  it("fetch AbortError -> aborted", async () => {
    const err = new DOMException("x", "AbortError");
    const r = await streamGenerate(
      { prompt: "p" },
      { signal: new AbortController().signal, onText: () => {}, fetchImpl: fetchOf(err) },
    );
    expect(r).toEqual({ ok: false, reason: "aborted" });
  });

  it("signal aborted during read -> aborted", async () => {
    const ac = new AbortController();
    const fetchImpl = fetchOf(new Response(streamOf(["a", "b"])));
    const r = await streamGenerate(
      { prompt: "p" },
      { signal: ac.signal, onText: () => ac.abort(), fetchImpl },
    );
    expect(r).toEqual({ ok: false, reason: "aborted" });
  });

  it("other fetch rejection -> stream", async () => {
    const r = await streamGenerate(
      { prompt: "p" },
      {
        signal: new AbortController().signal,
        onText: () => {},
        fetchImpl: fetchOf(new TypeError("network")),
      },
    );
    expect(r).toMatchObject({ ok: false, reason: "stream" });
  });

  it("null body -> stream", async () => {
    const r = await streamGenerate(
      { prompt: "p" },
      {
        signal: new AbortController().signal,
        onText: () => {},
        fetchImpl: fetchOf(new Response(null, { status: 200 })),
      },
    );
    expect(r).toMatchObject({ ok: false, reason: "stream" });
  });
});
