import { prisma } from "../../config/prisma";

const storeCursor = new Map<string, number>();

export async function assignRoundRobin(storeId: string): Promise<string | null> {
  const users = await prisma.user.findMany({
    where: { userStores: { some: { storeId } } },
    orderBy: { createdAt: "asc" }
  });

  if (!users.length) return null;
  const current = storeCursor.get(storeId) ?? 0;
  const selected = users[current % users.length];
  storeCursor.set(storeId, current + 1);
  return selected.id;
}
