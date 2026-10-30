import { SaveBackup } from "./SaveBackupPanel";
import { initialRuntime } from "../schema";
import { localReviewSlot, playerNameKey } from "./reviewSlot";
import { ReleaseReview } from "./ReleaseReview";
import { CheckpointPhone } from "./CheckpointPhone";
import { useEffect, useState, type FormEvent } from "react";
import { createRoot } from "react-dom/client";
import { Phone } from "../Phone";
import { validateWork, type Work } from "../schema";
import "../styles.css";
import "./player.css";
function savedPlayerName() {
  try {
    return localStorage.getItem(playerNameKey()) || "";
  } catch {
    return "";
  }
}
function StoryPlayer() {
  const [work, setWork] = useState<Work | null>(null),
    [error, setError] = useState(""),
    [playerName, setPlayerName] = useState(savedPlayerName),
    [nameInput, setNameInput] = useState(savedPlayerName);
  useEffect(() => {
    const abort = new AbortController();
    fetch(
      new URLSearchParams(location.search).get("preview") === "test"
        ? "./test-work.json"
        : new URLSearchParams(location.search).get("template") === "blank"
          ? "./blank-work.json"
          : "./work.json",
      { signal: abort.signal, cache: "no-store" },
    )
      .then((r) => {
        if (!r.ok) throw Error("缺少作品文件，请运行 npm run story:build");
        return r.json();
      })
      .then((x) => {
        const w = validateWork(x);
        document.title =
          w.title === "捡手机" ? "捡手机" : w.title + " · 捡手机";
        setWork(w);
      })
      .catch((e) => {
        if (e.name !== "AbortError") setError(String(e));
      });
    return () => abort.abort();
  }, []);
  const startWithName = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = nameInput.trim().slice(0, 24);
    if (!name) return;
    try {
      localStorage.setItem(playerNameKey(), name);
    } catch {
      // The name still works for this visit if browser storage is unavailable.
    }
    setPlayerName(name);
  };
  const personalizedWork =
    work && playerName
      ? { ...work, phone: { ...work.phone, owner: playerName } }
      : work;
  return (
    <main className="story-runtime">
      {personalizedWork ? (
        playerName ? (
          localReviewSlot() &&
          personalizedWork.variables.releaseStage2 === true ? (
            <ReleaseReview work={personalizedWork} slot={localReviewSlot()} />
          ) : ["127.0.0.1", "localhost", "[::1]"].includes(location.hostname) &&
            [
              "viewing",
              "roommates",
              "stage2",
              "pizza",
              "instagram",
              "menu",
            ].includes(
              new URLSearchParams(location.search).get("start") ?? "",
            ) &&
            personalizedWork.id === "fridge-light-roommates" ? (
            <CheckpointPhone
              work={personalizedWork}
              start={
                new URLSearchParams(location.search).get("start") === "menu"
                  ? "menu"
                  : new URLSearchParams(location.search).get("start") ===
                      "instagram"
                    ? "instagram"
                    : new URLSearchParams(location.search).get("start") ===
                        "pizza"
                      ? "pizza"
                      : new URLSearchParams(location.search).get("start") ===
                          "stage2"
                        ? "stage2"
                        : new URLSearchParams(location.search).get("start") ===
                            "roommates"
                          ? "roommates"
                          : "viewing"
              }
            />
          ) : (
            <Phone work={personalizedWork} />
          )
        ) : (
          <section className="story-welcome">
            <span className="story-welcome-kicker">A PHONE, A STORY</span>
            <h1>{personalizedWork.title}</h1>
            <p>先留下一个称呼，这是你的手机。</p>
            <form onSubmit={startWithName}>
              <label htmlFor="player-name">你的名字</label>
              <input
                id="player-name"
                maxLength={24}
                autoComplete="given-name"
                placeholder="输入名字或昵称"
                value={nameInput}
                onChange={(event) => setNameInput(event.target.value)}
                autoFocus
              />
              <button type="submit" disabled={!nameInput.trim()}>
                拿起手机 <span aria-hidden="true">↗</span>
              </button>
            </form>
            <small>名字只会保存在这台设备的浏览器里。</small>
            <SaveBackup
              importOnly
              work={personalizedWork}
              state={initialRuntime(personalizedWork)}
              nameKey={playerNameKey()}
              saveKey={
                personalizedWork.id +
                (localReviewSlot() ? ":rc:" + localReviewSlot() : "")
              }
              onRestore={() => {}}
            />
          </section>
        )
      ) : (
        <p role="status">{error || "正在打开手机…"}</p>
      )}
    </main>
  );
}
createRoot(document.getElementById("root")!).render(<StoryPlayer />);
