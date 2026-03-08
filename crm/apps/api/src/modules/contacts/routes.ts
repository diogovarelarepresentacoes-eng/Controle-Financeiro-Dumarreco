import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../config/prisma";

const upsertContactSchema = z.object({
  storeCode: z.string().min(1),
  phone: z.string().min(6),
  name: z.string().min(2),
  cpfCnpj: z.string().optional(),
  notes: z.string().optional(),
  address: z
    .object({
      label: z.string().min(1).default("Principal"),
      street: z.string().min(2),
      number: z.string().optional(),
      neighborhood: z.string().optional(),
      city: z.string().min(2),
      state: z.string().min(2).max(2),
      zipCode: z.string().optional()
    })
    .optional()
});

export const contactsRouter = Router();

contactsRouter.post("/", async (req, res, next) => {
  try {
    const input = upsertContactSchema.parse(req.body);
    const store = await prisma.store.findUnique({ where: { code: input.storeCode } });
    if (!store) throw new Error("Filial nao encontrada");

    const contactId = `contact-${store.id}-${input.phone}`;
    const contact = await prisma.contact.upsert({
      where: { id: contactId },
      update: {
        name: input.name,
        phone: input.phone,
        cpfCnpj: input.cpfCnpj ?? null,
        notes: input.notes ?? null
      },
      create: {
        id: contactId,
        storeId: store.id,
        name: input.name,
        phone: input.phone,
        cpfCnpj: input.cpfCnpj ?? null,
        notes: input.notes ?? null
      }
    });

    let address = null;
    if (input.address) {
      const existing = await prisma.address.findFirst({
        where: { contactId: contact.id, label: input.address.label }
      });

      address = existing
        ? await prisma.address.update({
            where: { id: existing.id },
            data: {
              street: input.address.street,
              number: input.address.number ?? null,
              neighborhood: input.address.neighborhood ?? null,
              city: input.address.city,
              state: input.address.state.toUpperCase(),
              zipCode: input.address.zipCode ?? null
            }
          })
        : await prisma.address.create({
            data: {
              contactId: contact.id,
              label: input.address.label,
              street: input.address.street,
              number: input.address.number ?? null,
              neighborhood: input.address.neighborhood ?? null,
              city: input.address.city,
              state: input.address.state.toUpperCase(),
              zipCode: input.address.zipCode ?? null
            }
          });
    }

    return res.status(200).json({ contact, address });
  } catch (error) {
    return next(error);
  }
});
