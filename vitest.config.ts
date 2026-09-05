import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    exclude: ["**/*.integration.test.ts", "lib/admin/contracts.test.ts", "lib/email/webhook.test.ts"],
    include: ["lib/**/*.test.ts", "components/**/*.test.ts"],
  },
});
