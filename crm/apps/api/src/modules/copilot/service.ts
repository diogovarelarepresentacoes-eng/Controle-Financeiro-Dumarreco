import { CustomerTier } from "@prisma/client";
import { prisma } from "../../config/prisma";

function detectUpsellProducts(message: string) {
  const lower = message.toLowerCase();
  if (lower.includes("cimento")) return ["Areia", "Brita"];
  if (lower.includes("tinta")) return ["Rolo", "Fita crepe"];
  if (lower.includes("argamassa")) return ["Rejunte", "Desempenadeira"];
  return ["Acessórios complementares"];
}

function detectApproach(tier: CustomerTier | null, priceSensitive: boolean) {
  if (priceSensitive) return "Ativar supervisor";
  if (tier === CustomerTier.PREMIUM || tier === CustomerTier.OBRA_GRANDE) return "Não oferecer desconto";
  return "Oferecer desconto leve";
}

export async function generateSalesCopilotSuggestion(conversationId: string) {
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: {
      contact: { include: { customerScore: true } },
      messages: { orderBy: { createdAt: "desc" }, take: 10 },
      opportunities: { where: { isActive: true }, take: 1, include: { quotes: { orderBy: { createdAt: "desc" }, take: 5 } } }
    }
  });
  if (!conversation) throw new Error("Conversa não encontrada.");

  const lastInbound = conversation.messages.find((message) => message.direction === "INBOUND")?.body ?? "";
  const upsell = detectUpsellProducts(lastInbound);
  const quotes = conversation.opportunities[0]?.quotes ?? [];
  const estimatedTicket = quotes.length ? quotes.reduce((acc, quote) => acc + Number(quote.total), 0) / quotes.length : 650;
  const closureProbability = Math.min(95, 30 + quotes.length * 15 + (conversation.contact.customerScore?.totalScore ?? 0) / 5);
  const repurchaseChance = Math.min(90, 25 + (conversation.contact.customerScore?.frequencyScore ?? 0) * 5);
  const priceSensitive = lastInbound.toLowerCase().includes("desconto") || lastInbound.toLowerCase().includes("preço");
  const approach = detectApproach(conversation.contact.customerScore?.tier ?? null, priceSensitive);

  const suggestion = `Upsell sugerido: ${upsell.join(", ")}. Abordagem recomendada: ${approach}.`;
  const confidence = Number((Math.min(0.96, 0.72 + (conversation.contact.customerScore?.totalScore ?? 40) / 200)).toFixed(2));
  const requiresHuman = confidence < 0.8 || /preço|desconto|prazo|estoque|frete|garantia|fiscal/i.test(lastInbound);
  const reasoning = "Sugestão baseada no histórico da conversa, score do cliente e padrões de itens complementares.";

  const saved = await prisma.salesCopilotSuggestion.create({
    data: {
      conversationId,
      suggestion,
      confidence: confidence.toFixed(2),
      requiresHuman,
      reasoning,
      closureProbability: closureProbability.toFixed(2),
      estimatedTicket: estimatedTicket.toFixed(2),
      repurchaseChance: repurchaseChance.toFixed(2)
    }
  });

  return {
    suggestion: saved.suggestion,
    confidence: Number(saved.confidence),
    requires_human: saved.requiresHuman,
    reasoning: saved.reasoning,
    closure_probability: Number(saved.closureProbability),
    estimated_ticket: Number(saved.estimatedTicket),
    repurchase_chance: Number(saved.repurchaseChance)
  };
}
