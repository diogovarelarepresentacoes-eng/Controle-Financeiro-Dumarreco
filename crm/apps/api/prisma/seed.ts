import { AiMode, PrismaClient, ProductUnit, RoleName } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const storeA = await prisma.store.upsert({
    where: { code: "MATRIZ" },
    update: {},
    create: { name: "Dumarreco Matriz", code: "MATRIZ" }
  });

  const storeB = await prisma.store.upsert({
    where: { code: "FILIAL-01" },
    update: {},
    create: { name: "Dumarreco Filial 01", code: "FILIAL-01" }
  });

  const attendant = await prisma.user.upsert({
    where: { email: "atendente@dumarreco.local" },
    update: {},
    create: {
      name: "Atendente Demo",
      email: "atendente@dumarreco.local",
      passwordHash: "demo",
      role: RoleName.ATTENDANT
    }
  });

  const supervisor = await prisma.user.upsert({
    where: { email: "supervisor@dumarreco.local" },
    update: {},
    create: {
      name: "Supervisor Demo",
      email: "supervisor@dumarreco.local",
      passwordHash: "demo",
      role: RoleName.SUPERVISOR
    }
  });

  await prisma.userStore.upsert({
    where: { userId_storeId: { userId: attendant.id, storeId: storeA.id } },
    update: {},
    create: { userId: attendant.id, storeId: storeA.id }
  });

  await prisma.userStore.upsert({
    where: { userId_storeId: { userId: supervisor.id, storeId: storeA.id } },
    update: {},
    create: { userId: supervisor.id, storeId: storeA.id }
  });

  await prisma.userStore.upsert({
    where: { userId_storeId: { userId: supervisor.id, storeId: storeB.id } },
    update: {},
    create: { userId: supervisor.id, storeId: storeB.id }
  });

  const stages = [
    "NOVO LEAD",
    "ORCAMENTO EM MONTAGEM",
    "ORCAMENTO ENVIADO",
    "NEGOCIACAO",
    "FECHADO - GANHO",
    "FECHADO - PERDIDO"
  ];

  for (let i = 0; i < stages.length; i += 1) {
    const name = stages[i];
    await prisma.pipelineStage.upsert({
      where: { id: `seed-stage-${i}` },
      update: { name, orderIndex: i },
      create: {
        id: `seed-stage-${i}`,
        name,
        orderIndex: i,
        isClosedWon: name === "FECHADO - GANHO",
        isClosedLost: name === "FECHADO - PERDIDO"
      }
    });
  }

  const product = await prisma.product.upsert({
    where: { storeId_sku: { storeId: storeA.id, sku: "CIM-001" } },
    update: { name: "Cimento 50kg", unit: ProductUnit.SACO },
    create: { storeId: storeA.id, sku: "CIM-001", name: "Cimento 50kg", unit: ProductUnit.SACO }
  });

  await prisma.productPrice.upsert({
    where: { productId_storeId: { productId: product.id, storeId: storeA.id } },
    update: { price: "39.90" },
    create: { productId: product.id, storeId: storeA.id, price: "39.90" }
  });

  await prisma.productStockByStore.upsert({
    where: { productId_storeId: { productId: product.id, storeId: storeA.id } },
    update: { quantity: "85.000" },
    create: { productId: product.id, storeId: storeA.id, quantity: "85.000" }
  });

  const product2 = await prisma.product.upsert({
    where: { storeId_sku: { storeId: storeA.id, sku: "ARG-020" } },
    update: { name: "Argamassa AC2 20kg", unit: ProductUnit.SACO, isActive: true },
    create: { storeId: storeA.id, sku: "ARG-020", name: "Argamassa AC2 20kg", unit: ProductUnit.SACO, isActive: true }
  });

  await prisma.productPrice.upsert({
    where: { productId_storeId: { productId: product2.id, storeId: storeA.id } },
    update: { price: "24.50" },
    create: { productId: product2.id, storeId: storeA.id, price: "24.50" }
  });

  await prisma.productStockByStore.upsert({
    where: { productId_storeId: { productId: product2.id, storeId: storeA.id } },
    update: { quantity: "42.000" },
    create: { productId: product2.id, storeId: storeA.id, quantity: "42.000" }
  });

  await prisma.priceRule.createMany({
    data: [
      { storeId: storeA.id, role: RoleName.ATTENDANT, maxDiscount: "3.00" },
      { storeId: storeA.id, role: RoleName.SUPERVISOR, maxDiscount: "8.00" }
    ],
    skipDuplicates: true
  });

  const contact = await prisma.contact.upsert({
    where: { id: `contact-${storeA.id}-+5588999999999` },
    update: { name: "Cliente Base CRM" },
    create: {
      id: `contact-${storeA.id}-+5588999999999`,
      storeId: storeA.id,
      name: "Cliente Base CRM",
      phone: "+5588999999999"
    }
  });

  const existingWorksite = await prisma.worksite.findFirst({
    where: { contactId: contact.id, name: "Obra Vila Nova" }
  });
  if (!existingWorksite) {
    await prisma.worksite.create({
      data: {
        contactId: contact.id,
        name: "Obra Vila Nova",
        address: "Rua das Flores, 100",
        type: "Residencial",
        stage: "Estrutura",
        recurringMaterials: ["cimento", "areia", "brita"],
        estimatedDurationDays: 120
      }
    });
  }

  const aiSetting = await prisma.aiSetting.findFirst();
  if (!aiSetting) {
    await prisma.aiSetting.create({
      data: {
        modeDefault: AiMode.ASSISTIDO,
        confidenceThreshold: "0.80",
        businessRulesPrompt: [
          "## NAO INVENTAR",
          "- Nunca invente preco, estoque, prazo, frete, desconto, garantia ou fiscal.",
          "- Se nao houver fonte interna, responda que precisa confirmar com atendente.",
          "",
          "## Revisao humana obrigatoria",
          "- Qualquer tema comercial sensivel exige aprovacao humana.",
          "",
          "## Se nao souber",
          "- Pergunte ou peca confirmacao."
        ].join("\n")
      }
    });
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
