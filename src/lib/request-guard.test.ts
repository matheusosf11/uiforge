/// <reference types="vitest/globals" />
import { isForeignOrigin, isJsonRequest } from "./request-guard";

const mk = (headers: Record<string, string>) =>
  new Request("https://app.example/api/generate", { method: "POST", headers });

describe("isForeignOrigin", () => {
  it("passes same-origin browser requests and clients without Origin", () => {
    expect(isForeignOrigin(mk({ origin: "https://app.example" }))).toBe(false);
    expect(isForeignOrigin(mk({ "sec-fetch-site": "same-origin" }))).toBe(false);
    expect(isForeignOrigin(mk({}))).toBe(false);
  });

  it("refuses cross-site fetches and other origins", () => {
    expect(isForeignOrigin(mk({ "sec-fetch-site": "cross-site" }))).toBe(true);
    expect(isForeignOrigin(mk({ origin: "https://evil.example" }))).toBe(true);
    expect(isForeignOrigin(mk({ origin: "null" }))).toBe(true);
  });

  it("compares with the forwarded host behind a proxy", () => {
    expect(
      isForeignOrigin(
        mk({ origin: "https://uiforge.vercel.app", "x-forwarded-host": "uiforge.vercel.app" }),
      ),
    ).toBe(false);
  });
});

describe("isJsonRequest", () => {
  it("accepts application/json with or without charset", () => {
    expect(isJsonRequest(mk({ "content-type": "application/json" }))).toBe(true);
    expect(isJsonRequest(mk({ "content-type": "Application/JSON; charset=utf-8" }))).toBe(true);
  });
  it("refuses forms, text and missing types", () => {
    expect(isJsonRequest(mk({ "content-type": "application/x-www-form-urlencoded" }))).toBe(false);
    expect(isJsonRequest(mk({ "content-type": "text/plain" }))).toBe(false);
    expect(isJsonRequest(mk({}))).toBe(false);
  });
});
