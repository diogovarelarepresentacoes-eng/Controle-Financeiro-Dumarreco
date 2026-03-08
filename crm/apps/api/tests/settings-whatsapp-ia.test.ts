import { ProviderType } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { prismaMock, providerMock } = vi.hoisted(() => {
  process.env.DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/controle_financeiro?schema=public";
  process.env.WHATSAPP_WEBHOOK_SECRET = "test-webhook-secret";
  process.env.SECRET_KEY = "test-secret-key-123456";
  process.env.APP_BASE_URL = "http://localhost:4000";
  return {
    prismaMock: {
      whatsAppSetting: { findFirst: vi.fn(), create: vi.fn(), update: vi.fn() },
      aiSetting: { findFirst: vi.fn(), create: vi.fn(), update: vi.fn() },
      whatsAppMessageLog: { create: vi.fn(), findMany: vi.fn() },
      webhookEvent: { findFirst: vi.fn(), create: vi.fn() },
      auditLog: { create: vi.fn() }
    },
    providerMock: {
      validateConfig: vi.fn(),
      testConnection: vi.fn(),
      sendMessage: vi.fn()
    }
  };
});

vi.mock("../src/config/prisma", () => ({ prisma: prismaMock }));
vi.mock("../src/modules/settings/providers/factory", () => ({
  getProviderClient: vi.fn(() => providerMock)
}));

import {
  getWhatsAppSettings,
  saveWhatsAppSettings,
  testConnection,
  testSend
} from "../src/modules/settings/service";
import { encryptJson } from "../src/modules/settings/crypto";

describe("settings whatsapp & ia", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("salva configuracao e retorna checklist", async () => {
    providerMock.validateConfig.mockReturnValue({ ok: true, message: "ok", missingFields: [] });
    prismaMock.whatsAppSetting.findFirst.mockResolvedValue(null);
    prismaMock.whatsAppSetting.create.mockResolvedValue({
      id: "ws-1",
      providerType: ProviderType.META_CLOUD_API,
      isActive: false
    });
    prismaMock.auditLog.create.mockResolvedValue({ id: "a-1" });

    const result = await saveWhatsAppSettings({
      accountName: "Conta teste",
      providerType: ProviderType.META_CLOUD_API,
      phoneNumberE164: "+5588999999999",
      config: { access_token: "token-super-secreto" },
      isActive: false
    });

    expect(result.validation.ok).toBe(true);
    expect(result.checklist.every((item) => item.ok)).toBe(true);
  });

  it("mascara tokens ao consultar configuracao", async () => {
    const encrypted = encryptJson({ access_token: "abc1234567" });
    prismaMock.whatsAppSetting.findFirst.mockResolvedValue({
      id: "ws-1",
      accountName: "Conta",
      providerType: ProviderType.META_CLOUD_API,
      phoneNumberE164: "+5588999999999",
      countryCode: "BR",
      configJson: encrypted,
      webhookVerifyToken: null,
      isActive: false,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    const result = await getWhatsAppSettings();
    const maskedToken = (result.settings as { config: { access_token: string } }).config.access_token;
    expect(maskedToken.endsWith("4567")).toBe(true);
    expect(maskedToken.startsWith("****")).toBe(true);
  });

  it("test-connection retorna erro quando faltam campos", async () => {
    const encrypted = encryptJson({});
    prismaMock.whatsAppSetting.findFirst.mockResolvedValue({
      id: "ws-1",
      providerType: ProviderType.TWILIO_WHATSAPP,
      configJson: encrypted
    });
    providerMock.validateConfig.mockReturnValue({ ok: false, message: "Campos faltando", missingFields: ["account_sid"] });

    const result = await testConnection();
    expect(result.ok).toBe(false);
    expect(result.missingFields).toContain("account_sid");
  });

  it("test-send registra log de envio", async () => {
    const encrypted = encryptJson({ outbound_endpoint_url: "https://example.com", inbound_webhook_secret: "s3cr3t" });
    prismaMock.whatsAppSetting.findFirst.mockResolvedValue({
      id: "ws-1",
      providerType: ProviderType.CUSTOM_WEBHOOK,
      configJson: encrypted,
      phoneNumberE164: "+5588999999999"
    });
    providerMock.validateConfig.mockReturnValue({ ok: true, message: "ok", missingFields: [] });
    providerMock.sendMessage.mockResolvedValue({ status: "QUEUED", messageId: "msg-1" });
    prismaMock.whatsAppMessageLog.create.mockResolvedValue({ id: "log-1" });

    const result = await testSend({ to: "+5588999990000", text: "teste" });
    expect(result.status).toBe("QUEUED");
    expect(prismaMock.whatsAppMessageLog.create).toHaveBeenCalledTimes(1);
  });
});
