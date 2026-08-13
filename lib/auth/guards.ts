import { APIError } from "better-auth/api";
import { isEphemeralDatabase, PERSISTENCE_SETUP_HINT, type DatabaseEnv } from "@/lib/db/client";

export const EPHEMERAL_ACCOUNT_ERROR = `This deployment has no persistent database, so a new account would be lost as soon as another request is served. ${PERSISTENCE_SETUP_HINT}`;

/**
 * Accounts written to an ephemeral serverless database disappear on the next
 * request, which looks like "user not found" moments after creating a user.
 * Refuse the write instead so the cause is visible where the account is made.
 */
export function assertAccountsPersist(env: DatabaseEnv = process.env) {
  if (isEphemeralDatabase(env)) {
    throw new APIError("SERVICE_UNAVAILABLE", { message: EPHEMERAL_ACCOUNT_ERROR });
  }
}
