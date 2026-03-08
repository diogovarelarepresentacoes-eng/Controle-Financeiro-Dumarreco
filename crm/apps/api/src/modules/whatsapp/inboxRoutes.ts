import { MessageDirection, MessageType, TicketStatus } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../config/prisma";
import { requiresApprovalForAiSend } from "../ai/approval";
import { writeAuditLog } from "../common/audit";
import { assignRoundRobin } from "../common/roundRobin";

const listSchema = z.object({
  storeId: z.string().optional(),
  assignedToId: z.string().optional(),
  status: z.nativeEnum(TicketStatus).optional(),
  tag: z.string().optional()
});

const assignSchema = z.object({
  conversationId: z.string(),
  assignedToId: z.string().optional()
});

const sendMessageSchema = z.object({
  conversationId: z.string(),
  body: z.string().min(1),
  approvedByUserId: z.string().min(1).optional(),
  aiSuggestionId: z.string().optional()
});

export const inboxRouter = Router();

inboxRouter.get("/monitor-kanban", async (_req, res, next) => {
  try {
    const conversations = await prisma.conversation.findMany({
      include: {
        contact: { include: { customerScore: true, worksites: true } },
        ticket: true,
        messages: { orderBy: { createdAt: "desc" }, take: 1 }
      },
      orderBy: { updatedAt: "desc" }
    });

    const conversationIds = conversations.map((conversation) => conversation.id);
    const suggestions = conversationIds.length
      ? await prisma.aiSuggestion.findMany({
          where: { conversationId: { in: conversationIds } },
          orderBy: { createdAt: "desc" }
        })
      : [];

    const latestSuggestionByConversation = new Map<string, (typeof suggestions)[number]>();
    for (const suggestion of suggestions) {
      if (!latestSuggestionByConversation.has(suggestion.conversationId)) {
        latestSuggestionByConversation.set(suggestion.conversationId, suggestion);
      }
    }

    const now = new Date();
    const cards = conversations.map((conversation) => {
      const latestSuggestion = latestSuggestionByConversation.get(conversation.id) ?? null;
      const lastMessage = conversation.messages[0] ?? null;
      const slaState =
        conversation.slaDueAt === null
          ? "SEM_SLA"
          : conversation.slaDueAt.getTime() >= now.getTime()
            ? "NO_PRAZO"
            : "ATRASADO";

      return {
        id: conversation.id,
        status: conversation.status,
        contactName: conversation.contact.name,
        phone: conversation.contact.phone,
        updatedAt: conversation.updatedAt,
        slaDueAt: conversation.slaDueAt,
        slaState,
        lastMessage: lastMessage
          ? { body: lastMessage.body, direction: lastMessage.direction, createdAt: lastMessage.createdAt }
          : null,
        ai: latestSuggestion
          ? {
              confidence: Number(latestSuggestion.confidence),
              requiresHuman: latestSuggestion.requiresHuman,
              approved: latestSuggestion.approvedById !== null
            }
          : null
      };
    });

    return res.status(200).json(cards);
  } catch (error) {
    return next(error);
  }
});

inboxRouter.get("/conversations", async (req, res, next) => {
  try {
    const filters = listSchema.parse(req.query);
    const conversations = await prisma.conversation.findMany({
      where: {
        storeId: filters.storeId,
        assignedToId: filters.assignedToId,
        status: filters.status,
        ticket:
          filters.tag !== undefined
            ? { tags: { has: filters.tag } }
            : undefined
      },
      include: {
        contact: true,
        ticket: true,
        messages: { orderBy: { createdAt: "desc" }, take: 25 },
        opportunities: {
          include: { stage: true, quotes: { orderBy: { createdAt: "desc" }, take: 3 } },
          where: { isActive: true },
          take: 1
        }
      },
      orderBy: { updatedAt: "desc" }
    });
    return res.status(200).json(conversations);
  } catch (error) {
    return next(error);
  }
});

inboxRouter.post("/assign", async (req, res, next) => {
  try {
    const data = assignSchema.parse(req.body);
    const conversation = await prisma.conversation.findUnique({ where: { id: data.conversationId } });
    if (!conversation) return res.status(404).json({ message: "Conversa nao encontrada" });

    const assignedToId = data.assignedToId ?? (await assignRoundRobin(conversation.storeId));
    const updated = await prisma.ticket.update({
      where: { conversationId: conversation.id },
      data: { assignedToId: assignedToId ?? null, status: TicketStatus.EM_ATENDIMENTO }
    });

    await prisma.conversation.update({
      where: { id: conversation.id },
      data: { assignedToId: assignedToId ?? null, status: TicketStatus.EM_ATENDIMENTO }
    });

    await writeAuditLog({
      userId: assignedToId,
      action: "TICKET_ASSIGNED",
      entity: "ticket",
      entityId: updated.id,
      afterData: updated
    });

    return res.status(200).json(updated);
  } catch (error) {
    return next(error);
  }
});

inboxRouter.post("/messages/send", async (req, res, next) => {
  try {
    const data = sendMessageSchema.parse(req.body);

    if (data.aiSuggestionId) {
      const suggestion = await prisma.aiSuggestion.findUnique({ where: { id: data.aiSuggestionId } });
      if (!suggestion) return res.status(404).json({ message: "Sugestao IA nao encontrada." });
      if (requiresApprovalForAiSend(data.aiSuggestionId, data.approvedByUserId)) {
        return res.status(400).json({ message: "Mensagem IA não pode ser enviada sem aprovação humana." });
      }
    }

    const message = await prisma.message.create({
      data: {
        conversationId: data.conversationId,
        direction: MessageDirection.OUTBOUND,
        type: MessageType.TEXT,
        body: data.body
      }
    });

    if (data.aiSuggestionId && data.approvedByUserId) {
      await prisma.aiSuggestion.update({
        where: { id: data.aiSuggestionId },
        data: { approvedById: data.approvedByUserId, finalSentMessageId: message.id }
      });
    }

    await writeAuditLog({
      userId: data.approvedByUserId ?? null,
      action: "OUTBOUND_MESSAGE_SENT",
      entity: "message",
      entityId: message.id,
      afterData: message
    });

    return res.status(201).json(message);
  } catch (error) {
    return next(error);
  }
});
