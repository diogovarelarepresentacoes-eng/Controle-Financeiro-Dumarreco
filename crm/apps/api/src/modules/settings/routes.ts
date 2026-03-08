import { ProviderType } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { aiRulesSchema, testSendSchema, whatsappSettingsSchema } from "./schemas";
import {
  getAiRules,
  getDiagnostics,
  getWhatsAppSettings,
  saveAiRules,
  saveWhatsAppSettings,
  simulateInboundWebhook,
  testConnection,
  testSend,
  validateAiRules
} from "./service";

export const settingsRouter = Router();

settingsRouter.get("/whatsapp", async (_req, res, next) => {
  try {
    const data = await getWhatsAppSettings();
    return res.status(200).json(data);
  } catch (error) {
    return next(error);
  }
});

settingsRouter.put("/whatsapp", async (req, res, next) => {
  try {
    const input = whatsappSettingsSchema.parse(req.body);
    const saved = await saveWhatsAppSettings(input);
    return res.status(200).json(saved);
  } catch (error) {
    return next(error);
  }
});

settingsRouter.post("/whatsapp/test-connection", async (_req, res, next) => {
  try {
    const result = await testConnection();
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
});

settingsRouter.post("/whatsapp/test-send", async (req, res, next) => {
  try {
    const payload = testSendSchema.parse(req.body);
    const result = await testSend(payload);
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
});

settingsRouter.get("/ai-rules", async (_req, res, next) => {
  try {
    const data = await getAiRules();
    return res.status(200).json(data);
  } catch (error) {
    return next(error);
  }
});

settingsRouter.put("/ai-rules", async (req, res, next) => {
  try {
    const input = aiRulesSchema.parse(req.body);
    const saved = await saveAiRules(input);
    return res.status(200).json(saved);
  } catch (error) {
    return next(error);
  }
});

settingsRouter.post("/ai-rules/validate", async (req, res, next) => {
  try {
    const body = z.object({ businessRulesPrompt: z.string() }).parse(req.body);
    const result = validateAiRules(body.businessRulesPrompt);
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
});

settingsRouter.get("/diagnostics", async (_req, res, next) => {
  try {
    const data = await getDiagnostics();
    return res.status(200).json(data);
  } catch (error) {
    return next(error);
  }
});

settingsRouter.post("/diagnostics/simulate-webhook", async (req, res, next) => {
  try {
    const body = z.object({ providerType: z.nativeEnum(ProviderType) }).parse(req.body);
    const result = await simulateInboundWebhook(body.providerType);
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
});
