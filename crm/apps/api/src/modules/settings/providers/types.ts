import { ProviderType } from "@prisma/client";

export type ProviderValidationResult = {
  ok: boolean;
  message: string;
  missingFields?: string[];
};

export type ProviderSendResult = {
  status: "QUEUED" | "SENT" | "FAILED";
  messageId?: string;
  errorMessage?: string;
};

export interface WhatsAppProviderClient {
  providerType: ProviderType;
  validateConfig(config: Record<string, unknown>): ProviderValidationResult;
  testConnection(config: Record<string, unknown>): Promise<ProviderValidationResult>;
  sendMessage(config: Record<string, unknown>, to: string, text: string): Promise<ProviderSendResult>;
}
