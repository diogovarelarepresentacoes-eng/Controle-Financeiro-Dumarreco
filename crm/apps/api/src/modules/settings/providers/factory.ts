import { ProviderType } from "@prisma/client";
import { providerClients } from "./clients";
import { WhatsAppProviderClient } from "./types";

export function getProviderClient(providerType: ProviderType): WhatsAppProviderClient {
  const client = providerClients.find((item) => item.providerType === providerType);
  if (!client) throw new Error("Provedor nao suportado.");
  return client;
}
