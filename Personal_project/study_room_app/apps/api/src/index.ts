import express from "express";
import { studentsRouter } from "./routes/students";
import { classesRouter } from "./routes/classes";
import { attendanceRouter } from "./routes/attendance";
import { invoicesRouter } from "./routes/invoices";
import { notificationsRouter } from "./routes/notifications";
import { dashboardRouter } from "./routes/dashboard";
import { parentRouter } from "./routes/parent";
import { onboardingRouter } from "./routes/onboarding";
import { settingsRouter } from "./routes/settings";
import { NotificationWorker } from "./workers/notificationWorker";

const app = express();
app.use(express.json());

app.get("/health", (_req, res) => res.json({ ok: true }));

app.use("/api/students", studentsRouter);
app.use("/api/classes", classesRouter);
app.use("/api/attendance", attendanceRouter);
app.use("/api/invoices", invoicesRouter);
app.use("/api/notifications", notificationsRouter);
app.use("/api/dashboard", dashboardRouter);
app.use("/p", parentRouter);
app.use("/api/onboarding", onboardingRouter);
app.use("/api/settings", settingsRouter);

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("unhandled route error:", err);
  if (res.headersSent) return;
  res.status(500).json({ error: "internal_error", message: err.message });
});

const port = Number(process.env.PORT ?? 4000);
const worker = new NotificationWorker();

app.listen(port, () => {
  console.log(`api listening on :${port}`);
  if (process.env.DISABLE_NOTIFICATION_WORKER !== "true") {
    worker.start();
    console.log("notification worker started");
  }
});

process.on("unhandledRejection", (reason) => {
  console.error("unhandledRejection:", reason);
});

process.on("SIGTERM", () => {
  worker.stop();
  process.exit(0);
});
