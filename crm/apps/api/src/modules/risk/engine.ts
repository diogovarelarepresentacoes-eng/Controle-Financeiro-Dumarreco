import { RiskLevel, RoleName } from "@prisma/client";

export type RiskInput = {
  role: RoleName;
  discountPct: number;
  isNewCustomer: boolean;
  orderTotal: number;
  installmentsCount: number;
  parcelingAllowed: boolean;
  promiseDeliveryWithoutStock: boolean;
  userMessage?: string;
};

export type RiskAssessment = {
  level: RiskLevel;
  reasons: string[];
  blocked: boolean;
  requiresSupervisorApproval: boolean;
};

export function assessCommercialRisk(input: RiskInput): RiskAssessment {
  const reasons: string[] = [];

  const roleLimit = input.role === RoleName.ATTENDANT ? 3 : input.role === RoleName.SUPERVISOR ? 8 : 100;
  if (input.discountPct > roleLimit) reasons.push("Desconto acima do limite da role.");
  if (input.isNewCustomer && input.orderTotal >= 5000) reasons.push("Pedido alto para cliente novo.");
  if (input.installmentsCount > 1 && !input.parcelingAllowed) reasons.push("Parcelamento fora da regra.");
  if (input.promiseDeliveryWithoutStock) reasons.push("Prazo prometido sem confirmação de estoque.");
  if ((input.userMessage ?? "").toLowerCase().includes("procon") || (input.userMessage ?? "").toLowerCase().includes("processo")) {
    reasons.push("Cliente mencionou PROCON/processo.");
  }

  const level = reasons.length >= 2 ? RiskLevel.ALTO : reasons.length === 1 ? RiskLevel.MEDIO : RiskLevel.BAIXO;
  const blocked = level === RiskLevel.ALTO;
  return {
    level,
    reasons,
    blocked,
    requiresSupervisorApproval: level !== RiskLevel.BAIXO
  };
}
