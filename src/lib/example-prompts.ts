/**
 * Galeria de exemplos: prompts completos, prontos para gerar, agrupados por
 * categoria. São sementes (não limitam o que o modelo gera) e descrevem
 * conteúdo, estados e estilo para o resultado sair bonito na primeira vez.
 */
export const EXAMPLE_CATEGORIES = [
  { id: "cards", label: "Cards" },
  { id: "forms", label: "Formulários" },
  { id: "dashboards", label: "Dashboards" },
  { id: "tables", label: "Tabelas" },
  { id: "menus", label: "Menus" },
  { id: "basics", label: "Básicos" },
] as const;

export type ExampleCategory = (typeof EXAMPLE_CATEGORIES)[number]["id"];

export type ExamplePrompt = {
  id: string;
  label: string;
  category: ExampleCategory;
  prompt: string;
};

export const EXAMPLE_PROMPTS: readonly ExamplePrompt[] = [
  // Cards
  {
    id: "product-card",
    label: "Produto",
    category: "cards",
    prompt:
      "Card de produto de e-commerce: imagem no topo com selo \"-20%\", nome do produto, avaliação com 5 estrelas e número de avaliações, preço antigo riscado e preço atual em destaque, seletor de cor com 3 bolinhas e botão \"Adicionar ao carrinho\" que mostra \"Adicionado ✓\" ao clicar. Cantos arredondados, sombra suave e leve elevação no hover.",
  },
  {
    id: "pricing",
    label: "Planos",
    category: "cards",
    prompt:
      "Seção de preços com 3 planos (Básico, Pro e Empresa) lado a lado, com alternância Mensal/Anual que muda os valores e mostra \"economize 20%\". Cada card tem nome, preço, descrição curta, lista de benefícios com ícones de check e botão. O plano Pro fica destacado com borda colorida e selo \"Mais popular\". Empilha em uma coluna no celular.",
  },
  {
    id: "profile-card",
    label: "Perfil",
    category: "cards",
    prompt:
      "Card de perfil de usuário com capa em gradiente, avatar circular sobreposto com indicador de online, nome, cargo e cidade, três métricas (Projetos, Seguidores, Seguindo) e botões \"Seguir\" (alterna para \"Seguindo\") e \"Mensagem\". Visual limpo com espaçamento generoso.",
  },
  {
    id: "testimonial",
    label: "Depoimentos",
    category: "cards",
    prompt:
      "Carrossel de depoimentos de clientes: cada slide tem aspas grandes decorativas, texto do depoimento, avatar, nome e empresa. Setas anterior/próximo e indicadores em bolinhas clicáveis, com transição suave entre os slides. Inclua 4 depoimentos de exemplo.",
  },
  // Formulários
  {
    id: "login",
    label: "Login",
    category: "forms",
    prompt:
      "Tela de login centralizada com logo, título \"Bem-vindo de volta\", campos de e-mail e senha com ícones, botão de mostrar/ocultar senha, checkbox \"Lembrar de mim\", link \"Esqueci a senha\", botão principal com estado de carregando e botões \"Entrar com Google\" e \"Entrar com GitHub\". Valide o e-mail e mostre mensagens de erro abaixo dos campos.",
  },
  {
    id: "signup-wizard",
    label: "Cadastro em etapas",
    category: "forms",
    prompt:
      "Formulário de cadastro em 3 etapas (Conta, Perfil, Confirmação) com indicador de progresso no topo. Etapa 1: nome, e-mail e senha com medidor de força. Etapa 2: cargo (select), tamanho da empresa (botões de opção) e interesses (chips selecionáveis). Etapa 3: resumo dos dados. Botões Voltar e Continuar, validação por etapa e mensagem de sucesso no final.",
  },
  {
    id: "contact",
    label: "Contato",
    category: "forms",
    prompt:
      "Formulário de contato em duas colunas: à esquerda, título, texto curto e informações de contato (e-mail, telefone, endereço) com ícones; à direita, campos de nome, e-mail, assunto (select) e mensagem com contador de caracteres. Botão Enviar com estado de carregando e mensagem de sucesso. Validação com erros em vermelho.",
  },
  {
    id: "settings",
    label: "Configurações",
    category: "forms",
    prompt:
      "Página de configurações da conta com seções em cards: Perfil (foto, nome, bio), Notificações (interruptores para e-mail, push e resumo semanal), Preferências (idioma e fuso horário em selects, tema claro/escuro) e Zona de perigo (botão vermelho \"Excluir conta\" com confirmação). Botão \"Salvar alterações\" que aparece só quando algo muda.",
  },
  // Dashboards
  {
    id: "analytics",
    label: "Analytics",
    category: "dashboards",
    prompt:
      "Dashboard de analytics com 4 cards de métricas no topo (Receita, Usuários, Conversão, Ticket médio), cada um com valor, variação percentual em verde ou vermelho e mini gráfico de linha em SVG. Abaixo, um gráfico de barras em SVG com os últimos 12 meses e filtro de período (7 dias, 30 dias, 12 meses) e uma lista de vendas recentes. Use dados fictícios.",
  },
  {
    id: "admin-layout",
    label: "Painel admin",
    category: "dashboards",
    prompt:
      "Layout de painel administrativo com barra lateral recolhível (logo, itens de menu com ícones, item ativo destacado e usuário no rodapé), barra superior com busca, sino de notificações com contador e avatar, e área principal com título, breadcrumbs, 3 cards de resumo e uma tabela de pedidos. No celular a barra lateral vira um menu que abre por cima.",
  },
  {
    id: "kanban",
    label: "Kanban",
    category: "dashboards",
    prompt:
      "Quadro kanban com colunas A fazer, Em andamento e Concluído, cada uma com contador. Os cards de tarefa têm título, etiquetas coloridas, prazo, avatares dos responsáveis e prioridade. Botões para mover o card para a coluna anterior ou seguinte e um botão \"+ Nova tarefa\" que adiciona um card na coluna. Use dados fictícios.",
  },
  {
    id: "finance",
    label: "Finanças",
    category: "dashboards",
    prompt:
      "Dashboard de finanças pessoais: card de saldo total com botão para ocultar valores, gráfico de rosca em SVG com gastos por categoria e legenda, barra de progresso de metas de economia e lista de transações recentes com ícone da categoria, descrição, data e valor (entradas em verde, saídas em vermelho). Filtro por mês no topo.",
  },
  // Tabelas
  {
    id: "users-table",
    label: "Usuários",
    category: "tables",
    prompt:
      "Tabela de usuários com busca, filtro por status (Todos, Ativo, Inativo, Pendente) e ordenação ao clicar no cabeçalho. Colunas: checkbox, avatar + nome + e-mail, cargo, status em badge colorido, último acesso e menu de ações (Editar, Desativar). Paginação no rodapé com \"Mostrando 1–10 de 48\". Use 12 linhas fictícias e role na horizontal no celular.",
  },
  {
    id: "orders-table",
    label: "Pedidos",
    category: "tables",
    prompt:
      "Tabela de pedidos com abas de status no topo (Todos, Pagos, Enviados, Cancelados) com contadores, colunas de número do pedido, cliente, data, valor e status, e linhas expansíveis que mostram os itens do pedido. Seleção múltipla com barra de ações em massa que aparece quando há linhas selecionadas.",
  },
  {
    id: "comparison",
    label: "Comparativo",
    category: "tables",
    prompt:
      "Tabela comparativa de planos com recursos nas linhas e 3 planos nas colunas, cabeçalho fixo com nome, preço e botão de cada plano, ícones de check e traço, grupos de recursos com títulos e a coluna do plano recomendado destacada. Legível no celular.",
  },
  {
    id: "leaderboard",
    label: "Ranking",
    category: "tables",
    prompt:
      "Ranking de jogadores com pódio dos 3 primeiros (medalhas ouro, prata e bronze e avatares maiores) e lista do 4º ao 10º com posição, avatar, nome, pontos e seta indicando se subiu ou desceu. Alternância entre Semana, Mês e Geral que troca os dados fictícios.",
  },
  // Menus
  {
    id: "navbar",
    label: "Navbar",
    category: "menus",
    prompt:
      "Barra de navegação responsiva com logo, links (Produto, Preços, Blog, Contato) com o item ativo sublinhado, menu suspenso em \"Produto\" com ícones e descrições, botões \"Entrar\" e \"Começar grátis\". No celular vira botão hambúrguer que abre um menu em tela cheia com animação.",
  },
  {
    id: "command",
    label: "Paleta de comandos",
    category: "menus",
    prompt:
      "Paleta de comandos estilo ⌘K: modal centralizado com campo de busca, resultados agrupados (Páginas, Ações, Configurações) com ícones e atalhos de teclado à direita, filtro enquanto digita, navegação com setas e Enter, item ativo destacado e estado \"Nenhum resultado\". Abre com um botão e fecha com Esc.",
  },
  {
    id: "dropdown",
    label: "Menu do usuário",
    category: "menus",
    prompt:
      "Botão de avatar que abre um menu suspenso com nome e e-mail no topo, itens (Perfil, Configurações, Faturamento, Atalhos) com ícones, separador, alternância de tema e \"Sair\" em vermelho. Fecha ao clicar fora ou com Esc e tem animação suave de abertura.",
  },
  {
    id: "tabs",
    label: "Abas",
    category: "menus",
    prompt:
      "Abas de perfil (Visão geral, Projetos, Atividade, Configurações) com indicador animado que desliza sob a aba ativa, contadores em badges e conteúdo diferente em cada aba: resumo com estatísticas, grade de projetos, linha do tempo de atividades e um pequeno formulário.",
  },
  // Básicos
  {
    id: "buttons",
    label: "Botões",
    category: "basics",
    prompt:
      "Conjunto de botões em variantes primário, secundário, contorno, fantasma e destrutivo, em três tamanhos, com versões com ícone à esquerda, só ícone e carregando (spinner). Estados de hover, foco visível e desabilitado. Organize em uma grade com rótulos.",
  },
  {
    id: "toasts",
    label: "Notificações",
    category: "basics",
    prompt:
      "Sistema de notificações toast: botões para disparar sucesso, erro, aviso e informação; cada toast aparece no canto inferior direito com ícone, título, descrição, botão de fechar e barra de progresso que some em 5 segundos. Vários toasts empilham com animação de entrada e saída.",
  },
  {
    id: "empty-state",
    label: "Estado vazio",
    category: "basics",
    prompt:
      "Estado vazio para uma lista de projetos: ilustração em SVG com formas suaves, título \"Nenhum projeto ainda\", texto explicativo, botão principal \"Criar projeto\" e link secundário \"Importar\". Centralizado, com borda tracejada em volta.",
  },
  {
    id: "faq",
    label: "FAQ",
    category: "basics",
    prompt:
      "Seção de perguntas frequentes com título, campo de busca que filtra as perguntas e acordeão com 6 perguntas: só uma aberta por vez, ícone de seta que gira e animação suave de altura. No fim, um card \"Ainda com dúvidas?\" com botão de contato.",
  },
];
