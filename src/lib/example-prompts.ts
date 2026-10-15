/** Prompts de exemplo (D-04). Sementes: nao limitam o que o modelo gera. */
export const EXAMPLE_PROMPTS = [
  { id: "botao", label: "Botão", prompt: "botão primário com ícone" },
  {
    id: "card",
    label: "Card",
    prompt: "card de produto com imagem, preço e botão comprar",
  },
  {
    id: "badge",
    label: "Badge",
    prompt: "badge de status (sucesso, alerta, erro)",
  },
  {
    id: "input",
    label: "Input",
    prompt: "campo de busca com ícone à esquerda",
  },
  {
    id: "toggle",
    label: "Toggle",
    prompt: "interruptor de notificações com rótulo",
  },
  {
    id: "navbar",
    label: "Navbar",
    prompt: "barra de navegação com logo e links",
  },
  {
    id: "modal",
    label: "Modal",
    prompt: "diálogo de confirmação com Cancelar e Confirmar",
  },
  {
    id: "empty",
    label: "Empty",
    prompt: "estado vazio com ilustração e botão de ação",
  },
  {
    id: "pricing",
    label: "Pricing",
    prompt: "card de plano com preço, lista de benefícios e CTA",
  },
  {
    id: "avatar",
    label: "Avatar",
    prompt: "avatar com nome, cargo e status online",
  },
  {
    id: "alert",
    label: "Alert",
    prompt: "alerta de erro com ícone e botão fechar",
  },
  {
    id: "tabs",
    label: "Tabs",
    prompt: "abas de perfil, com conteúdo em cada uma",
  },
] as const;

export type ExamplePrompt = (typeof EXAMPLE_PROMPTS)[number];
