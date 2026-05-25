// ============================================================================
// RBAC (Role-Based Access Control) — ObraSys v2
// Arquivo centralizado de permissões para 16 cargos oficiais.
// ============================================================================

// ---------------------------------------------------------------------------
// 1. ROLES OFICIAIS DO SISTEMA
// ---------------------------------------------------------------------------
export const ROLES = [
  "Diretor",
  "Gerente de Obras",
  "Coordenador de Obras",
  "Engenheiro Residente",
  "Engenheiro",
  "Projetista / Eng. de Projetos",
  "Orçamentista",
  "Mestre de Obras",
  "Téc. Segurança",
  "Gerente Financeiro",
  "Auxiliar Financeiro",
  "RH / DP",
  "Analista de RH",
  "Assistente de RH",
  "TI",
  "Administrativo de Obra",
  "Almoxarife",
  "Cliente / Investidor",
  "Comprador",
  "Administrador",
] as const;

export type Role = (typeof ROLES)[number];

// ---------------------------------------------------------------------------
// 2. CONTROLE DE ACESSO — PÁGINAS GLOBAIS
// ---------------------------------------------------------------------------

/** Páginas globais do sistema */
type GlobalPage =
  | "dashboard"       // /
  | "financeiro"      // /financeiro
  | "suprimentos"     // /suprimentos
  | "comercial"       // /comercial
  | "orcamentos"      // /orcamentos
  | "analise"         // /analise
  | "configuracoes"   // /configuracoes
  | "mapa"            // /mapa
  | "perfil"          // /perfil
  | "rh";             // /rh

const PAGE_ACCESS: Record<GlobalPage, string[]> = {
  dashboard:     ["Diretor", "Gerente de Obras", "Coordenador de Obras", "Engenheiro Residente", "Engenheiro", "Gerente Financeiro", "Administrador", "Téc. Segurança", "Mestre de Obras", "Administrativo de Obra", "Projetista / Eng. de Projetos"],
  financeiro:    ["Diretor", "Gerente de Obras", "Coordenador de Obras", "Engenheiro Residente", "Engenheiro", "Gerente Financeiro", "Auxiliar Financeiro", "Comprador", "Administrativo de Obra", "Administrador"],
  suprimentos:   ["Diretor", "Gerente de Obras", "Coordenador de Obras", "Engenheiro Residente", "Engenheiro", "Orçamentista", "Administrativo de Obra", "Almoxarife", "Comprador", "Administrador"],
  comercial:     ["Diretor", "Gerente de Obras", "Coordenador de Obras", "Engenheiro Residente", "Engenheiro", "Administrador"],
  orcamentos:    ["Diretor", "Gerente de Obras", "Coordenador de Obras", "Engenheiro Residente", "Engenheiro", "Projetista / Eng. de Projetos", "Orçamentista"],
  analise:       ["Diretor", "Gerente de Obras", "Coordenador de Obras", "Engenheiro Residente", "Engenheiro", "Gerente Financeiro"],
  configuracoes: ["Diretor", "TI", "RH / DP", "Analista de RH", "Assistente de RH"],
  mapa:          ["Diretor", "Gerente de Obras", "Coordenador de Obras", "Engenheiro Residente", "Engenheiro"],
  perfil:        ROLES as unknown as string[], // Todos
  rh:            ["Diretor", "TI", "RH / DP", "Analista de RH", "Assistente de RH", "Téc. Segurança", "Administrativo de Obra"],
};

/**
 * Verifica se um perfil tem acesso a uma página global.
 */
export function canAccessPage(role: string, page: GlobalPage): boolean {
  if (role === "Diretor" || role === "Director") return true;
  return PAGE_ACCESS[page]?.includes(role) ?? false;
}

// ---------------------------------------------------------------------------
// 3. CONTROLE DE ACESSO — MÓDULOS DA OBRA (/projeto/[id])
// ---------------------------------------------------------------------------

/** Módulos internos de uma obra */
type ProjectModule =
  | "visao-geral"
  | "portal-cliente"
  | "financeiro"
  | "medicoes"
  | "cronograma"
  | "tarefas"
  | "suprimentos"
  | "ged"
  | "solicitacoes"
  | "rdo"
  | "qualidade"
  | "ia-center"
  | "config";

