import { auth } from "@/lib/auth/auth";
import { toNextJsHandler } from "better-auth/next-js";
import { readyDb } from "@/lib/db/client";

const handlers = toNextJsHandler(auth);

async function withDb(request: Request, method: keyof typeof handlers) {
  await readyDb();
  return handlers[method](request);
}

export const GET = (request: Request) => withDb(request, "GET");
export const POST = (request: Request) => withDb(request, "POST");
