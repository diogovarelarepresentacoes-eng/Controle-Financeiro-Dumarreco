import { Router } from "express";
import crypto from "crypto";
import { env } from "../../config/env";
import { inboundWebhookSchema } from "./schemas";
import { ingestInboundMessage } from "./service";

export const whatsappRouter = Router();

function verifySignature(body: unknown, receivedSignature: string): boolean {
  const expected = crypto
    .createHmac("sha256", env.WHATSAPP_WEBHOOK_SECRET)
    .update(JSON.stringify(body))
    .digest("hex");

  const expectedBuffer = Buffer.from(expected, "utf8");
  const receivedBuffer = Buffer.from(receivedSignature.replace("sha256=", ""), "utf8");

  if (expectedBuffer.length !== receivedBuffer.length) return false;
  return crypto.timingSafeEqual(expectedBuffer, receivedBuffer);
}

whatsappRouter.post("/webhook/inbound", async (req, res, next) => {
  try {
    const signature = req.header("x-webhook-signature");
    if (!signature || !verifySignature(req.body, signature)) {
      return res.status(401).json({ message: "Assinatura invalida" });
    }

    const payload = inboundWebhookSchema.parse(req.body);
    const result = await ingestInboundMessage(payload);
    return res.status(201).json(result);
  } catch (error) {
    return next(error);
  }
});
