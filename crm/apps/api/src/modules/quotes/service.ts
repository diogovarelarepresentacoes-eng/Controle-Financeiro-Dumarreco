import { RoleName } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { getDiscountLimit } from "../common/discount";
import { writeAuditLog } from "../common/audit";
import { assessCommercialRisk } from "../risk/engine";
import { CreateQuoteInput } from "./schemas";

export async function createQuote(input: CreateQuoteInput) {
  const creator = await prisma.user.findUnique({ where: { id: input.createdById } });
  if (!creator) throw new Error("Usuario criador nao encontrado.");

  const role = creator.role as RoleName;
  const maxDiscount = getDiscountLimit(role);

  let subtotal = 0;
  let weightedDiscount = 0;

  const itemData = await Promise.all(
    input.items.map(async (item) => {
      if (item.discountPct > maxDiscount) {
        throw new Error(`Desconto de ${item.discountPct}% excede limite da role.`);
      }

      const product = await prisma.product.findUnique({ where: { id: item.productId } });
      if (!product) throw new Error("Produto nao encontrado.");
      if (!["SACO", "M3", "UNIDADE", "LATA"].includes(product.unit)) {
        throw new Error("Unidade do produto invalida para cotacao.");
      }

      const productPrice = await prisma.productPrice.findUnique({
        where: { productId_storeId: { productId: item.productId, storeId: input.storeId } }
      });
      const customRule = await prisma.priceRule.findFirst({
        where: {
          storeId: input.storeId,
          role,
          OR: [{ productId: item.productId }, { productId: null }]
        },
        orderBy: { createdAt: "desc" }
      });
      const unitPrice = item.unitPrice ?? Number(productPrice?.price ?? 0);
      if (customRule && Number(customRule.maxDiscount) < item.discountPct) {
        throw new Error(`Desconto de ${item.discountPct}% excede politica comercial.`);
      }
      if (customRule?.minUnitPrice && unitPrice < Number(customRule.minUnitPrice)) {
        throw new Error("Preco unitario abaixo do minimo permitido.");
      }
      const gross = unitPrice * item.quantity;
      const itemSubtotal = gross * (1 - item.discountPct / 100);
      subtotal += itemSubtotal;
      weightedDiscount += item.discountPct * gross;

      return {
        productId: item.productId,
        productName: product.name,
        unit: product.unit,
        quantity: item.quantity.toFixed(3),
        unitPrice: unitPrice.toFixed(2),
        discountPct: item.discountPct.toFixed(2),
        subtotal: itemSubtotal.toFixed(2)
      };
    })
  );

  const totalGross = input.items.reduce(
    (acc, item, index) => acc + Number(itemData[index].unitPrice) * item.quantity,
    0
  );

  const discountPercent = totalGross > 0 ? weightedDiscount / totalGross : 0;
  const contact = await prisma.contact.findUnique({
    where: { id: input.contactId },
    include: { customerScore: true }
  });
  const risk = assessCommercialRisk({
    role,
    discountPct: discountPercent,
    isNewCustomer: (contact?.customerScore?.tier ?? "NOVO_CLIENTE") === "NOVO_CLIENTE",
    orderTotal: subtotal,
    installmentsCount: input.installmentsCount,
    parcelingAllowed: input.parcelingAllowed,
    promiseDeliveryWithoutStock: input.promiseDeliveryWithoutStock,
    userMessage: input.userMessage
  });

  const quote = await prisma.quote.create({
    data: {
      storeId: input.storeId,
      contactId: input.contactId,
      opportunityId: input.opportunityId ?? null,
      worksiteId: input.worksiteId ?? null,
      createdById: input.createdById,
      subtotal: subtotal.toFixed(2),
      discountPercent: discountPercent.toFixed(2),
      total: subtotal.toFixed(2),
      riskLevel: risk.level,
      riskReasons: risk.reasons,
      needsSupervisorApproval: risk.requiresSupervisorApproval,
      status: risk.blocked ? "PENDENTE_APROVACAO_SUPERVISOR" : "ENVIADO",
      pdfUrl: `https://crm.local/quotes/${Date.now()}`,
      items: { create: itemData }
    },
    include: { items: true }
  });

  await writeAuditLog({
    userId: creator.id,
    action: "QUOTE_CREATED",
    entity: "quote",
    entityId: quote.id,
    afterData: quote
  });

  if (discountPercent > 0) {
    await writeAuditLog({
      userId: creator.id,
      action: "DISCOUNT_APPLIED",
      entity: "quote",
      entityId: quote.id,
      afterData: { discountPercent: discountPercent.toFixed(2) }
    });
  }

  if (risk.level !== "BAIXO") {
    await prisma.riskEvent.create({
      data: {
        quoteId: quote.id,
        conversationId: quote.opportunityId
          ? (await prisma.opportunity.findUnique({ where: { id: quote.opportunityId } }))?.conversationId ?? null
          : null,
        level: risk.level,
        reason: risk.reasons.join(" | "),
        blocked: risk.blocked
      }
    });
  }

  return { ...quote, risk };
}
