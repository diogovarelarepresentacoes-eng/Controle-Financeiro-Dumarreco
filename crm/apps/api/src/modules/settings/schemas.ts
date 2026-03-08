import { AiMode, ProviderType } from "@prisma/client";
import { z } from "zod";

export const providerTypeSchema = z.nativeEnum(ProviderType);

export const whatsappSettingsSchema = z.object({
  accountName: z.string().min(2),
  providerType: providerTypeSchema,
  phoneNumberE164: z.string().regex(/^\+[1-9]\d{7,14}$/),
  countryCode: z.string().optional(),
  config: z.record(z.unknown()),
  webhookVerifyToken: z.string().optional(),
  isActive: z.boolean().default(false)
});

export const testSendSchema = z.object({
  to: z.string().regex(/^\+[1-9]\d{7,14}$/),
  text: z.string().min(1).default("Olá! Este é um teste do nosso atendimento.")
});

export const aiRulesSchema = z.object({
  businessRulesPrompt: z.string().min(20),
  modeDefault: z.nativeEnum(AiMode).default(AiMode.ASSISTIDO),
  confidenceThreshold: z.number().min(0).max(1).default(0.8)
});

export type WhatsAppSettingsInput = z.infer<typeof whatsappSettingsSchema>;
export type TestSendInput = z.infer<typeof testSendSchema>;
export type AiRulesInput = z.infer<typeof aiRulesSchema>;
