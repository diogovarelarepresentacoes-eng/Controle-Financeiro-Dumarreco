import { ProviderType } from "@prisma/client";
import { ProviderSendResult, WhatsAppProviderClient } from "./types";

function missing(config: Record<string, unknown>, fields: string[]) {
  return fields.filter((field) => !config[field]);
}

async function safeFetch(url: string, options?: RequestInit): Promise<Response> {
  return fetch(url, options);
}

class MetaProvider implements WhatsAppProviderClient {
  providerType = ProviderType.META_CLOUD_API;
  validateConfig(config: Record<string, unknown>) {
    const missingFields = missing(config, [
      "phone_number_id",
      "whatsapp_business_account_id",
      "access_token",
      "verify_token"
    ]);
    return { ok: missingFields.length === 0, message: missingFields.length ? "Campos faltando." : "Config valida.", missingFields };
  }
  async testConnection(config: Record<string, unknown>) {
    const validation = this.validateConfig(config);
    if (!validation.ok) return validation;
    try {
      const version = String(config.version ?? "v20.0");
      const phoneNumberId = String(config.phone_number_id);
      const token = String(config.access_token);
      const response = await safeFetch(`https://graph.facebook.com/${version}/${phoneNumberId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.ok
        ? { ok: true, message: "Conexao OK com Meta Cloud API." }
        : { ok: false, message: `Falha na Meta API (${response.status}).` };
    } catch {
      return { ok: false, message: "Falha de rede ao conectar na Meta API." };
    }
  }
  async sendMessage(config: Record<string, unknown>, to: string, text: string): Promise<ProviderSendResult> {
    try {
      const version = String(config.version ?? "v20.0");
      const phoneNumberId = String(config.phone_number_id);
      const token = String(config.access_token);
      const response = await safeFetch(`https://graph.facebook.com/${version}/${phoneNumberId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ messaging_product: "whatsapp", to, type: "text", text: { body: text } })
      });
      const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;
      return response.ok
        ? { status: "SENT", messageId: String((payload.messages as Array<{ id?: string }>)?.[0]?.id ?? "") }
        : { status: "FAILED", errorMessage: `Meta send failed (${response.status})` };
    } catch {
      return { status: "FAILED", errorMessage: "Erro de rede no envio Meta." };
    }
  }
}

