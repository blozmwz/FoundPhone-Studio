// ISO-like story timestamps sort without depending on the device timezone.
export function newestFirst<
  T extends { time: string; meta?: Record<string, string> },
>(items: readonly T[]): T[] {
  return [...items].sort((a, b) => {
    const date = b.time
      .replace("T", " ")
      .localeCompare(a.time.replace("T", " "));
    if (date) return date;
    // Sequential posts can share a displayed minute. Explicit authored order
    // resolves that tie; ordinary records all retain their stable zero order.
    return (
      Number(b.meta?.timelineOrder || 0) - Number(a.meta?.timelineOrder || 0)
    );
  });
}
export function storedThread(value: string) {
  try {
    const parsed = JSON.parse(value);
    if (typeof parsed.body === "string" && typeof parsed.time === "string")
      return { body: parsed.body as string, time: parsed.time as string };
  } catch {
    /* Older local posts had no timestamp. Preserve their text. */
  }
  return { body: value, time: "" };
}
