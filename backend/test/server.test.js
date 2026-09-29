import { expect, test } from "bun:test";
import { join } from "node:path";

test("server refuses to start without JWT_SECRET", async () => {
  const child = Bun.spawn(["bun", "run", "src/server.js"], {
    cwd: join(import.meta.dir, ".."),
    env: { ...process.env, JWT_SECRET: "" },
    stdout: "ignore",
    stderr: "pipe",
  });

  const exit = child.exited;
  const exitCode = await Promise.race([exit, Bun.sleep(1000).then(() => null)]);

  if (exitCode === null) {
    child.kill();
    await exit;
  }

  const stderr = await new Response(child.stderr).text();
  expect(stderr).toContain("JWT_SECRET is required");
  expect(exitCode).toBe(1);
});

test("server rejects a weak JWT_SECRET", async () => {
  const child = Bun.spawn(["bun", "run", "src/server.js"], {
    cwd: join(import.meta.dir, ".."),
    env: { ...process.env, JWT_SECRET: "weak" },
    stdout: "ignore",
    stderr: "pipe",
  });

  const exit = child.exited;
  const exitCode = await Promise.race([exit, Bun.sleep(1000).then(() => null)]);

  if (exitCode === null) {
    child.kill();
    await exit;
  }

  const stderr = await new Response(child.stderr).text();
  expect(stderr).toContain("JWT_SECRET must be at least 32 bytes");
  expect(exitCode).toBe(1);
});
