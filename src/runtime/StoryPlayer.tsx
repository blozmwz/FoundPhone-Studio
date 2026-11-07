import { beginAnonymousVisit } from './useAnonymousAnalytics';
import { SaveBackup } from "./SaveBackupPanel";
import { initialRuntime } from "../schema";
import { readSavedRuntime } from "../persistence";
import { localReviewSlot, playerNameKey, localOpeningReview } from "./reviewSlot";
import { personalizeWork } from "./personalizeWork";
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
      import.meta.env.DEV && new URLSearchParams(location.search).get("preview") === "test"
        ? "./test-work.json"
        : import.meta.env.DEV && new URLSearchParams(location.search).get("template") === "blank"
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
        void beginAnonymousVisit(w);
      })
      .catch((e) => {
        if (e.name !== "AbortError") setError(String(e));
      });
    return () => abort.abort();
  }, []);
  useEffect(() => {
    if (!work || playerName) return;
    let active = true;
    const slot = localReviewSlot();
    void readSavedRuntime(work.id + (localOpeningReview() ? ":opening-review:"+localOpeningReview() : slot ? ":rc:" + slot : ""))
      .then((saved) => {
        const name = saved?.state.ui?.profile?.playerName;
        if (active && typeof name === "string" && name.trim()) {
          setPlayerName((current) => current || name);
          setNameInput((current) => current || name);
          try {
            localStorage.setItem(playerNameKey(), name);
          } catch {
            /* DB copy remains. */
          }
        }
      })
      .catch(() => {
        /* The name form remains available. */
      });
    return () => {
      active = false;
    };
  }, [work, playerName]);
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
    work && playerName ? personalizeWork(work, playerName) : work;
  return (
    <main className="story-runtime">
      {personalizedWork ? (
        playerName ? (
            <Phone work={personalizedWork} saveKey={localOpeningReview()?personalizedWork.id+":opening-review:"+localOpeningReview():undefined} />
        ) : (
          <>
          <section className="story-welcome">
            <h1>{personalizedWork.title}</h1>
            {typeof personalizedWork.variables.openingIntro==='string'&&personalizedWork.variables.openingIntro.trim()&&<div className="story-welcome-intro">{personalizedWork.variables.openingIntro.split('\n').map((line,i)=><p key={i}>{line}</p>)}</div>}
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
                开启手机
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
                (localOpeningReview()?":opening-review:"+localOpeningReview():localReviewSlot() ? ":rc:" + localReviewSlot() : "")
              }
            />
          </section>
          {typeof personalizedWork.variables.authorCredit==='string'&&<footer className="story-author">{personalizedWork.variables.authorCredit}</footer>}
          </>
        )
      ) : (
        <p role="status">{error || "正在打开手机…"}</p>
      )}
    </main>
  );
}
createRoot(document.getElementById("root")!).render(<StoryPlayer />);
