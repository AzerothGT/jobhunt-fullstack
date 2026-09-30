import { Buffer } from "node:buffer";
import app from "../src/app.js";

if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET is required");
}

if (Buffer.byteLength(process.env.JWT_SECRET, "utf8") < 32) {
  throw new Error("JWT_SECRET must be at least 32 bytes");
}

export default app;
