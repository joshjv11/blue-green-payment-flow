import "dotenv/config";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import { invoiceExtractionRouter } from "./api/invoiceExtractionRouter.ts";
import { matchingRouter } from "./api/matchingRouter.ts";
import { dodoRouter } from "./api/dodoRouter.ts";
import { razorpayRouter } from "./api/razorpayRouter.ts";

const app = express();

app.use(helmet());
app.use(express.json({ limit: "10mb" }));
app.use(morgan("combined"));

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", ts: new Date().toISOString() });
});

app.use("/api/invoices", invoiceExtractionRouter);
app.use("/api/matches", matchingRouter);
app.use("/api/dodo", dodoRouter);
app.use("/api/razorpay", razorpayRouter);

app.use(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  (error: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error("[OCR][API]", error);
    res.status(500).json({
      error: "Internal server error",
    });
  },
);

const port = Number.parseInt(process.env.PORT ?? "4000", 10);

app.listen(port, () => {
  console.log(`[OCR][API] listening on port ${port}`);
});

