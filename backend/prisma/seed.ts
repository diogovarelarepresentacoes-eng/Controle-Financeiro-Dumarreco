import { prisma } from '../src/infra/prismaClient'

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
