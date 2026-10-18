/// <reference types="vitest/globals" />
import { APICallError } from "ai";
import {
  friendlyGenerateError,
  isRateLimitError,
  CODE_TOO_LARGE_MESSAGE,
  REFINE_ERROR_MESSAGE,
  GENERIC_ERROR_MESSAGE,
  RATE_LIMIT_MESSAGE,
  DAILY_LIMIT_MESSAGE,
  QUOTA_MESSAGE,
  rateLimitMessage,
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

describe("rateLimitMessage", () => {
  it("diz quanto esperar no limite por minuto", () => {
    expect(rateLimitMessage("minute", 42)).toBe(
      "Você fez muitos pedidos seguidos. Aguarde 42 segundos e tente de novo.",
    );
    expect(rateLimitMessage("minute", 1)).toContain("Aguarde 1 segundo ");
    expect(rateLimitMessage("minute", 600)).toContain("Aguarde 10 minutos");
  });
  it("sem Retry-After usa a frase padrao", () => {
    expect(rateLimitMessage()).toBe(RATE_LIMIT_MESSAGE);
    expect(rateLimitMessage("minute")).toBe(RATE_LIMIT_MESSAGE);
  });
  it("limite diario e cota da IA tem frases proprias", () => {
    expect(rateLimitMessage("day", 3600)).toBe(DAILY_LIMIT_MESSAGE);
    expect(DAILY_LIMIT_MESSAGE).toMatch(/gerações gratuitas de hoje/);
    expect(rateLimitMessage("quota")).toBe(QUOTA_MESSAGE);
    expect(QUOTA_MESSAGE).toMatch(/limite gratuito da IA/);
  });
});
