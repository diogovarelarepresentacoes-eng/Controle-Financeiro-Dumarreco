"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
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
            role: client_1.RoleName.ATTENDANT
        }
    });
    const supervisor = await prisma.user.upsert({
        where: { email: "supervisor@dumarreco.local" },
        update: {},
        create: {
            name: "Supervisor Demo",
            email: "supervisor@dumarreco.local",
            passwordHash: "demo",
            role: client_1.RoleName.SUPERVISOR
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
        update: { name: "Cimento 50kg", unit: "UN" },
        create: { storeId: storeA.id, sku: "CIM-001", name: "Cimento 50kg", unit: "UN" }
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
}
main()
    .catch((error) => {
    console.error(error);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