class TwilioProvider implements WhatsAppProviderClient {
  providerType = ProviderType.TWILIO_WHATSAPP;
  validateConfig(config: Record<string, unknown>) {
    const missingFields = missing(config, ["account_sid", "auth_token", "from_number"]);
    return { ok: missingFields.length === 0, message: missingFields.length ? "Campos faltando." : "Config valida.", missingFields };
  }
  async testConnection(config: Record<string, unknown>) {
    const validation = this.validateConfig(config);
    if (!validation.ok) return validation;
    try {
      const sid = String(config.account_sid);
      const token = String(config.auth_token);
      const basic = Buffer.from(`${sid}:${token}`).toString("base64");
      const response = await safeFetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}.json`, {
        headers: { Authorization: `Basic ${basic}` }
      });
      return response.ok ? { ok: true, message: "Conexao OK com Twilio." } : { ok: false, message: "Credenciais Twilio invalidas." };
    } catch {
      return { ok: false, message: "Falha de rede ao conectar na Twilio." };
    }
  }
  async sendMessage(config: Record<string, unknown>, to: string, text: string): Promise<ProviderSendResult> {
    try {
      const sid = String(config.account_sid);
      const token = String(config.auth_token);
      const from = String(config.from_number);
      const basic = Buffer.from(`${sid}:${token}`).toString("base64");
      const body = new URLSearchParams({ To: `whatsapp:${to}`, From: `whatsapp:${from}`, Body: text });
      const response = await safeFetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
        method: "POST",
        headers: { Authorization: `Basic ${basic}`, "Content-Type": "application/x-www-form-urlencoded" },
        body
      });
      const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;
      return response.ok ? { status: "SENT", messageId: String(payload.sid ?? "") } : { status: "FAILED", errorMessage: "Twilio envio falhou." };
    } catch {
      return { status: "FAILED", errorMessage: "Erro de rede no envio Twilio." };
    }
  }
}

class ZenviaProvider implements WhatsAppProviderClient {
  providerType = ProviderType.ZENVIA_WHATSAPP;
  validateConfig(config: Record<string, unknown>) {
    const missingFields = missing(config, ["api_token", "channel_id"]);
    return { ok: missingFields.length === 0, message: missingFields.length ? "Campos faltando." : "Config valida.", missingFields };
  }
  async testConnection(config: Record<string, unknown>) {
    const validation = this.validateConfig(config);
    if (!validation.ok) return validation;
    return { ok: true, message: "Token Zenvia validado no formato (health simplificado)." };
  }
  async sendMessage(config: Record<string, unknown>, to: string, text: string): Promise<ProviderSendResult> {
    try {
      const response = await safeFetch("https://api.zenvia.com/v2/channels/whatsapp/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-TOKEN": String(config.api_token)
        },
        body: JSON.stringify({
          from: String(config.channel_id),
          to,
          contents: [{ type: "text", text }]
        })
      });
      const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;
      return response.ok ? { status: "SENT", messageId: String(payload.id ?? "") } : { status: "FAILED", errorMessage: "Zenvia envio falhou." };
    } catch {
      return { status: "FAILED", errorMessage: "Erro de rede no envio Zenvia." };
    }
  }
}

class DialogProvider implements WhatsAppProviderClient {
  providerType = ProviderType.DIALOG_360;
  validateConfig(config: Record<string, unknown>) {
    const missingFields = missing(config, ["api_key", "phone_number"]);
    return { ok: missingFields.length === 0, message: missingFields.length ? "Campos faltando." : "Config valida.", missingFields };
  }
  async testConnection(config: Record<string, unknown>) {
    const validation = this.validateConfig(config);
    if (!validation.ok) return validation;
    try {
      const response = await safeFetch("https://waba-v2.360dialog.io/v1/configs/application", {
        headers: { "D360-API-KEY": String(config.api_key) }
      });
      return response.ok ? { ok: true, message: "Conexao OK com 360dialog." } : { ok: false, message: "Falha na 360dialog." };
    } catch {
      return { ok: false, message: "Falha de rede ao conectar na 360dialog." };
    }
  }
  async sendMessage(config: Record<string, unknown>, to: string, text: string): Promise<ProviderSendResult> {
    try {
      const response = await safeFetch("https://waba-v2.360dialog.io/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json", "D360-API-KEY": String(config.api_key) },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to,
          type: "text",
          text: { body: text }
        })
      });
      const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;
      return response.ok
        ? { status: "SENT", messageId: String((payload.messages as Array<{ id?: string }>)?.[0]?.id ?? "") }
        : { status: "FAILED", errorMessage: "360dialog envio falhou." };
    } catch {
      return { status: "FAILED", errorMessage: "Erro de rede no envio 360dialog." };
    }
  }
}

class CustomProvider implements WhatsAppProviderClient {
  providerType = ProviderType.CUSTOM_WEBHOOK;
  validateConfig(config: Record<string, unknown>) {
    const missingFields = missing(config, ["inbound_webhook_secret", "outbound_endpoint_url"]);
    return { ok: missingFields.length === 0, message: missingFields.length ? "Campos faltando." : "Config valida.", missingFields };
  }
  async testConnection(config: Record<string, unknown>) {
    const validation = this.validateConfig(config);
    if (!validation.ok) return validation;
    try {
      const response = await safeFetch(String(config.outbound_endpoint_url), { method: "HEAD" });
      return response.ok ? { ok: true, message: "Conexao OK no endpoint custom." } : { ok: false, message: "Endpoint custom indisponivel." };
    } catch {
      return { ok: false, message: "Falha de rede no endpoint custom." };
    }
  }
  async sendMessage(config: Record<string, unknown>, to: string, text: string): Promise<ProviderSendResult> {
    try {
      const response = await safeFetch(String(config.outbound_endpoint_url), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to, text })
      });
      return response.ok ? { status: "QUEUED", messageId: `custom-${Date.now()}` } : { status: "FAILED", errorMessage: "Custom webhook envio falhou." };
    } catch {
      return { status: "FAILED", errorMessage: "Erro de rede no envio custom." };
    }
  }
}

export const providerClients = [
  new MetaProvider(),
  new TwilioProvider(),
  new ZenviaProvider(),
  new DialogProvider(),
  new CustomProvider()
];
