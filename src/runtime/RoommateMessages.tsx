import {messageSessionBreak} from './messageSeparation';
import { PhotoViewer } from './PhotoViewer';
import { SimulatedReplyKeys } from "./SimulatedReplyKeys";
import { unreadMessageItems } from "./messageRead";
import { orderedMessages } from "./messageOrder";
import { availableTopics, topicReplies } from "./lifeInteractions";
import { useEffect, useRef, useState } from "react";
import {
  ArrowUp,
  AudioLines,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Plus,
  Search,
  SquarePen,
  UserRound,
  Video,
} from "lucide-react";
import { safeMedia, type Item, type Runtime, type Work } from "../schema";
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
  const pending = state.variables.s29PhotoReady ? "Hendery" : replyThread(work, state.choices);
  const [thread, setThread] = useState(initialThread || pending);
  const [photoPicker, setPhotoPicker] = useState(false);
  const [viewedPhoto,setViewedPhoto]=useState<Item|null>(null);
  const mealPhotos = work.data.photos.filter(i => i.meta.sourceEvent === "s29-meal-start" && state.unlocked.includes(i.id) && safeMedia(i.media));
  const photoReady = thread === "Hendery" && state.variables.s29PhotoReady === true;
  const photoDraft = photoReady ? mealPhotos.find(i => i.id === state.variables.s29SelectedPhoto) : undefined;
  const [query, setQuery] = useState("");
  const [keyboard, setKeyboard] = useState(
    Boolean(state.ui?.messages?.replyDraft),
  );
  const [suggestions, setSuggestions] = useState(false);
  const [topicIndex, setTopicIndex] = useState(0);
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
  const followAfterSend = useRef(false);
  const lastThread = useRef("");
  const readCallback = useRef(onRead);
  readCallback.current = onRead;
  const readIds = useRef(new Set(state.read));
  for (const id of state.read) readIds.current.add(id);
  const ordered = orderedMessages(items, state.unlocked);
  const list = ordered.filter((m) => m.title === thread);
  function avatarFor(name: string) {
    return (
      work.data.contacts?.find((c) => c.title === name)?.avatar ||
      items.find((m) => m.title === name && !m.outgoing && m.avatar)?.avatar ||
      ""
    );
  }
  const conversationAvatar = avatarFor(thread);
  const signature = list.map((m) => m.id).join("|");
  const names = [...new Set(ordered.map((m) => m.title))]
    .filter((name) => name.toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => {
      return (
        ordered.filter((m) => m.title === b).at(-1)?.time ?? ""
      ).localeCompare(ordered.filter((m) => m.title === a).at(-1)?.time ?? "");
    });
  // Read only bubbles that are actually on screen. This also works after returning
  // from a diary or restoring a saved game; branch decisions still require send.
  useEffect(() => {
    const area = scroll.current;
    if (!area || !thread) return;
    if (
      lastThread.current !== thread ||
      followBottom.current ||
      followAfterSend.current
    ) {
      area.scrollTop = area.scrollHeight;
      followBottom.current = true;
      followAfterSend.current = false;
    }
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
  const available = thread === "Hendery" ? availableTopics(work, state) : [];
  const selectedTopic = selected.replace(/^topic:/, "");
  const activeTopic =
    available.find(
      (m) =>
        m.id === selectedTopic || m.meta.alternateReplyId === selectedTopic,
    ) ?? available[topicIndex % Math.max(available.length, 1)];
  const topics = activeTopic
    ? topicReplies(work, state, activeTopic.id).map((m) => ({
        target: "topic:" + m.id,
        label: m.body,
      }))
    : [];
  const choices = ordinary.length ? ordinary : topics;
  const choice = choices.find((c) => c.target === selected);
  const scheduledMessage = (state.variables.s45Typing === true && thread === "Hendery") || state.scheduled?.some(
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
    if (photoDraft) {
      followAfterSend.current = true; followBottom.current = true;
      onStoryEvent?.("mealPhotoSent", photoDraft.id); setPhotoPicker(false); setKeyboard(false); return;
    }
    if (!choice) return;
    // Sending multiple bubbles can move the viewport by more than the follow
    // threshold before the effect runs. Keep this explicit player intention;
    // ordinary incoming messages still respect scrolling up to read history.
    followAfterSend.current = true;
    followBottom.current = true;
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
      data-photo={photoReady}
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
              disabled
              title="暂未开放视频通话"
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
                messageSessionBreak(previous?.time,m.time);
              const tail =
                !next ||
                m.outgoing !== next.outgoing ||
                messageSessionBreak(m.time,next.time);
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
                      {!previous||m.time.slice(0,10)!==previous.time.slice(0,10)?m.time.slice(0,10)+' ':''}{m.time.slice(11,16)}
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
                      if(m.kind==="image"&&safeMedia(m.media))setViewedPhoto(m);
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
                    ) : m.meta.simulatedVideo === "true" ? (
                      <span className="rm-contact-card" aria-label="模拟视频分享卡片"><Video size={34}/><span><strong>视频</strong><small>搞笑短视频</small></span></span>
                    ) : m.kind === "image" && safeMedia(m.media) ? (
                      <img className="rm-attachment-photo" width={180} height={200} src={safeMedia(m.media)} alt="发送的照片"/>
                    ) : m.meta.shopShare ? (
                      <span className="rm-contact-card">
                        <span>
                          <strong>{m.meta.shopShare}</strong>
                          <small>{m.meta.shopDescription || "店铺分享"}</small>
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
              onClick={() => photoReady ? setPhotoPicker(true) : showKeyboard()}
            >
              <Plus size={24} />
            </button>
            <button
              className={`rm-compose-field ${choice || photoDraft ? "has-draft" : ""}`}
              aria-label="输入消息"
              onClick={() => photoReady ? setPhotoPicker(true) : showKeyboard()}
              onKeyDown={(e) => {
                if (e.key.length === 1) {
                  e.preventDefault();
                  showKeyboard();
                  pressKey();
                }
              }}
            >
              <span>{photoDraft ? "照片" : photoReady ? "选择照片" : choice?.label ?? (suggestions ? "…" : "iMessage")}</span>
              {!choice && state.variables.s45ReunionComplete === true && thread === "Hendery" ? <i className="reunion-caret" aria-label="等待输入"/> : !choice && <AudioLines size={20} />}
            </button>
            {(choice || photoDraft) && (
              <button className="rm-send" aria-label="发送消息" onClick={send}>
                <ArrowUp size={22} />
              </button>
            )}
          </div>
          {photoReady && <div className="rm-draft-tools rm-photo-tools">
            <button onClick={() => setPhotoPicker(true)}>选择要发送的照片</button>
            {photoDraft && <button onClick={() => onStoryEvent?.("clearMealPhoto", photoDraft.id)}>删除照片草稿</button>}
          </div>}
          {photoPicker && photoReady && <div className="rm-photo-picker" role="dialog" aria-label="选择饭后照片">
            <button onClick={() => setPhotoPicker(false)}>关闭相册</button>
            {mealPhotos.map(i => <button key={i.id} aria-label={"选择照片："+i.title} onClick={() => {
              onStoryEvent?.("selectMealPhoto", i.id); setPhotoPicker(false);
            }}><img src={safeMedia(i.media)} alt={i.title}/></button>)}
          </div>}
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
              {suggestions && !ordinary.length && available.length > 1 && (
                <div className="rm-draft-tools">
                  <button
                    onClick={() => {
                      setSelected("");
                      onDraft?.("");
                      setTopicIndex((index) => (index + 1) % available.length);
                    }}
                  >
                    换个话题
                  </button>
                </div>
              )}
              <SimulatedReplyKeys
                onPress={pressKey}
                onDelete={() => {
                  setSelected("");
                  onDraft?.("");
                  setSuggestions(false);
                }}
              />
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
              const messages = ordered.filter((m) => m.title === name),
                last = messages.at(-1)!;
              const unread = unreadMessageItems(
                messages,
                state,
                work.phone.date,
              ).length;
              return (
                <button
                  className="rm-thread"
                  aria-label={`与 ${name} 的会话`}
                  key={name}
                  onClick={() => openThread(name)}
                >
                  {unread > 0 && (
                    <i className="rm-unread" aria-label={`${unread}条未读`} />
                  )}
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
      {viewedPhoto && <PhotoViewer src={viewedPhoto.media} title="发送的照片" onClose={()=>setViewedPhoto(null)}/>}
    </div>
  );
}
