import express from "express";
import { studentsRouter } from "./routes/students";
import { classesRouter } from "./routes/classes";
import { attendanceRouter } from "./routes/attendance";
import { invoicesRouter } from "./routes/invoices";
import { notificationsRouter } from "./routes/notifications";
import { NotificationWorker } from "./workers/notificationWorker";

const app = express();
app.use(express.json());

app.get("/health", (_req, res) => res.json({ ok: true }));

app.use("/api/students", studentsRouter);
app.use("/api/classes", classesRouter);
app.use("/api/attendance", attendanceRouter);
app.use("/api/invoices", invoicesRouter);
app.use("/api/notifications", notificationsRouter);

const port = Number(process.env.PORT ?? 4000);
const worker = new NotificationWorker();

app.listen(port, () => {
  console.log(`api listening on :${port}`);
  if (process.env.DISABLE_NOTIFICATION_WORKER !== "true") {
    worker.start();
    console.log("notification worker started");
  }
});

process.on("SIGTERM", () => {
  worker.stop();
  process.exit(0);
});
