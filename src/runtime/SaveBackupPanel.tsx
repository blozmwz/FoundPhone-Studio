import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { Runtime, Work } from "../schema";
import {
  decodeBackup,
  downloadBackup,
  encodeBackup,
  MAX_SAVE_BYTES,
} from "./saveBackup";
import { replaceRuntime, readSavedRuntime } from "../persistence";
export function SaveBackup({
  work,
  state,
  saveKey,
  nameKey = "foundphone-player-name",
  importOnly = false,
  embedded = false,
  onRestart,
}: {
  work: Work;
  state: Runtime;
  saveKey: string;
  nameKey?: string;
  importOnly?: boolean;
  embedded?: boolean;
  onRestart?: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false),
    [error, setError] = useState("");
  const [pending, setPending] = useState<ReturnType<
    typeof decodeBackup
  > | null>(null);
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const content = (
    <aside className={`save-backup-tools ${embedded ? "embedded" : ""}`}>
      {!embedded && (
        <button onClick={() => setOpen(!open)}>
          {importOnly ? "导入已有存档" : "存档与备份"}
        </button>
      )}
      {(embedded || open) && (
        <section aria-label="存档与备份" className="save-backup-panel">
          <strong>{importOnly ? "恢复已有进度" : "进度自动保存"}</strong>
          <p>备份可用于换设备或保留进度。</p>
          {embedded && <p>刷新或下次打开同一网址，会接着当前进度继续。</p>}
          {!importOnly && (
            <>
              <button
                onClick={() =>
                  downloadBackup(encodeBackup(state, work.phone.owner))
                }
              >
                导出存档
              </button>
            </>
          )}
          <button
            onClick={() => {
              setError("");
              input.current?.click();
            }}
          >
            导入存档
          </button>
          {onRestart && (
            <button
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await onRestart();
                } catch {
                  setError("重新开始未完成，原进度已保留，请重试。");
                } finally {
                  setBusy(false);
                }
              }}
            >
              重新开始
            </button>
          )}
          <input
            hidden
            type="file"
            accept=".json,application/json"
            ref={input}
            aria-label="选择存档文件"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (!file) return;
              try {
                if (file.size > MAX_SAVE_BYTES)
                  throw Error("存档文件过大，未覆盖进度。");
                setPending(decodeBackup(work, await file.text()));
                setError("");
              } catch (e) {
                setError(
                  e instanceof Error ? e.message : "读取失败，未覆盖进度。",
                );
              }
            }}
          />
          {error && <p role="alert">{error}</p>}
        </section>
      )}
      {pending && (
        <section
          className="save-import-confirm"
          role="alertdialog"
          aria-label="确认覆盖存档"
        >
          <h3>要覆盖当前进度吗？</h3>
          <p>
            {pending.playerName} · {pending.state.date} {pending.state.time}
          </p>
          <p>确认前不会改动进度。覆盖前会自动保留一份当前进度备份。</p>
          <button
            disabled={busy}
            onClick={() => {
              setPending(null);
            }}
          >
            取消导入
          </button>
          <button
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                const current = await readSavedRuntime(saveKey);
                const restored = {
                  ...pending.state,
                  ui: {
                    ...pending.state.ui,
                    profile: {
                      ...pending.state.ui?.profile,
                      playerName: pending.playerName,
                    },
                  },
                };
                await replaceRuntime(
                  saveKey,
                  current?.state ?? state,
                  restored,
                );
                try {
                  localStorage.setItem(nameKey, pending.playerName);
                } catch {
                  /* Current visit still restores its progress. */
                }
                setPending(null);
                location.reload();
              } catch {
                setError("导入未完成，请重试。");
              } finally {
                setBusy(false);
              }
            }}
          >
            确认覆盖并恢复
          </button>
        </section>
      )}
    </aside>
  );
  return embedded ? content : createPortal(content, document.body);
}
