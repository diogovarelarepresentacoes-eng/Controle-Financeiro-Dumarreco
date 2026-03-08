const BLOCKED_TERMS = [
  "preco",
  "desconto",
  "parcelamento",
  "parcela",
  "juros",
  "multa",
  "estoque",
  "disponivel",
  "prazo",
  "entrega",
  "frete",
  "garantia",
  "nota fiscal",
  "procon",
  "processo"
];

const SAFE_FAQ_TERMS = ["endereco", "horario", "telefone", "contato"];

export type PolicyInput = {
  mode: "MANUAL" | "ASSISTIDO" | "AUTO";
  userMessage: string;
  confidence: number;
  hasSource: boolean;
  stockIntent?: boolean;
  stockChecked?: boolean;
  stockFound?: boolean;
};

export type PolicyDecision = {
  requiresHuman: boolean;
  allowAutoSend: boolean;
  reason: string;
};

export function evaluatePolicy(input: PolicyInput): PolicyDecision {
  if (input.mode === "MANUAL") {
    return { requiresHuman: true, allowAutoSend: false, reason: "Modo manual ativo." };
  }

  const normalized = input.userMessage.toLowerCase();
  const hasBlockedTerm = BLOCKED_TERMS.some((term) => normalized.includes(term));
  const looksAmbiguous = normalized.includes("quanto fica tudo");
  const isSafeFaq = SAFE_FAQ_TERMS.some((term) => normalized.includes(term));

  if (!input.hasSource) {
    return {
      requiresHuman: true,
      allowAutoSend: false,
      reason: "Sem fonte interna valida."
    };
  }

  if (input.stockIntent) {
    if (!input.stockChecked) {
      return {
        requiresHuman: true,
        allowAutoSend: false,
        reason: "Consulta de estoque obrigatoria nao executada."
      };
    }
    if (!input.stockFound) {
      return {
        requiresHuman: true,
        allowAutoSend: false,
        reason: "Produto nao encontrado no estoque atual."
      };
    }
  }

  if (hasBlockedTerm || looksAmbiguous || input.confidence < 0.8) {
    return {
      requiresHuman: true,
      allowAutoSend: false,
      reason: "Tema sensivel ou baixa confianca."
    };
  }

  if (input.mode === "ASSISTIDO") {
    return {
      requiresHuman: true,
      allowAutoSend: false,
      reason: "Modo assistido exige aprovacao humana."
    };
  }

  if (input.mode === "AUTO" && isSafeFaq && input.confidence >= 0.9) {
    return { requiresHuman: false, allowAutoSend: true, reason: "FAQ segura aprovada." };
  }

  return {
    requiresHuman: true,
    allowAutoSend: false,
    reason: "Auto permitido apenas para FAQ segura."
  };
}
