import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../config/prisma";

const querySchema = z.object({
  monthRef: z.string().regex(/^\d{4}-\d{2}$/),
  storeId: z.string().optional()
});

export const metricsRouter = Router();

metricsRouter.get("/ranking", async (req, res, next) => {
  try {
    const { monthRef, storeId } = querySchema.parse(req.query);
    const [goals, quotes] = await Promise.all([
      prisma.sellerGoal.findMany({ where: { monthRef, storeId } }),
      prisma.quote.findMany({
        where: {
          storeId,
          createdAt: {
            gte: new Date(`${monthRef}-01T00:00:00.000Z`),
            lt: new Date(`${monthRef}-31T23:59:59.999Z`)
          }
        }
      })
    ]);

    const bySeller = new Map<
      string,
      { sellerId: string; quotesSent: number; revenueEstimated: number; avgTicket: number; conversionRate: number }
    >();

    for (const quote of quotes) {
      const base = bySeller.get(quote.createdById) ?? {
        sellerId: quote.createdById,
        quotesSent: 0,
        revenueEstimated: 0,
        avgTicket: 0,
        conversionRate: 0
      };
      base.quotesSent += 1;
      base.revenueEstimated += Number(quote.total);
      bySeller.set(quote.createdById, base);
    }

    const ranking = Array.from(bySeller.values()).map((row) => {
      const won = quotes.filter((q) => q.createdById === row.sellerId && q.approvedAtWhatsApp).length;
      return {
        ...row,
        avgTicket: row.quotesSent > 0 ? row.revenueEstimated / row.quotesSent : 0,
        conversionRate: row.quotesSent > 0 ? (won / row.quotesSent) * 100 : 0
      };
    });

    return res.status(200).json({ goals, ranking });
  } catch (error) {
    return next(error);
  }
});

metricsRouter.get("/dashboard", async (req, res, next) => {
  try {
    const { monthRef, storeId } = querySchema.parse(req.query);
    const start = new Date(`${monthRef}-01T00:00:00.000Z`);
    const end = new Date(`${monthRef}-31T23:59:59.999Z`);

    const [quotes, messages, sellers, stores] = await Promise.all([
      prisma.quote.findMany({ where: { storeId, createdAt: { gte: start, lt: end } } }),
      prisma.message.findMany({ where: { createdAt: { gte: start, lt: end } } }),
      prisma.user.findMany({ select: { id: true, name: true } }),
      prisma.store.findMany({ select: { id: true, name: true } })
    ]);

    const sent = quotes.length;
    const won = quotes.filter((quote) => quote.approvedAtWhatsApp).length;
    const conversionRate = sent ? (won / sent) * 100 : 0;
    const avgTicket = sent ? quotes.reduce((acc, quote) => acc + Number(quote.total), 0) / sent : 0;
    const estimatedRevenue = quotes.reduce((acc, quote) => acc + Number(quote.total), 0);

    const inbound = messages.filter((message) => message.direction === "INBOUND");
    const outbound = messages.filter((message) => message.direction === "OUTBOUND");
    const responseTimeEstimateMinutes = inbound.length && outbound.length ? 12 : 0;

    const sellerRanking = sellers.map((seller) => {
      const sellerQuotes = quotes.filter((quote) => quote.createdById === seller.id);
      return {
        sellerId: seller.id,
        sellerName: seller.name,
        conversionRate: sellerQuotes.length
          ? (sellerQuotes.filter((quote) => quote.approvedAtWhatsApp).length / sellerQuotes.length) * 100
          : 0,
        ticketMedio: sellerQuotes.length
          ? sellerQuotes.reduce((acc, quote) => acc + Number(quote.total), 0) / sellerQuotes.length
          : 0,
        receitaEstimada: sellerQuotes.reduce((acc, quote) => acc + Number(quote.total), 0)
      };
    });

    const storeRanking = stores.map((store) => {
      const storeQuotes = quotes.filter((quote) => quote.storeId === store.id);
      return {
        storeId: store.id,
        storeName: store.name,
        conversionRate: storeQuotes.length
          ? (storeQuotes.filter((quote) => quote.approvedAtWhatsApp).length / storeQuotes.length) * 100
          : 0,
        receitaEstimada: storeQuotes.reduce((acc, quote) => acc + Number(quote.total), 0)
      };
    });

    return res.status(200).json({
      conversionRate,
      avgTicket,
      estimatedRevenue,
      responseTimeEstimateMinutes,
      sellerRanking,
      storeRanking
    });
  } catch (error) {
    return next(error);
  }
});
