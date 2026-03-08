import { ProviderType } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { ingestInboundMessage } from "../whatsapp/service";
import { registerWebhookEvent, validateWebhookSignature } from "./service";

function normalizeInbound(payload: Record<string, unknown>) {
  const normalizedType: "text" | "audio" | "image" =
    payload.type === "audio" || payload.type === "image" ? payload.type : "text";
  return {
    storeCode: String(payload.storeCode ?? "MATRIZ"),
    from: String(payload.from ?? payload.phone ?? ""),
    contactName: String(payload.contactName ?? payload.name ?? "Cliente WhatsApp"),
    type: normalizedType,
    text: String(payload.text ?? payload.body ?? ""),
    providerMessageId: payload.providerMessageId ? String(payload.providerMessageId) : undefined,
    mediaUrl: payload.mediaUrl ? String(payload.mediaUrl) : undefined,
    metadata: payload
  };
}

export const settingsWebhookRouter = Router();

settingsWebhookRouter.post("/whatsapp/:provider", async (req, res, next) => {
  try {
    const params = z.object({ provider: z.nativeEnum(ProviderType) }).parse(req.params);
    const headers = Object.entries(req.headers).reduce<Record<string, string>>((acc, [key, value]) => {
      acc[key.toLowerCase()] = Array.isArray(value) ? value.join(",") : String(value ?? "");
      return acc;
    }, {});

    const valid = await validateWebhookSignature(params.provider, headers, req.body);
    if (!valid) return res.status(401).json({ message: "Assinatura invalida." });

    await registerWebhookEvent(params.provider, "inbound", req.body);
    const inbound = normalizeInbound(req.body as Record<string, unknown>);
    if (!inbound.from) return res.status(200).json({ ok: true, ignored: true });
    await ingestInboundMessage(inbound);
    return res.status(200).json({ ok: true });
  } catch (error) {
    return next(error);
  }
});
