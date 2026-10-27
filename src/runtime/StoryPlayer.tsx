import { useEffect, useState, type FormEvent } from "react";
import { createRoot } from "react-dom/client";
import { Phone } from "../Phone";
import { validateWork, type Work } from "../schema";
import "../styles.css";
import "./player.css";
function savedPlayerName() {
  try {
    return localStorage.getItem("foundphone-player-name") || "";
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
      { signal: abort.signal },
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
      localStorage.setItem("foundphone-player-name", name);
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
          <Phone work={personalizedWork} />
        ) : (
          <section className="story-welcome">
            <span className="story-welcome-kicker">A PHONE, A STORY</span>
            <h1>{personalizedWork.title}</h1>
            <p>先留下一個稱呼，這台手機就會以你的名字開啟。</p>
            <form onSubmit={startWithName}>
              <label htmlFor="player-name">你的名字</label>
              <input
                id="player-name"
                maxLength={24}
                autoComplete="given-name"
                placeholder="輸入名字或暱稱"
                value={nameInput}
                onChange={(event) => setNameInput(event.target.value)}
                autoFocus
              />
              <button type="submit" disabled={!nameInput.trim()}>
                拿起手機 <span aria-hidden="true">↗</span>
              </button>
            </form>
            <small>名字只會保存在這台裝置的瀏覽器裡。</small>
          </section>
        )
      ) : (
        <p role="status">{error || "正在打开手机…"}</p>
      )}
    </main>
  );
}
createRoot(document.getElementById("root")!).render(<StoryPlayer />);
