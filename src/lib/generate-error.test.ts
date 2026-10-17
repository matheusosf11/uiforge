/// <reference types="vitest/globals" />
import { APICallError } from "ai";
import {
  friendlyGenerateError,
  isRateLimitError,
  CODE_TOO_LARGE_MESSAGE,
  REFINE_ERROR_MESSAGE,
  GENERIC_ERROR_MESSAGE,
  RATE_LIMIT_MESSAGE,
} from "./generate-error";

const api429 = () =>
  new APICallError({
    message: "x",
    url: "u",
    requestBodyValues: {},
    statusCode: 429,
  });

describe("isRateLimitError", () => {
  it("detecta mensagem rate_limited", () => {
    expect(isRateLimitError(new Error("rate_limited"))).toBe(true);
  });
  it("detecta APICallError 429", () => {
    expect(isRateLimitError(api429())).toBe(true);
  });
  it("detecta RESOURCE_EXHAUSTED", () => {
    expect(isRateLimitError(new Error("RESOURCE_EXHAUSTED: quota"))).toBe(true);
  });
  it("ignora erros nao relacionados", () => {
    expect(isRateLimitError(new Error("boom"))).toBe(false);
    expect(isRateLimitError(undefined)).toBe(false);
    expect(isRateLimitError("str")).toBe(false);
  });
});

describe("friendlyGenerateError", () => {
  it("devolve a frase de limite para 429", () => {
    expect(friendlyGenerateError(api429())).toBe(
      "Muitas tentativas. Espere um pouco e tente de novo.",
    );
    expect(RATE_LIMIT_MESSAGE).toBe(
      "Muitas tentativas. Espere um pouco e tente de novo.",
    );
  });
  it("devolve a frase generica para o resto, sem vazar a mensagem", () => {
    const out = friendlyGenerateError(new Error("Invalid request: secret"));
    expect(out).toBe("Falha ao gerar o componente. Tente novamente.");
    expect(GENERIC_ERROR_MESSAGE).toBe(out);
  });
  it("modo edit: frase de refinamento sem vazar a mensagem", () => {
    const out = friendlyGenerateError(new Error("secret"), "edit");
    expect(out).toBe(REFINE_ERROR_MESSAGE);
    expect(out).toBe("Falha ao refinar o componente. Sua versão anterior foi mantida.");
  });
  it("modo edit: rate limit mantem a frase de limite", () => {
    expect(friendlyGenerateError(api429(), "edit")).toBe(RATE_LIMIT_MESSAGE);
  });
  it("expoe a frase de codigo grande", () => {
    expect(CODE_TOO_LARGE_MESSAGE).toBe(
      "O componente ficou grande demais para refinar. Comece um Novo componente.",
    );
  });
});
