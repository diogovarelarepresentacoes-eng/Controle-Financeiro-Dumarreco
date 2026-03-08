import { CustomerTier } from "@prisma/client";
import { prisma } from "../../config/prisma";

function classifyTier(totalScore: number, activeWorksites: number, avgTicket: number): CustomerTier {
  if (activeWorksites >= 2) return CustomerTier.OBRA_GRANDE;
  if (totalScore >= 80 && avgTicket > 1500) return CustomerTier.PREMIUM;
  if (totalScore >= 65) return CustomerTier.RECORRENTE;
  if (totalScore >= 45) return CustomerTier.SENSIVEL_PRECO;
  return CustomerTier.NOVO_CLIENTE;
}

export async function updateCustomerScoresDaily() {
  const contacts = await prisma.contact.findMany({
    include: {
      worksites: true,
      conversations: {
        include: {
          messages: true,
          opportunities: { include: { quotes: true } }
        }
      }
    }
  });

  const updated: string[] = [];
  for (const contact of contacts) {
    const quotes = contact.conversations.flatMap((conversation) =>
      conversation.opportunities.flatMap((opportunity) => opportunity.quotes)
    );
    const purchasesCount = quotes.length;
    const avgTicket = purchasesCount ? quotes.reduce((acc, quote) => acc + Number(quote.total), 0) / purchasesCount : 0;
    const inboundMessages = contact.conversations.flatMap((c) => c.messages).filter((m) => m.direction === "INBOUND");
    const outboundMessages = contact.conversations.flatMap((c) => c.messages).filter((m) => m.direction === "OUTBOUND");
    const responseTimeScore = outboundMessages.length >= inboundMessages.length ? 20 : 10;
    const complaintsScore = contact.conversations.some((conversation) =>
      conversation.messages.some((message) => (message.body ?? "").toLowerCase().includes("reclama"))
    )
      ? 5
      : 20;
    const frequencyScore = Math.min(30, purchasesCount * 6);
    const avgTicketScore = Math.min(20, Math.round(avgTicket / 250));
    const activeWorksitesScore = Math.min(20, contact.worksites.length * 7);
    const totalScore = frequencyScore + avgTicketScore + responseTimeScore + complaintsScore + activeWorksitesScore;
    const tier = classifyTier(totalScore, contact.worksites.length, avgTicket);

    const current = await prisma.customerScore.findUnique({ where: { contactId: contact.id } });
    if (current) {
      await prisma.customerScore.update({
        where: { contactId: contact.id },
        data: {
          frequencyScore,
          avgTicketScore,
          responseTimeScore,
          complaintsScore,
          activeWorksitesScore,
          totalScore,
          tier
        }
      });
    } else {
      await prisma.customerScore.create({
        data: {
          contactId: contact.id,
          frequencyScore,
          avgTicketScore,
          responseTimeScore,
          complaintsScore,
          activeWorksitesScore,
          totalScore,
          tier
        }
      });
    }
    updated.push(contact.id);
  }
  return updated;
}
