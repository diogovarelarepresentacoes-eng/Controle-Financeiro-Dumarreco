import { z } from "zod";

export const inboundWebhookSchema = z.object({
  storeCode: z.string().min(1),
  providerMessageId: z.string().optional(),
  from: z.string().min(6),
  contactName: z.string().optional(),
  type: z.enum(["text", "audio", "image"]).default("text"),
  text: z.string().optional(),
  mediaUrl: z.string().url().optional(),
  metadata: z.record(z.unknown()).optional()
});

export type InboundWebhookInput = z.infer<typeof inboundWebhookSchema>;
