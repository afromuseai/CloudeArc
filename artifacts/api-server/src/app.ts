import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

app.use("/api", router);

// Catch-all error handler — logs the actual error so we can diagnose
app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
  logger.error({ err: err?.message, stack: err?.stack, type: err?.type, status: err?.status }, "Unhandled error");
  const status = err?.status ?? err?.statusCode ?? 500;
  res.status(status).json({ error: err?.message ?? "Internal server error" });
});

export default app;
