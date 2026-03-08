import { env } from "./config/env";
import { createApp } from "./app";
import { runQuoteRecoveryJob } from "./modules/automation/quoteRecovery";
import { runReceivableReminderJob } from "./modules/finance/reminders";
import { updateCustomerScoresDaily } from "./modules/scoring/service";

const app = createApp();

app.listen(env.API_PORT, () => {
  console.log(`CRM API listening on ${env.API_PORT}`);
});

setInterval(() => {
  runReceivableReminderJob().catch((error) => {
    console.error("Reminder job failed", error);
  });
}, env.REMINDER_JOB_INTERVAL_MINUTES * 60 * 1000);

setInterval(() => {
  updateCustomerScoresDaily().catch((error) => {
    console.error("Customer score job failed", error);
  });
}, env.CUSTOMER_SCORE_JOB_INTERVAL_HOURS * 60 * 60 * 1000);

setInterval(() => {
  runQuoteRecoveryJob().catch((error) => {
    console.error("Quote recovery job failed", error);
  });
}, env.QUOTE_RECOVERY_JOB_INTERVAL_MINUTES * 60 * 1000);
