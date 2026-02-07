/**
 * Formata um número para exibição em input (formato BR: R$ 1.234,56).
 */
export function formatCurrencyForInput(value: number): string {
  if (value === 0 || isNaN(value)) return ''
  const fixed = value.toFixed(2)
  const [intPart, decPart] = fixed.split('.')
  const withDots = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  const formatted = decPart ? `${withDots},${decPart}` : withDots
  return `R$ ${formatted}`
}

/**
 * Converte string do input (R$ 1.234,56 ou 1.234,56) para número.
 */
export function parseCurrencyFromInput(str: string): number {
  if (!str || !str.trim()) return 0
  const cleaned = str
    .replace(/R\$\s?/g, '')
    .trim()
    .replace(/\./g, '')
    .replace(',', '.')
  return parseFloat(cleaned) || 0
}

/**
 * Aplica máscara de moeda enquanto o usuário digita.
 * Apenas dígitos são considerados; os dois últimos são sempre centavos.
 * Ex.: "1" → "R$ 0,01" | "123" → "R$ 1,23" | "12345" → "R$ 123,45"
 */
export function applyCurrencyMask(value: string): string {
  const texto = value.replace(/R\$/g, '').replace(/\./g, '').replace(/,/g, '').replace(/\s/g, '').replace(/\D/g, '')
  if (!texto) return ''

  try {
    if (texto.length <= 2) {
      const valor = parseInt(texto, 10) / 100
      return `R$ ${valor.toFixed(2).replace('.', ',')}`
    }
    const centavos = texto.slice(-2)
    const reais = texto.slice(0, -2)
    const reaisFormatado = parseInt(reais, 10).toLocaleString('pt-BR')
    return `R$ ${reaisFormatado},${centavos}`
  } catch {
    return ''
  }
}
