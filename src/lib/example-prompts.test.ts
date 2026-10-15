/// <reference types="vitest/globals" />
import { EXAMPLE_PROMPTS } from "./example-prompts";

describe("EXAMPLE_PROMPTS", () => {
  it("tem exatamente 12 entradas na ordem travada", () => {
    expect(EXAMPLE_PROMPTS.map((e) => e.id)).toEqual([
      "botao",
      "card",
      "badge",
      "input",
      "toggle",
      "navbar",
      "modal",
      "empty",
      "pricing",
      "avatar",
      "alert",
      "tabs",
    ]);
  });

  it("tem labels e ids unicos", () => {
    expect(new Set(EXAMPLE_PROMPTS.map((e) => e.id)).size).toBe(12);
    expect(new Set(EXAMPLE_PROMPTS.map((e) => e.label)).size).toBe(12);
  });

  it("mantem labels e prompts identicos a D-04", () => {
    expect(EXAMPLE_PROMPTS.map((e) => [e.label, e.prompt])).toEqual([
      ["Botão", "botão primário com ícone"],
      ["Card", "card de produto com imagem, preço e botão comprar"],
      ["Badge", "badge de status (sucesso, alerta, erro)"],
      ["Input", "campo de busca com ícone à esquerda"],
      ["Toggle", "interruptor de notificações com rótulo"],
      ["Navbar", "barra de navegação com logo e links"],
      ["Modal", "diálogo de confirmação com Cancelar e Confirmar"],
      ["Empty", "estado vazio com ilustração e botão de ação"],
      ["Pricing", "card de plano com preço, lista de benefícios e CTA"],
      ["Avatar", "avatar com nome, cargo e status online"],
      ["Alert", "alerta de erro com ícone e botão fechar"],
      ["Tabs", "abas de perfil, com conteúdo em cada uma"],
    ]);
  });
});
