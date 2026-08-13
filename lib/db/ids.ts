import { randomBytes, randomUUID } from "node:crypto";

export function createId() {
  return randomUUID();
}

export function createToken() {
  return randomBytes(24).toString("hex");
}

export function nowIso() {
  return new Date().toISOString();
}
