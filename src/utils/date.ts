import { format, isValid, parseISO } from 'date-fns'
import ptBR from 'date-fns/locale/pt-BR'

/**
 * Parse de data "date-only" (YYYY-MM-DD) em fuso local.
 * Evita o bug de `new Date('YYYY-MM-DD')` que pode deslocar o dia por tratar como UTC.
 */
export function parseDateOnly(isoDate: string): Date {
  const d = parseISO(isoDate)
  return isValid(d) ? d : new Date(NaN)
}

export function formatDateBR(isoDate?: string | null): string {
  if (!isoDate) return '-'
  const d = parseDateOnly(isoDate)
  if (!isValid(d)) return '-'
  return format(d, 'dd/MM/yyyy', { locale: ptBR })
}

