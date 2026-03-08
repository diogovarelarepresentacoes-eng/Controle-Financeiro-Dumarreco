import cors from "cors";
import express from "express";
import { aiRouter } from "./modules/ai/routes";
import { kanbanRouter } from "./modules/common/kanbanRoutes";
import { metricsRouter } from "./modules/common/metricsRoutes";
import { contactsRouter } from "./modules/contacts/routes";
import { copilotRouter } from "./modules/copilot/routes";
import { financeRouter } from "./modules/finance/routes";
import { quotesRouter } from "./modules/quotes/routes";
import { scoringRouter } from "./modules/scoring/routes";
import { settingsRouter } from "./modules/settings/routes";
import { settingsWebhookRouter } from "./modules/settings/webhookRoutes";
import { inboxRouter } from "./modules/whatsapp/inboxRoutes";
import { whatsappRouter } from "./modules/whatsapp/routes";
import { worksitesRouter } from "./modules/worksites/routes";

export function createApp() {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: "2mb" }));

  app.get("/health", (_req, res) => {
    res.status(200).json({ ok: true });
  });

  app.use("/api/whatsapp", whatsappRouter);
  app.use("/api/inbox", inboxRouter);
  app.use("/api/quotes", quotesRouter);
  app.use("/api/finance", financeRouter);
  app.use("/api/copilot", copilotRouter);
  app.use("/api/scoring", scoringRouter);
  app.use("/api/worksites", worksitesRouter);
  app.use("/api/settings", settingsRouter);
  app.use("/api/webhooks", settingsWebhookRouter);
  app.use("/api/kanban", kanbanRouter);
  app.use("/api/metrics", metricsRouter);
  app.use("/api/ai", aiRouter);
  app.use("/api/contacts", contactsRouter);

  app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    if (error instanceof Error) {
      return res.status(400).json({ message: error.message });
    }
    return res.status(500).json({ message: "Erro interno." });
  });

  return app;
}
