import { randomUUID } from "crypto";

export function generateUUID() {
  return randomUUID().replace(/-/g, "");
}
