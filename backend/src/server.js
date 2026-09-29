import { Buffer } from "node:buffer";

if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET is required");
}

if (Buffer.byteLength(process.env.JWT_SECRET, "utf8") < 32) {
  throw new Error("JWT_SECRET must be at least 32 bytes");
}

const { default: app } = await import("./app.js");
const port = Number(process.env.PORT || 3000);
app.listen(port, () => console.log(`API listening on port ${port}`));
