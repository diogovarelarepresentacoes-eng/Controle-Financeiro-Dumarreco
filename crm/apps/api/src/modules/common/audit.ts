import { prisma } from "../../config/prisma";
import { Prisma } from "@prisma/client";

type AuditInput = {
  userId?: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  beforeData?: unknown;
  afterData?: unknown;
};

export async function writeAuditLog(input: AuditInput): Promise<void> {
  await prisma.auditLog.create({
    data: {
      userId: input.userId ?? null,
      action: input.action,
      entity: input.entity,
      entityId: input.entityId ?? null,
      beforeData: input.beforeData as Prisma.InputJsonValue | undefined,
      afterData: input.afterData as Prisma.InputJsonValue | undefined
    }
  });
}
