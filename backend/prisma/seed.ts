import { prisma } from '../src/infra/prismaClient'

const TAXAS_PADRAO = [
  { tipoCartao: 'debito', parcelas: 1, taxaPercentual: 1.99 },
  { tipoCartao: 'credito', parcelas: 1, taxaPercentual: 2.99 },
  { tipoCartao: 'credito', parcelas: 2, taxaPercentual: 3.49 },
  { tipoCartao: 'credito', parcelas: 3, taxaPercentual: 3.99 },
  { tipoCartao: 'credito', parcelas: 4, taxaPercentual: 4.49 },
  { tipoCartao: 'credito', parcelas: 5, taxaPercentual: 4.99 },
  { tipoCartao: 'credito', parcelas: 6, taxaPercentual: 5.49 },
  { tipoCartao: 'credito', parcelas: 7, taxaPercentual: 5.99 },
  { tipoCartao: 'credito', parcelas: 8, taxaPercentual: 6.49 },
  { tipoCartao: 'credito', parcelas: 9, taxaPercentual: 6.99 },
  { tipoCartao: 'credito', parcelas: 10, taxaPercentual: 7.49 },
  { tipoCartao: 'credito', parcelas: 11, taxaPercentual: 7.99 },
  { tipoCartao: 'credito', parcelas: 12, taxaPercentual: 8.49 },
]

async function main() {
  // Seed idempotente: apenas upsert, sem exclusoes.
  await prisma.supplier.upsert({
    where: { cnpj: '00000000000000' },
    update: {
      legalName: 'Fornecedor Exemplo',
    },
    create: {
      id: crypto.randomUUID(),
      cnpj: '00000000000000',
      legalName: 'Fornecedor Exemplo',
    },
  })

  // Máquina de cartão padrão com taxas
  const maquinaPadraoId = '00000000-0000-0000-0000-000000000001'
  await prisma.maquinaCartao.upsert({
    where: { id: maquinaPadraoId },
    update: {},
    create: {
      id: maquinaPadraoId,
      nome: 'Stone',
      adquirente: 'Stone',
      descricao: 'Máquina padrão',
      ativo: true,
    },
  })

  for (const t of TAXAS_PADRAO) {
    await prisma.taxaMaquinaCartao.upsert({
      where: {
        maquinaCartaoId_tipoCartao_parcelas: {
          maquinaCartaoId: maquinaPadraoId,
          tipoCartao: t.tipoCartao,
          parcelas: t.parcelas,
        },
      },
      update: {
        taxaPercentual: t.taxaPercentual,
      },
      create: {
        id: crypto.randomUUID(),
        maquinaCartaoId: maquinaPadraoId,
        tipoCartao: t.tipoCartao,
        parcelas: t.parcelas,
        taxaPercentual: t.taxaPercentual,
        ativo: true,
      },
    })
  }
}

main()
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error(err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
