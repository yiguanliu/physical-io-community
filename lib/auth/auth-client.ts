"use client";

import { dashClient, sentinelClient } from "@better-auth/infra/client";
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  plugins: [
    dashClient(),
    sentinelClient({
      autoSolveChallenge: true,
    }),
  ],
});
