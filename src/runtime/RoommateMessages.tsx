import { availableTopics } from "./lifeInteractions";
import { useEffect, useRef, useState } from "react";
import {
  ArrowUp,
  AudioLines,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Delete,
  Globe,
  Mic,
  Plus,
  Search,
  SquarePen,
  UserRound,
  Video,
} from "lucide-react";
import type { Item, Runtime, Work } from "../schema";
import "./roommate.css";
import { messagePacing } from "../story-engine/messagePacing";

export function replyThread(work: Work, choices: Runtime["choices"]) {
  for (const choice of choices) {
    const node = work.nodes.find((n) => n.id === choice.target);
    for (const a of node?.actions ?? []) {
      const item = work.data.messages?.find(
        (m) => a.type === "unlock" && m.id === a.key && m.outgoing,
      );
      if (item) return item.title;
    }
  }
  return "";
}

export function RoommateMessages({
  items,
  state,
  work,
  onRead,
  onChoose,
  onDraft,
  onOpenContact,
  initialThread,
  onBack,
  onStoryEvent,
  onReaction,
}: {
  items: Item[];
  state: Runtime;
  work: Work;
  onRead: (id: string) => void;
  onChoose: (id: string) => void;
  onDraft?: (id: string) => void;
  onOpenContact?: (id: string) => void;
  initialThread?: string;
  onStoryEvent?: (event: string, target: string) => void;
  onReaction?: (id: string, reaction: string) => void;
  onBack: () => void;
}) {
  const pending = replyThread(work, state.choices);
  const [thread, setThread] = useState(initialThread || pending);
  const [query, setQuery] = useState("");
  const [keyboard, setKeyboard] = useState(
    Boolean(state.ui?.messages?.replyDraft),
  );
  const [suggestions, setSuggestions] = useState(false);
  const [selected, setSelected] = useState(
    String(state.ui?.messages?.replyDraft ?? ""),
  );
  const [zoomAvatar, setZoomAvatar] = useState(false);
  const [reactionTarget, setReactionTarget] = useState("");
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const held = useRef(false);
  useEffect(
    () => () => {
      if (holdTimer.current) clearTimeout(holdTimer.current);
    },
    [],
  );
  const scroll = useRef<HTMLDivElement>(null);
  const followBottom = useRef(true);
  const lastThread = useRef("");
  const readCallback = useRef(onRead);
  readCallback.current = onRead;
  const readIds = useRef(new Set(state.read));
  for (const id of state.read) readIds.current.add(id);
  const list = items
    .filter((m) => m.title === thread)
    .sort((a, b) => a.time.localeCompare(b.time));
  function avatarFor(name: string) {
    return (
      work.data.contacts?.find((c) => c.title === name)?.avatar ||
      items.find((m) => m.title === name && !m.outgoing && m.avatar)?.avatar ||
      ""
    );
  }
  const conversationAvatar = avatarFor(thread);
  const signature = list.map((m) => m.id).join("|");
  const names = [...new Set(items.map((m) => m.title))]
    .filter((name) => name.toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => {
      return (
        items.filter((m) => m.title === b).at(-1)?.time ?? ""
      ).localeCompare(items.filter((m) => m.title === a).at(-1)?.time ?? "");
    });
  // Read only bubbles that are actually on screen. This also works after returning
  // from a diary or restoring a saved game; branch decisions still require send.
  useEffect(() => {
    const area = scroll.current;
    if (!area || !thread) return;
    if (lastThread.current !== thread || followBottom.current)
      area.scrollTop = area.scrollHeight;
    lastThread.current = thread;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const id = (entry.target as HTMLElement).dataset.messageId;
          if (entry.isIntersecting && id && !readIds.current.has(id)) {
            readIds.current.add(id);
            readCallback.current(id);
          }
        }
      },
      { root: area, threshold: 0.6 },
    );
    area
      .querySelectorAll("[data-message-id]")
      .forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [signature, thread, keyboard, suggestions]);
  const ordinary = pending === thread ? state.choices : [];
  const topics =
    thread === "Hendery"
      ? availableTopics(work, state).map((m) => ({
          target: "topic:" + m.id,
          label: m.body,
        }))
      : [];
  const choices = ordinary.length ? ordinary : topics;
  const choice = choices.find((c) => c.target === selected);
  const scheduledMessage = state.scheduled?.some(
    (s) =>
      s.due - (state.elapsedMs ?? 0) <= messagePacing.typingWindowMs &&
      work.nodes
        .find((n) => n.id === s.nodeId)
        ?.actions.some((a) =>
          work.data.messages?.some(
            (m) =>
              a.type === "unlock" &&
              a.key === m.id &&
              m.title === thread &&
              !m.outgoing,
          ),
        ),
  );
  function showKeyboard() {
    setKeyboard(true);
  }
  function pressKey() {
    if (choices.length) setSuggestions(true);
  }
  function send() {
    if (!choice) return;
    onDraft?.("");
    if (choice.target.startsWith("topic:"))
      onStoryEvent?.("topic", choice.target.slice(6));
    else onChoose(choice.target);
    setSelected("");
    setSuggestions(false);
    setKeyboard(false);
  }
  function openThread(name: string) {
    setThread(name);
    setKeyboard(false);
    setSuggestions(false);
    setSelected(String(state.ui?.messages?.replyDraft ?? ""));
  }
  return (
    <div
      className="roommate-messages"
      data-thread={thread}
      data-keyboard={keyboard}
    >
      {thread ? (
        <>
          <header className="rm-chat-header">
            <button
              className="rm-back"
              aria-label="返回信息列表"
              onClick={() => openThread("")}
            >
              <ChevronLeft size={28} />
              <span>信息</span>
            </button>
            <button
              className="rm-avatar"
              aria-label={`查看${thread}头像大图`}
              onClick={() => {
                if (!conversationAvatar) return;
                setZoomAvatar(true);
                if (thread === "Hendery")
                  onStoryEvent?.("avatarViewed", "hendery");
              }}
            >
              {conversationAvatar ? (
                <img src={conversationAvatar} alt={`${thread}的头像`} />
              ) : (
                <UserRound size={32} />
              )}
            </button>
            <span className="rm-name">
              {thread}
              <ChevronRight size={11} />
            </span>
            <button
              className="rm-video"
              aria-label="视频通话"
              onClick={() => onRead(thread)}
            >
              <Video size={25} />
            </button>
          </header>
          <div
            className="rm-conversation"
            ref={scroll}
            onScroll={(event) => {
              const area = event.currentTarget;
              followBottom.current =
                area.scrollHeight - area.scrollTop - area.clientHeight <=
                messagePacing.followBottomPx;
            }}
            aria-live="polite"
            aria-label={`与 ${thread} 的聊天`}
          >
            {list.map((m, i) => {
              const previous = list[i - 1],
                next = list[i + 1];
              const stamp =
                !previous || m.time.slice(0, 10) !== previous.time.slice(0, 10);
              const tail =
                !next ||
                m.outgoing !== next.outgoing ||
                m.time.slice(0, 10) !== next.time.slice(0, 10);
              return (
                <div
                  className={`rm-message ${m.outgoing ? "rm-outgoing" : ""}`}
                  key={m.id}
                >
                  {stamp && (
                    <time className="rm-date">
                      {i === 0 && (
                        <>
                          iMessage
                          <br />
                        </>
                      )}
                      {m.time.slice(0, 10)} {m.time.slice(11, 16)}
                    </time>
                  )}
                  <button
                    data-message-id={m.id}
                    className={`rm-bubble ${tail ? "rm-tail" : ""}`}
                    onPointerDown={() => {
                      held.current = false;
                      if (holdTimer.current) clearTimeout(holdTimer.current);
                      holdTimer.current = setTimeout(() => {
                        held.current = true;
                        setReactionTarget(m.id);
                      }, 500);
                    }}
                    onPointerUp={() => {
                      if (holdTimer.current) clearTimeout(holdTimer.current);
                    }}
                    onPointerCancel={() => {
                      if (holdTimer.current) clearTimeout(holdTimer.current);
                    }}
                    onPointerMove={() => {
                      if (holdTimer.current) clearTimeout(holdTimer.current);
                    }}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      held.current = true;
                      setReactionTarget(m.id);
                    }}
                    onClick={() => {
                      if (held.current) return;
                      onRead(m.id);
                      if (m.meta.contactId) onOpenContact?.(m.meta.contactId);
                    }}
                  >
                    {m.meta.contactId ? (
                      <span className="rm-contact-card">
                        {work.data.contacts?.find(
                          (c) => c.id === m.meta.contactId,
                        )?.avatar ? (
                          <img
                            className="rm-contact-photo"
                            src={
                              work.data.contacts.find(
                                (c) => c.id === m.meta.contactId,
                              )!.avatar
                            }
                            alt={`${m.meta.contactName || m.body}的头像`}
                          />
                        ) : (
                          <UserRound size={30} />
                        )}
                        <span>
                          <strong>{m.meta.contactName || m.body}</strong>
                          <small>联系人名片</small>
                        </span>
                      </span>
                    ) : (
                      m.body
                    )}
                  </button>
                  {state.ui?.messages?.["reaction:" + m.id] && (
                    <span className="rm-reaction" aria-label="消息回应">
                      {String(state.ui.messages["reaction:" + m.id])}
                    </span>
                  )}
                  {m.outgoing && tail && (
                    <small className="rm-receipt">已送达</small>
                  )}
                </div>
              );
            })}
            {scheduledMessage && (
              <span className="rm-bubble rm-typing" aria-label="对方正在输入">
                <i />
                <i />
                <i />
              </span>
            )}
          </div>
          <div className="rm-composer">
            <button
              className="rm-plus"
              aria-label="附件"
              onClick={showKeyboard}
            >
              <Plus size={24} />
            </button>
            <button
              className={`rm-compose-field ${choice ? "has-draft" : ""}`}
              aria-label="输入消息"
              onClick={showKeyboard}
              onKeyDown={(e) => {
                if (e.key.length === 1) {
                  e.preventDefault();
                  showKeyboard();
                  pressKey();
                }
              }}
            >
              <span>{choice?.label ?? (suggestions ? "…" : "iMessage")}</span>
              {!choice && <AudioLines size={20} />}
            </button>
            {choice && (
              <button className="rm-send" aria-label="发送消息" onClick={send}>
                <ArrowUp size={22} />
              </button>
            )}
          </div>
          {choice && (
            <div className="rm-draft-tools">
              <button
                onClick={() => {
                  setKeyboard(true);
                  setSuggestions(true);
                }}
              >
                换个说法
              </button>
              <button
                onClick={() => {
                  setSelected("");
                  onDraft?.("");
                  setSuggestions(false);
                }}
              >
                删除草稿
              </button>
            </div>
          )}
          {reactionTarget && (
            <div
              className="rm-reactions"
              role="dialog"
              aria-label="回应这条消息"
            >
              {["♥", "😂", "👍"].map((reaction) => (
                <button
                  key={reaction}
                  aria-label={`回应${reaction}`}
                  onClick={() => {
                    onReaction?.(reactionTarget, reaction);
                    setReactionTarget("");
                  }}
                >
                  {reaction}
                </button>
              ))}
              <button
                onClick={() => {
                  onReaction?.(reactionTarget, "");
                  setReactionTarget("");
                }}
              >
                撤回回应
              </button>
              <button onClick={() => setReactionTarget("")}>取消</button>
            </div>
          )}
          {zoomAvatar && (
            <div className="rm-avatar-view" role="dialog" aria-label="头像大图">
              <button onClick={() => setZoomAvatar(false)}>关闭头像</button>
              <img src={conversationAvatar} alt={`${thread}头像原图`} />
            </div>
          )}
          {keyboard && (
            <div className="rm-keyboard" aria-label="模拟键盘">
              {suggestions && choices.length > 0 ? (
                <div className="rm-suggestions" aria-label="回复选项">
                  {choices.map((c) => (
                    <button
                      key={c.target}
                      onClick={() => {
                        setSelected(c.target);
                        onDraft?.(c.target);
                        setSuggestions(false);
                      }}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="rm-predictions">
                  <span>我</span>
                  <span>你</span>
                  <span>好</span>
                  <span>是</span>
                  <span>这</span>
                  <span>不</span>
                  <button
                    aria-label="收起键盘"
                    onClick={() => setKeyboard(false)}
                  >
                    <ChevronDown size={22} />
                  </button>
                </div>
              )}
              {["qwertyuiop", "asdfghjkl", "zxcvbnm"].map((row, i) => (
                <div className={`rm-key-row rm-key-row-${i}`} key={row}>
                  {i === 2 && (
                    <button
                      className="rm-key rm-mod"
                      aria-label="大写"
                      onClick={pressKey}
                    >
                      <ArrowUp size={21} />
                    </button>
                  )}
                  {[...row].map((k) => (
                    <button className="rm-key" key={k} onClick={pressKey}>
                      {k}
                    </button>
                  ))}
                  {i === 2 && (
                    <button
                      className="rm-key rm-mod"
                      aria-label="删除"
                      onClick={() => {
                        setSelected("");
                        onDraft?.("");
                        setSuggestions(false);
                      }}
                    >
                      <Delete size={22} />
                    </button>
                  )}
                </div>
              ))}
              <div className="rm-key-row">
                <button className="rm-key rm-mod" onClick={pressKey}>
                  123
                </button>
                <button className="rm-key rm-mod" onClick={pressKey}>
                  ☺
                </button>
                <button className="rm-key rm-space" onClick={pressKey}>
                  空格
                </button>
                <button className="rm-key rm-mod" onClick={pressKey}>
                  换行
                </button>
              </div>
              <div className="rm-keyboard-foot">
                <button aria-label="切换语言" onClick={pressKey}>
                  <Globe size={27} />
                </button>
                <button aria-label="听写" onClick={pressKey}>
                  <Mic size={26} />
                </button>
              </div>
            </div>
          )}
        </>
      ) : (
        <>
          <header className="rm-list-nav">
            <button onClick={onBack}>
              <ChevronLeft size={18} />
              返回
            </button>
            <button
              aria-label="新信息"
              onClick={() => openThread(pending || names[0] || "Hendery")}
            >
              <SquarePen size={24} />
            </button>
          </header>
          <h1>信息</h1>
          <label className="rm-search">
            <Search size={17} />
            <input
              aria-label="搜索信息"
              placeholder="搜索"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          <div className="rm-thread-list">
            {names.map((name) => {
              const messages = items.filter((m) => m.title === name),
                last = messages.at(-1)!;
              const unread = messages.some(
                (m) => !m.outgoing && !state.read.includes(m.id),
              );
              return (
                <button
                  className="rm-thread"
                  aria-label={`与 ${name} 的会话`}
                  key={name}
                  onClick={() => openThread(name)}
                >
                  {unread && <i className="rm-unread" />}
                  <span className="rm-avatar">
                    {avatarFor(name) ? (
                      <img src={avatarFor(name)} alt={`${name}的头像`} />
                    ) : name === "Yuki" ? (
                      "Y"
                    ) : (
                      <UserRound size={32} />
                    )}
                  </span>
                  <span className="rm-thread-copy">
                    <strong>
                      {name}
                      <time>
                        {last.time.slice(11, 16)} <ChevronRight size={12} />
                      </time>
                    </strong>
                    <span>{last.body}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
