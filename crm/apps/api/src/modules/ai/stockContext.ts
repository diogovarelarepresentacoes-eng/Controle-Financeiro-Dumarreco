import { env } from "../../config/env";

const STOCK_TERMS = ["estoque", "disponivel", "disponibilidade", "tem", "pronta entrega"];

function extractProductCodes(text: string) {
  const matches = text.toUpperCase().match(/[A-Z]{2,}[ -]?\d{2,}/g) ?? [];
  return Array.from(new Set(matches.map((item) => item.replace(/\s+/g, ""))));
}

type ExternalProduct = {
  code: string;
  description: string;
  stockBalance: number | string;
  priceInstallment: number | string;
  isActive: boolean;
};

function toNumber(value: string | number) {
  return typeof value === "number" ? value : Number(value);
}

async function fetchStockByCodes(codes: string[]): Promise<ExternalProduct[]> {
  if (codes.length === 0) return [];
  const qs = encodeURIComponent(codes.join(","));
  const response = await fetch(`${env.FINANCE_API_URL}/api/products/stock/batch?codes=${qs}`);
  if (!response.ok) return [];
  const data = (await response.json()) as { items?: ExternalProduct[] };
  return data.items ?? [];
}

async function fetchSearchProducts(query: string): Promise<ExternalProduct[]> {
  const response = await fetch(`${env.FINANCE_API_URL}/api/products/search?q=${encodeURIComponent(query)}&limit=5`);
  if (!response.ok) return [];
  const data = (await response.json()) as { items?: ExternalProduct[] };
  return data.items ?? [];
}

export async function buildStockContext(userMessage: string) {
  const normalized = userMessage.toLowerCase();
  const stockIntent = STOCK_TERMS.some((term) => normalized.includes(term));
  if (!stockIntent) {
    return { stockIntent: false, consulted: false, found: false, sourceLines: [] as string[] };
  }

  const codes = extractProductCodes(userMessage);
  let found = await fetchStockByCodes(codes);

  if (found.length === 0) {
    found = await fetchSearchProducts(userMessage);
  }

  const sourceLines = found.map(
    (item) =>
      `stock:${item.code}|${item.description}|saldo=${toNumber(item.stockBalance).toFixed(3)}|preco=${toNumber(item.priceInstallment).toFixed(2)}|ativo=${item.isActive}`
  );

  return {
    stockIntent: true,
    consulted: true,
    found: found.length > 0,
    sourceLines
  };
}