const MODULE_ACCESS: Record<ProjectModule, string[]> = {
  "visao-geral":    ["Diretor", "Gerente de Obras", "Coordenador de Obras", "Engenheiro Residente", "Engenheiro", "Projetista / Eng. de Projetos", "Orçamentista", "Gerente Financeiro", "Administrador"],
  "portal-cliente": ["Diretor", "Gerente de Obras", "Cliente / Investidor"],
  "financeiro":     ["Diretor", "Gerente Financeiro", "Auxiliar Financeiro", "Administrativo de Obra", "Administrador"],
  "medicoes":       ["Diretor", "Gerente de Obras", "Coordenador de Obras", "Engenheiro Residente", "Engenheiro", "Orçamentista", "Gerente Financeiro", "Auxiliar Financeiro"],
  "cronograma":     ["Diretor", "Gerente de Obras", "Coordenador de Obras", "Engenheiro Residente", "Engenheiro", "Mestre de Obras"],
  "tarefas":        ["Diretor", "Gerente de Obras", "Coordenador de Obras", "Engenheiro Residente", "Engenheiro", "Mestre de Obras", "Téc. Segurança"],
  "suprimentos":    ["Diretor", "Gerente de Obras", "Coordenador de Obras", "Engenheiro Residente", "Engenheiro", "Orçamentista", "Mestre de Obras", "Administrativo de Obra", "Almoxarife", "Comprador", "Administrador"],
  "ged":            ["Diretor", "Gerente de Obras", "Coordenador de Obras", "Engenheiro Residente", "Engenheiro", "Projetista / Eng. de Projetos", "Orçamentista", "Mestre de Obras"],
  "solicitacoes":   ["Diretor", "Gerente de Obras", "Coordenador de Obras", "Engenheiro Residente", "Engenheiro"],
  "rdo":            ["Diretor", "Gerente de Obras", "Coordenador de Obras", "Engenheiro Residente", "Engenheiro", "Mestre de Obras", "Téc. Segurança", "RH / DP", "Analista de RH", "Assistente de RH"],
  "qualidade":      ["Diretor", "Gerente de Obras", "Coordenador de Obras", "Engenheiro Residente", "Engenheiro", "Mestre de Obras", "Téc. Segurança", "RH / DP", "Analista de RH", "Assistente de RH"],
  "ia-center":      ["Diretor"],
  "config":         ["Diretor", "TI", "RH / DP", "Analista de RH", "Assistente de RH", "Analista de RH", "Assistente de RH"],
};

/**
 * Verifica se um perfil tem acesso a um módulo da obra.
 */
export function canAccessModule(role: string, module: string): boolean {
  if (role === "Diretor" || role === "Director") return true;
  return (MODULE_ACCESS as any)[module]?.includes(role) ?? false;
}

// ---------------------------------------------------------------------------
// 4. CONTROLE GRANULAR — AÇÕES ESPECÍFICAS
// ---------------------------------------------------------------------------

/**
 * Verifica se um perfil pode fazer upload de documentos no GED.
 * Somente Diretor e Projetista / Eng. de Projetos.
 */
export function canUploadGED(role: string): boolean {
  return ["Diretor", "Director", "Projetista / Eng. de Projetos"].includes(role);
}

/**
 * Verifica se um perfil pode criar/editar lançamentos financeiros.
 */
export function canEditFinanceiro(role: string): boolean {
  return ["Diretor", "Director", "Gerente Financeiro"].includes(role);
}

/**
 * Verifica se um perfil pode aprovar cotações de compra.
 */
export function canApprovePurchase(role: string): boolean {
  return ["Diretor", "Director", "Gerente de Obras", "Coordenador de Obras", "Engenheiro Residente", "Engenheiro"].includes(role);
}

/**
 * Verifica se um perfil pode emitir Ordens de Compra (OCs).
 */
export function canEmitPurchaseOrder(role: string): boolean {
  return ["Diretor", "Director", "Comprador", "Administrador"].includes(role);
}

/**
 * Verifica se um perfil pode dar entrada/saída no estoque.
 */
export function canManageStock(role: string): boolean {
  return ["Diretor", "Director", "Gerente de Obras", "Administrativo de Obra", "Almoxarife", "Administrador", "Comprador"].includes(role);
}

/**
 * Verifica se um perfil pode criar solicitações de compra.
 */
export function canCreatePurchaseRequest(role: string): boolean {
  return ["Diretor", "Director", "Gerente de Obras", "Coordenador de Obras", "Engenheiro Residente", "Engenheiro", "Mestre de Obras", "Almoxarife", "Comprador", "Administrador"].includes(role);
}

// ---------------------------------------------------------------------------
// 5. NAVEGAÇÃO — ABA PADRÃO E REDIRECIONAMENTO
// ---------------------------------------------------------------------------

/**
 * Retorna a aba padrão para um perfil ao entrar em uma obra.
 */
export function getDefaultTab(role: string): string {
  switch (role) {
    case "Cliente / Investidor":
      return "portal-cliente";
    case "Mestre de Obras":
      return "rdo";
    case "Téc. Segurança":
      return "qualidade";
    case "Almoxarife":
    case "Comprador":
      return "suprimentos";
    case "Administrativo de Obra":
      return "financeiro";
    case "Gerente Financeiro":
    case "Auxiliar Financeiro":
      return "financeiro";
    case "Projetista / Eng. de Projetos":
      return "ged";
    case "Orçamentista":
      return "visao-geral";
    case "RH / DP":
    case "Analista de RH":
    case "Assistente de RH":
      return "rdo";
    case "TI":
      return "config";
    default:
      return "visao-geral";
  }
}

/**
 * Retorna se o perfil deve ser redirecionado do Dashboard Executivo (/).
 * Se true, redirecionar para /obras.
 */
export function shouldRedirectFromDashboard(role: string): boolean {
  return !canAccessPage(role, "dashboard");
}

export function shouldFilterProjects(role: string): boolean {
  const globalViewRoles = [
    "Diretor", "Director",
    "Gerente Financeiro",
    "Auxiliar Financeiro",
    "RH / DP", "Analista de RH", "Assistente de RH",
    "TI",
    "Administrador",
    "Comprador",
    "Orçamentista"
  ];
  return !globalViewRoles.includes(role);
}
