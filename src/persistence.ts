import Dexie, { type Table } from "dexie";
import type { Work, Runtime } from "./schema";
import { sha256 } from "./browserCrypto";
class Database extends Dexie {
  works!: Table<Work, string>;
  saves!: Table<
    {
      id: string;
      state: Runtime;
      playerName?: string;
      sourceRevision?: number;
      targetRevision?: number;
      createdAt?: string;
      backupKey?: string;
    },
    string
  >;
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

export async function preserveMigrationBackup(
  id: string,
  state: Runtime,
  targetRevision: number,
  playerName: string,
) {
  const raw = JSON.stringify(state);
  const hash = await sha256(new TextEncoder().encode(raw));
  const key = `${id}:before-migration:${state.revision}:${targetRevision}:${hash}`;
  await db.transaction("rw", db.saves, async () => {
    let backup = await db.saves.get(key);
    if (!backup) {
      backup = {
        id: key,
        state,
        playerName,
        sourceRevision: state.revision,
        targetRevision,
        createdAt: new Date().toISOString(),
      };
      await db.saves.add(backup);
    }
    await db.saves.put({
      ...backup,
      id: id + ":before-migration",
      backupKey: key,
    });
  });
}
export async function commitMigratedRuntime(
  id: string,
  before: Runtime,
  after: Runtime,
) {
  await pendingWrites.get(id);
  const expected = JSON.stringify(before),
    key = "foundphone-pending:" + id;
  await db.transaction("rw", db.saves, async () => {
    const stored = await db.saves.get(id);
    let journal: string | null = null;
    try {
      journal = localStorage.getItem(key);
    } catch {
      /* committed row remains authoritative */
    }
    const latest = journal || (stored ? JSON.stringify(stored.state) : "");
    if (latest !== expected)
      throw Error("其他页面的进度已变化，原存档已保留，请刷新后继续。");
    // Do not place a migrated journal before this transaction commits. A failed
    // write must leave both the old DB row and its old synchronous journal intact.
    await db.saves.put({ id, state: after });
  });
  try {
    if (localStorage.getItem(key) === expected) localStorage.removeItem(key);
  } catch {
    /* DB committed */
  }
}
export function readMigrationBackup(id: string) {
  return db.saves.get(id + ":before-migration");
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
