import { expect, test } from "bun:test";
import { join } from "node:path";

const repoRoot = join(import.meta.dir, "..");
const frontendRoot = import.meta.dir;

test("vite dev proxy fallback port matches the backend default PORT", async () => {
  const envExample = await Bun.file(join(repoRoot, "backend", ".env.example")).text();
  const backendPort = envExample.match(/^PORT=(\d+)/m)?.[1];
  expect(backendPort).toBeDefined();

  const viteConfig = await Bun.file(join(frontendRoot, "vite.config.js")).text();
  const fallbackPort = viteConfig.match(/localhost:(\d+)/)?.[1];
  expect(fallbackPort).toBeDefined();

  // The proxy must reach the backend by default, otherwise every /api
  // request fails with ECONNREFUSED (no listener on the stale target port).
  expect(fallbackPort).toBe(backendPort);
});

test("vite dev proxy target can be overridden for non-default backend ports", async () => {
  const viteConfig = await Bun.file(join(frontendRoot, "vite.config.js")).text();

  expect(viteConfig).toContain("BACKEND_URL");
});
