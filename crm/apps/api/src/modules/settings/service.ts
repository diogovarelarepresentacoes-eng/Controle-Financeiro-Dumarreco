import { AiMode, MessageLogStatus, Prisma, ProviderType } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { env } from "../../config/env";
import { ingestInboundMessage } from "../whatsapp/service";
import { writeAuditLog } from "../common/audit";
import { decryptJson, encryptJson, maskSecrets } from "./crypto";
import { DEFAULT_AI_RULES_PROMPT } from "./defaults";
import { getProviderClient } from "./providers/factory";
import { AiRulesInput, TestSendInput, WhatsAppSettingsInput } from "./schemas";

function webhookUrl(provider: ProviderType) {
  return `${env.APP_BASE_URL}/api/webhooks/whatsapp/${provider}`;
}

type ChecklistItem = { item: string; ok: boolean };

function buildChecklist(input: WhatsAppSettingsInput, missing: string[]): ChecklistItem[] {
  return [
    { item: "Nome da conta", ok: Boolean(input.accountName) },
    { item: "Numero WhatsApp E.164", ok: Boolean(input.phoneNumberE164) },
    { item: "Provedor selecionado", ok: Boolean(input.providerType) },
    { item: "Credenciais obrigatorias", ok: missing.length === 0 }
  ];
}

export async function getWhatsAppSettings() {
  const settings = await prisma.whatsAppSetting.findFirst({ orderBy: { updatedAt: "desc" } });
  if (!settings) {
    return {
      settings: null,
      webhookUrlByProvider: Object.values(ProviderType).reduce<Record<string, string>>((acc, provider) => {
        acc[provider] = webhookUrl(provider);
        return acc;
      }, {})
    };
  }

  const config = decryptJson<Record<string, unknown>>(settings.configJson);
  const maskedConfig = maskSecrets(config);
  return {
    settings: {
      id: settings.id,
      accountName: settings.accountName,
      providerType: settings.providerType,
      phoneNumberE164: settings.phoneNumberE164,
      countryCode: settings.countryCode,
      webhookVerifyToken: settings.webhookVerifyToken,
      isActive: settings.isActive,
      createdAt: settings.createdAt,
      updatedAt: settings.updatedAt,
      config: maskedConfig
    },
    webhookUrlByProvider: Object.values(ProviderType).reduce<Record<string, string>>((acc, provider) => {
      acc[provider] = webhookUrl(provider);
      return acc;
    }, {})
  };
}

export async function saveWhatsAppSettings(input: WhatsAppSettingsInput) {
  const client = getProviderClient(input.providerType);
  const validation = client.validateConfig(input.config);
  const checklist = buildChecklist(input, validation.missingFields ?? []);

  if (input.isActive && !validation.ok) {
    throw new Error("Nao e permitido ativar sem passar no teste de conexao.");
  }
  if (input.isActive) {
    const connection = await client.testConnection(input.config);
    if (!connection.ok) {
      throw new Error(`Nao e permitido ativar: ${connection.message}`);
    }
  }

  const encrypted = encryptJson(input.config);
  const existing = await prisma.whatsAppSetting.findFirst({ orderBy: { updatedAt: "desc" } });
  const saved = existing
    ? await prisma.whatsAppSetting.update({
        where: { id: existing.id },
        data: {
          accountName: input.accountName,
          providerType: input.providerType,
          phoneNumberE164: input.phoneNumberE164,
          countryCode: input.countryCode ?? null,
          configJson: encrypted,
          webhookVerifyToken: input.webhookVerifyToken ?? null,
          isActive: input.isActive
        }
      })
    : await prisma.whatsAppSetting.create({
        data: {
          accountName: input.accountName,
          providerType: input.providerType,
          phoneNumberE164: input.phoneNumberE164,
          countryCode: input.countryCode ?? null,
          configJson: encrypted,
          webhookVerifyToken: input.webhookVerifyToken ?? null,
          isActive: input.isActive
        }
      });

  await writeAuditLog({
    action: "WHATSAPP_SETTINGS_SAVED",
    entity: "whatsapp_settings",
    entityId: saved.id,
    afterData: { providerType: saved.providerType, isActive: saved.isActive }
  });

  return { saved, checklist, validation };
}

export async function testConnection() {
  const settings = await prisma.whatsAppSetting.findFirst({ orderBy: { updatedAt: "desc" } });
  if (!settings) throw new Error("Configure o WhatsApp antes de testar conexao.");
  const config = decryptJson<Record<string, unknown>>(settings.configJson);
  const client = getProviderClient(settings.providerType);
  const validation = client.validateConfig(config);
  if (!validation.ok) return { ok: false, message: "Configuracao incompleta.", missingFields: validation.missingFields };
  return client.testConnection(config);
}

