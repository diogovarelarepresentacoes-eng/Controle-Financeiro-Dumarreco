import { addMonths, format } from 'date-fns'
import { prisma } from '../../infra/prismaClient'
import { parseNFeXml } from './nfeParser'

function ymFromDate(date: Date): string {
  return format(date, 'yyyy-MM')
}

async function upsertSupplier(tx: any, legalName: string, cnpj?: string) {
  if (cnpj) {
    const existing = await tx.supplier.findUnique({ where: { cnpj } })
    if (existing) {
      return tx.supplier.update({
        where: { id: existing.id },
        data: { legalName },
      })
    }
  }
  return tx.supplier.create({
    data: {
      id: crypto.randomUUID(),
      legalName,
      cnpj,
    },
  })
}

async function logImport(tx: any, args: {
  performedBy: string
  success: boolean
  message: string
  nfeAccessKey?: string
  purchaseId?: string
}) {
  await tx.xmlImportLog.create({
    data: {
      id: crypto.randomUUID(),
      performedBy: args.performedBy,
      success: args.success,
      message: args.message,
      nfeAccessKey: args.nfeAccessKey,
      purchaseId: args.purchaseId,
    },
  })
}

export const purchasesService = {
  async createPurchaseManual(input: {
    supplierName: string
    supplierCnpj?: string
    issueDate: string
    description?: string
    notes?: string
    totalAmount: number
    category?: string
    costCenter?: string
    items?: Array<{ description: string; ncm?: string; quantity: number; unitAmount: number; totalAmount: number }>
  }) {
    return prisma.$transaction(async (tx: any) => {
      const supplier = await upsertSupplier(tx, input.supplierName, input.supplierCnpj)
      const issueDate = new Date(`${input.issueDate}T00:00:00`)
      const purchase = await tx.purchase.create({
        data: {
          id: crypto.randomUUID(),
          supplierId: supplier.id,
          issueDate,
          competenceMonth: ymFromDate(issueDate),
          description: input.description,
          notes: input.notes,
          totalAmount: input.totalAmount.toFixed(2),
          category: input.category,
          costCenter: input.costCenter,
          hasInvoice: false,
          source: 'manual',
        },
      })

      if (input.items?.length) {
        await tx.purchaseItem.createMany({
          data: input.items.map((item) => ({
            id: crypto.randomUUID(),
            purchaseId: purchase.id,
            description: item.description,
            ncm: item.ncm,
            quantity: item.quantity.toFixed(4),
            unitAmount: item.unitAmount.toFixed(4),
            totalAmount: item.totalAmount.toFixed(2),
          })),
        })
      }

      return purchase
    })
  },

  async importNFeXmlToPurchase(xmlRaw: string, performedBy: string) {
    const parsed = parseNFeXml(xmlRaw)
    return prisma.$transaction(async (tx: any) => {
      try {
        if (parsed.accessKey) {
          const dup = await tx.purchase.findUnique({ where: { nfeAccessKey: parsed.accessKey } })
          if (dup) {
            throw new Error(`NFe ja importada para a chave ${parsed.accessKey}.`)
          }
        }

        const supplier = await upsertSupplier(tx, parsed.issuerName, parsed.issuerCnpj)
        const issueDate = new Date(`${parsed.issueDate}T00:00:00`)
        const purchase = await tx.purchase.create({
          data: {
            id: crypto.randomUUID(),
            supplierId: supplier.id,
            issueDate,
            competenceMonth: ymFromDate(issueDate),
            description: `Compra NFe ${parsed.number ?? ''}`.trim(),
            notes: 'Importacao via XML NF-e',
            totalAmount: parsed.totalInvoice.toFixed(2),
            hasInvoice: true,
            source: 'xml_nfe',
            nfeAccessKey: parsed.accessKey,
            nfeNumber: parsed.number,
            nfeSeries: parsed.series,
            nfeNatureOperation: parsed.natureOperation,
            recipientName: parsed.recipientName,
            recipientCnpj: parsed.recipientCnpj,
            totalProducts: parsed.totalProducts.toFixed(2),
            totalInvoice: parsed.totalInvoice.toFixed(2),
            totalTaxes: parsed.totalTaxes ? parsed.totalTaxes.toFixed(2) : undefined,
          },
        })

        if (parsed.items.length > 0) {
          await tx.purchaseItem.createMany({
            data: parsed.items.map((item: any) => ({
              id: crypto.randomUUID(),
              purchaseId: purchase.id,
              description: item.description,
              ncm: item.ncm,
              quantity: item.quantity.toFixed(4),
              unitAmount: item.unitAmount.toFixed(4),
              totalAmount: item.totalAmount.toFixed(2),
            })),
          })
        }

        await tx.purchaseDocument.create({
          data: {
            id: crypto.randomUUID(),
            purchaseId: purchase.id,
            documentType: 'xml_nfe',
            fileName: `nfe-${parsed.number ?? 'sem-numero'}.xml`,
            fileContent: xmlRaw,
            nfeAccessKey: parsed.accessKey,
          },
        })

        if (parsed.duplicates.length > 0) {
          await tx.payable.createMany({
            data: parsed.duplicates.map((dup: any) => ({
              id: crypto.randomUUID(),
              purchaseId: purchase.id,
              description: `Compra NF ${parsed.number ?? ''}${dup.number ? ` - dup ${dup.number}` : ''}`.trim(),
              dueDate: new Date(`${dup.dueDate}T00:00:00`),
              amount: dup.amount.toFixed(2),
              status: 'pending',
              supplierName: parsed.issuerName,
            })),
          })
        }

        await logImport(tx, {
          performedBy,
          success: true,
          message: 'Importacao XML concluida.',
          nfeAccessKey: parsed.accessKey,
          purchaseId: purchase.id,
        })

        return purchase
      } catch (error) {
        await logImport(tx, {
          performedBy,
          success: false,
          message: error instanceof Error ? error.message : 'Falha de importacao.',
          nfeAccessKey: parsed.accessKey,
        })
        throw error
      }
    })
  },

  async generatePayablesFromPurchase(input: {
    purchaseId: string
    totalAmount: number
    installments: number
    firstDueDate: string
    descriptionBase?: string
  }) {
    return prisma.$transaction(async (tx: any) => {
      const purchase = await tx.purchase.findUnique({
        where: { id: input.purchaseId },
        include: { supplier: true },
      })
      if (!purchase || purchase.deletedAt) throw new Error('Compra nao encontrada.')

      const amountPerInstallment = input.totalAmount / input.installments
      const base = new Date(`${input.firstDueDate}T00:00:00`)
      const created = []
      for (let idx = 0; idx < input.installments; idx++) {
        const dueDate = addMonths(base, idx)
        const payable = await tx.payable.create({
          data: {
            id: crypto.randomUUID(),
            purchaseId: purchase.id,
            description: `${input.descriptionBase ?? purchase.description ?? 'Compra'} (${idx + 1}/${input.installments})`,
            dueDate,
            amount: amountPerInstallment.toFixed(2),
            status: 'pending',
            supplierName: purchase.supplier.legalName,
          },
        })
        created.push(payable)
      }
      return created
    })
  },

  async listPurchases(filters: {
    competenceMonth?: string
    supplier?: string
    withInvoice?: 'all' | 'yes' | 'no'
    paymentStatus?: 'all' | 'without_payables' | 'pending' | 'paid'
  }) {
    const rows = await prisma.purchase.findMany({
      where: {
        deletedAt: null,
        competenceMonth: filters.competenceMonth || undefined,
        supplier: filters.supplier
          ? { legalName: { contains: filters.supplier, mode: 'insensitive' } }
          : undefined,
        hasInvoice:
          filters.withInvoice === 'yes'
            ? true
            : filters.withInvoice === 'no'
              ? false
              : undefined,
      },
      include: {
        supplier: true,
        items: true,
        documents: true,
        payables: true,
      },
      orderBy: [{ issueDate: 'desc' }, { createdAt: 'desc' }],
    })

    const filtered = rows.filter((row: any) => {
      if (!filters.paymentStatus || filters.paymentStatus === 'all') return true
      if (filters.paymentStatus === 'without_payables') return row.payables.length === 0
      if (filters.paymentStatus === 'pending') return row.payables.some((p: any) => p.status !== 'paid')
      if (filters.paymentStatus === 'paid') return row.payables.length > 0 && row.payables.every((p: any) => p.status === 'paid')
      return true
    })

    return filtered
  },

  async getPurchaseById(purchaseId: string) {
    return prisma.purchase.findFirst({
      where: { id: purchaseId, deletedAt: null },
      include: {
        supplier: true,
        items: true,
        documents: true,
        payables: true,
      },
    })
  },

  async deletePurchase(purchaseId: string) {
    return prisma.$transaction(async (tx: any) => {
      const purchase = await tx.purchase.findUnique({
        where: { id: purchaseId },
        include: { payables: true },
      })
      if (!purchase || purchase.deletedAt) return
      if (purchase.payables.some((p: any) => p.status === 'paid')) {
        throw new Error('Compra possui contas pagas. Exclusao bloqueada.')
      }
      await tx.purchase.update({
        where: { id: purchaseId },
        data: { deletedAt: new Date() },
      })
    })
  },
}
