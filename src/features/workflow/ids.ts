/** ID pendek. Memakai crypto.randomUUID bila tersedia (tidak tersedia di konteks non-HTTPS). */
export function newId(prefix: string): string {
  const c = globalThis.crypto;
  const rand =
    typeof c?.randomUUID === "function"
      ? c.randomUUID().replace(/-/g, "").slice(0, 8)
      : Math.random().toString(36).slice(2, 10).padEnd(8, "0");
  return `${prefix}-${rand}`;
}
