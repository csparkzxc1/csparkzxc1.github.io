import express from "express";
import { studentsRouter } from "./routes/students";
import { classesRouter } from "./routes/classes";
import { attendanceRouter } from "./routes/attendance";
import { invoicesRouter } from "./routes/invoices";

const app = express();
app.use(express.json());

app.get("/health", (_req, res) => res.json({ ok: true }));

app.use("/api/students", studentsRouter);
app.use("/api/classes", classesRouter);
app.use("/api/attendance", attendanceRouter);
app.use("/api/invoices", invoicesRouter);

const port = Number(process.env.PORT ?? 4000);
app.listen(port, () => {
  console.log(`api listening on :${port}`);
});
