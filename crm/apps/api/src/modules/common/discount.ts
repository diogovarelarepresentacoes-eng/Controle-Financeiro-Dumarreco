import { RoleName } from "@prisma/client";

export function getDiscountLimit(role: RoleName): number {
  if (role === RoleName.ATTENDANT) return 3;
  if (role === RoleName.SUPERVISOR) return 8;
  return 100;
}
