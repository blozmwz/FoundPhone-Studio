import type { Runtime, Work } from "../schema";
import { restoreRuntime } from "./saveMigration";

export type MigrationStore = {
  read: () => Promise<{ state: Runtime } | undefined>;
  backup: (state: Runtime, target: number, playerName: string) => Promise<void>;
  commit: (before: Runtime, after: Runtime) => Promise<void>;
};
// The mapper is pure. No new state reaches the UI or current save before the
// original has been backed up and the validated replacement has committed.
export async function restoreWithBackup(
  work: Work,
  playerName: string,
  store: MigrationStore,
  active = () => true,
): Promise<Runtime | null> {
  const row = await store.read();
  if (!row) return null;
  const original = row.state;
  let backed = false;
  const preserve = async () => {
    if (!backed) {
      await store.backup(original, work.updatedAt, playerName);
      backed = true;
    }
  };
  if (original.revision !== work.updatedAt) await preserve();
  let value: Runtime;
  try {
    value = restoreRuntime(work, original);
  } catch (error) {
    await preserve();
    throw error;
  }
  value = {
    ...value,
    ui: { ...value.ui, profile: { ...value.ui?.profile, playerName } },
  };
  if (JSON.stringify(value) !== JSON.stringify(original)) {
    await preserve();
    if (!active()) throw new Error("页面已切换，保留原存档，未写入迁移结果。");
    await store.commit(original, value);
  }
  return value;
}
