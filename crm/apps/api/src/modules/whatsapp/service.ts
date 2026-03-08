import { MessageDirection, MessageType, TicketStatus } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { assignRoundRobin } from "../common/roundRobin";
import { writeAuditLog } from "../common/audit";
import { InboundWebhookInput } from "./schemas";

function normalizeType(rawType: InboundWebhookInput["type"]): MessageType {
  if (rawType === "audio") return MessageType.AUDIO;
  if (rawType === "image") return MessageType.IMAGE;
  return MessageType.TEXT;
}

export async function ingestInboundMessage(payload: InboundWebhookInput) {
  const store = await prisma.store.findUnique({ where: { code: payload.storeCode } });
  if (!store) throw new Error("Filial nao encontrada");

  const contact = await prisma.contact.upsert({
    where: {
      id: `contact-${store.id}-${payload.from}`
    },
    update: {
      name: payload.contactName ?? payload.from
    },
    create: {
      id: `contact-${store.id}-${payload.from}`,
      storeId: store.id,
      name: payload.contactName ?? payload.from,
      phone: payload.from
    }
  });

  let conversation = await prisma.conversation.findFirst({
    where: { storeId: store.id, contactId: contact.id, status: { not: TicketStatus.FECHADO } },
    orderBy: { updatedAt: "desc" }
  });

  if (!conversation) {
    const assignedToId = await assignRoundRobin(store.id);
    conversation = await prisma.conversation.create({
      data: {
        storeId: store.id,
        contactId: contact.id,
        assignedToId,
        status: TicketStatus.ABERTO
      }
    });

    await prisma.ticket.create({
      data: {
        storeId: store.id,
        conversationId: conversation.id,
        assignedToId,
        status: TicketStatus.ABERTO,
        tags: []
      }
    });
  }

  const message = await prisma.message.create({
    data: {
      conversationId: conversation.id,
      providerMessageId: payload.providerMessageId,
      direction: MessageDirection.INBOUND,
      type: normalizeType(payload.type),
      body: payload.text ?? null,
      mediaUrl: payload.mediaUrl ?? null,
      metadata: (payload.metadata ?? {}) as Prisma.InputJsonValue
    }
  });

  await writeAuditLog({
    action: "WEBHOOK_INBOUND_CREATED",
    entity: "message",
    entityId: message.id,
    afterData: { conversationId: conversation.id, storeId: store.id }
  });

  return { conversationId: conversation.id, messageId: message.id };
}