export async function testSend(payload: TestSendInput) {
  const settings = await prisma.whatsAppSetting.findFirst({ orderBy: { updatedAt: "desc" } });
  if (!settings) throw new Error("Configure o WhatsApp antes de enviar teste.");
  const config = decryptJson<Record<string, unknown>>(settings.configJson);
  const client = getProviderClient(settings.providerType);

  const validation = client.validateConfig(config);
  if (!validation.ok) {
    return { status: "FAILED", message: "Falha: faltam campos obrigatorios.", missingFields: validation.missingFields };
  }

  const result = await client.sendMessage(config, payload.to, payload.text);
  const log = await prisma.whatsAppMessageLog.create({
    data: {
      providerType: settings.providerType,
      fromNumber: settings.phoneNumberE164,
      toNumber: payload.to,
      payloadPreview: payload.text.slice(0, 200),
      status: result.status as MessageLogStatus,
      externalMessageId: result.messageId ?? null,
      errorMessage: result.errorMessage ?? null
    }
  });

  return { ...result, logId: log.id };
}

export async function getAiRules() {
  const rules = await prisma.aiSetting.findFirst({ orderBy: { updatedAt: "desc" } });
  if (rules) return rules;
  return prisma.aiSetting.create({
    data: {
      businessRulesPrompt: DEFAULT_AI_RULES_PROMPT,
      modeDefault: AiMode.ASSISTIDO,
      confidenceThreshold: "0.80"
    }
  });
}

export async function saveAiRules(input: AiRulesInput) {
  const current = await prisma.aiSetting.findFirst({ orderBy: { updatedAt: "desc" } });
  const saved = current
    ? await prisma.aiSetting.update({
        where: { id: current.id },
        data: {
          businessRulesPrompt: input.businessRulesPrompt,
          modeDefault: input.modeDefault,
          confidenceThreshold: input.confidenceThreshold.toFixed(2)
        }
      })
    : await prisma.aiSetting.create({
        data: {
          businessRulesPrompt: input.businessRulesPrompt,
          modeDefault: input.modeDefault,
          confidenceThreshold: input.confidenceThreshold.toFixed(2)
        }
      });
  return saved;
}

export function validateAiRules(prompt: string) {
  const lower = prompt.toLowerCase();
  const warnings: string[] = [];
  if (!lower.includes("não inventar") && !lower.includes("nao inventar")) {
    warnings.push("Prompt deve conter seção 'NÃO INVENTAR'.");
  }
  if (!lower.includes("revisão humana obrigatória") && !lower.includes("revisao humana obrigatoria")) {
    warnings.push("Prompt deve exigir revisão humana obrigatória para temas sensíveis.");
  }
  if (!lower.includes("se não souber") && !lower.includes("se nao souber")) {
    warnings.push("Prompt deve orientar: se não souber, pedir confirmação.");
  }
  return { valid: warnings.length === 0, warnings };
}

export async function getDiagnostics() {
  const [lastWebhook, logs, settings] = await Promise.all([
    prisma.webhookEvent.findFirst({ orderBy: { receivedAt: "desc" } }),
    prisma.whatsAppMessageLog.findMany({ orderBy: { createdAt: "desc" }, take: 20 }),
    prisma.whatsAppSetting.findFirst({ orderBy: { updatedAt: "desc" } })
  ]);
  return {
    webhookUrl: settings ? webhookUrl(settings.providerType) : null,
    lastWebhook,
    logs
  };
}

export async function registerWebhookEvent(providerType: ProviderType, eventType: string, rawPayload: unknown) {
  return prisma.webhookEvent.create({
    data: {
      providerType,
      eventType,
      rawPayload: rawPayload as Prisma.InputJsonValue
    }
  });
}

export async function simulateInboundWebhook(providerType: ProviderType) {
  await registerWebhookEvent(providerType, "simulated_inbound", { simulated: true });
  await ingestInboundMessage({
    storeCode: "MATRIZ",
    from: "+5588999999999",
    contactName: "Cliente Simulado",
    type: "text",
    text: "Mensagem simulada para teste"
  });
  return { ok: true };
}

export async function validateWebhookSignature(providerType: ProviderType, headers: Record<string, string>, payload: unknown) {
  const settings = await prisma.whatsAppSetting.findFirst({ orderBy: { updatedAt: "desc" } });
  if (!settings || settings.providerType !== providerType) return false;
  const config = decryptJson<Record<string, unknown>>(settings.configJson);

  if (providerType === ProviderType.CUSTOM_WEBHOOK) {
    const expected = String(config.inbound_webhook_secret ?? "");
    return expected.length > 0 && headers["x-webhook-signature"] === expected;
  }
  if (settings.webhookVerifyToken) {
    return headers["x-verify-token"] === settings.webhookVerifyToken;
  }
  return payload !== null;
}
