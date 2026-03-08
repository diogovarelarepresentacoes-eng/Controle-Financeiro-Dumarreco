import { Prisma, ReceivableStatus } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { writeAuditLog } from "../common/audit";
import { GenerateReceivableInput, RegisterPaymentInput } from "./schemas";

function buildChargeLink(receivableId: string): string {
  return `https://crm.local/cobranca/${receivableId}`;
}

export async function generateReceivableFromQuote(input: GenerateReceivableInput) {
  const existing = await prisma.receivable.findUnique({ where: { quoteId: input.quoteId } });
  if (existing) return existing;

  const quote = await prisma.quote.findUnique({
    where: { id: input.quoteId },
    include: { opportunity: true }
  });
  if (!quote) throw new Error("Orcamento nao encontrado.");
  if (!quote.opportunity) throw new Error("Orcamento sem oportunidade vinculada.");

  const total = Number(quote.total);
  const installments =
    input.installments.length > 0
      ? input.installments
      : [{ number: 1, amount: total, dueDate: input.dueDate }];

  const sumInstallments = installments.reduce((acc, installment) => acc + installment.amount, 0);
  if (Math.abs(sumInstallments - total) > 0.01) {
    throw new Error("Soma das parcelas deve ser igual ao total do orcamento.");
  }

  const receivable = await prisma.$transaction(async (tx) => {
    const created = await tx.receivable.create({
      data: {
        quoteId: quote.id,
        conversationId: quote.opportunity!.conversationId,
        contactId: quote.contactId,
        total: total.toFixed(2),
        dueDate: new Date(input.dueDate),
        status: ReceivableStatus.PENDENTE,
        paymentMethod: input.paymentMethod,
        createdBy: input.createdBy,
        chargeLink: buildChargeLink(quote.id),
        installments: {
          create: installments.map((installment) => ({
            number: installment.number,
            amount: installment.amount.toFixed(2),
            dueDate: new Date(installment.dueDate),
            status: ReceivableStatus.PENDENTE
          }))
        }
      },
      include: { installments: true }
    });

    await tx.auditLog.create({
      data: {
        userId: input.createdBy,
        action: "RECEIVABLE_CREATED",
        entity: "receivable",
        entityId: created.id,
        afterData: created as unknown as Prisma.InputJsonValue
      }
    });

    await tx.auditLog.create({
      data: {
        userId: input.createdBy,
        action: "TITULO_GERADO",
        entity: "conversation",
        entityId: quote.opportunity!.conversationId,
        afterData: { receivableId: created.id } as Prisma.InputJsonValue
      }
    });

    return created;
  });

  return receivable;
}

export async function registerPayment(input: RegisterPaymentInput) {
  const receivable = await prisma.receivable.findUnique({
    where: { id: input.receivableId },
    include: { installments: true }
  });
  if (!receivable) throw new Error("Titulo nao encontrado.");

  const payment = await prisma.payment.create({
    data: {
      receivableId: receivable.id,
      amount: input.amount.toFixed(2),
      paidAt: new Date(input.paidAt),
      method: input.method,
      reference: input.reference ?? null
    }
  });

  await prisma.receivable.update({
    where: { id: receivable.id },
    data: {
      status: ReceivableStatus.PAGO,
      installments: {
        updateMany: {
          where: { receivableId: receivable.id },
          data: { status: ReceivableStatus.PAGO }
        }
      }
    }
  });

  await writeAuditLog({
    userId: input.authorizedByUserId,
    action: "RECEIVABLE_PAID_MANUAL",
    entity: "payment",
    entityId: payment.id,
    afterData: payment
  });

  return payment;
}

export async function loadFinancePanelByConversation(conversationId: string) {
  const [receivables, logs] = await Promise.all([
    prisma.receivable.findMany({
      where: { conversationId },
      include: { installments: true, payments: true },
      orderBy: { createdAt: "desc" }
    }),
    prisma.auditLog.findMany({
      where: { entity: "conversation", entityId: conversationId },
      orderBy: { createdAt: "desc" },
      take: 20
    })
  ]);

  return { receivables, history: logs };
}
