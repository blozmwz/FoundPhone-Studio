// ISO-like story timestamps sort without depending on the device timezone.
export function newestFirst<T extends { time: string }>(
  items: readonly T[],
): T[] {
  return [...items].sort((a, b) =>
    b.time.replace("T", " ").localeCompare(a.time.replace("T", " ")),
  );
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
