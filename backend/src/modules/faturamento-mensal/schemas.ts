import { z } from 'zod'

export const saveFaturamentoSchema = z.object({
  id: z.string().uuid().optional(),
  ano: z.number().int().min(2000).max(2100),
  mes: z.number().int().min(1).max(12),
  valorInventarioInicio: z.number().default(0),
  usarInventarioInicioManual: z.boolean().default(false),
  valorInventarioFim: z.number().default(0),
  usarInventarioFimManual: z.boolean().default(false),
  comprasDoMes: z.number().default(0),
  compraSemNota: z.number().default(0),
  acordos: z.number().default(0),
  mercadorias: z.number().default(0),
})
