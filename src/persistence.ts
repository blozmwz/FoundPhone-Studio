import Dexie, { type Table } from "dexie";
import type { Work, Runtime } from "./schema";
class Database extends Dexie {
  works!: Table<Work, string>;
  saves!: Table<{ id: string; state: Runtime }, string>;
  constructor() {
    super("foundphone-studio");
    this.version(1).stores({ works: "id,updatedAt", saves: "id" });
  }
}
export const db = new Database();

// A short-lived synchronous journal covers a refresh between a click and the
// IndexedDB transaction committing. Successful commits remove only their version.
export async function persistRuntime(id: string, state: Runtime) {
  if (replacingSaves.has(id)) return;
  const key = "foundphone-pending:" + id;
  const text = JSON.stringify(state);
  try {
    localStorage.setItem(key, text);
  } catch {
    /* IndexedDB remains the main store. */
  }
  const writing = db.saves.put({ id, state });
  pendingWrites.set(id, writing);
  await writing;
  try {
    if (localStorage.getItem(key) === text) localStorage.removeItem(key);
  } catch {
    /* Storage may be unavailable. */
  }
}
export async function readSavedRuntime(id: string) {
  try {
    const pending = localStorage.getItem("foundphone-pending:" + id);
    if (pending) return { id, state: JSON.parse(pending) as Runtime };
  } catch {
    /* Fall back to committed data. */
  }
  return db.saves.get(id);
}

const replacingSaves = new Set<string>();
const pendingWrites = new Map<string, Promise<unknown>>();
export async function replaceRuntime(
  id: string,
  current: Runtime,
  next: Runtime,
) {
  replacingSaves.add(id);
  try {
    await pendingWrites.get(id);
    await db.transaction("rw", db.saves, async () => {
      await db.saves.put({ id: id + ":before-import", state: current });
      await db.saves.put({ id, state: next });
    });
    try {
      localStorage.removeItem("foundphone-pending:" + id);
    } catch {
      /* DB already committed. */
    }
  } finally {
    replacingSaves.delete(id);
  }
}
