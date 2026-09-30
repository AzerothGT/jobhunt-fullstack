import cors from "cors";
import express from "express";
import { errorHandler, notFound } from "./middleware/errorHandler.js";
import authRoutes from "./routes/authRoutes.js";
import docsRoutes from "./routes/docsRoutes.js";
import healthRoutes from "./routes/healthRoutes.js";
import jobRoutes from "./routes/jobRoutes.js";

const app = express();

app.use(cors({ origin: process.env.FRONTEND_URL ?? true }));
app.use(express.json());

app.use("/api", docsRoutes);
app.use("/api/health", healthRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/jobs", jobRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;
