import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import {
  ArrowLeft,
  Bookmark,
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  Grid3X3,
  Heart,
  Home,
  MessageCircle,
  MoreHorizontal,
  Pause,
  Play,
  Search,
  Send,
  UserRound,
  X,
} from "lucide-react";
import type { SkinProps } from "../AppSkins";
import type { Item } from "../schema";
import { Avatar, Media } from "../skins/shared";
import { useSkinState } from "../skinState";
import {
  currentInstagramStories,
  instagramContent,
  instagramDate,
  instagramNow,
  IG_STORY_MS,
} from "./instagramModel";
import "./instagram.css";
import { InstagramCarousel, AlbumBadge } from "./InstagramCarousel";
type Sheet = { kind: "comments" | "share" | "likes"; item?: Item } | null;
export function RoommateInstagram(p: SkinProps) {
  const [storedTab, setTab] = useSkinState<string>(p, "mymyTab", "主页");
  const tab = ["主页", "搜索", "收藏", "个人主页"].includes(storedTab)
    ? storedTab
    : "主页";
  const [profileHandle, setProfileHandle] = useSkinState<string>(
    p,
    "mymyProfileHandle",
    "",
  );
  const [selectedId, setSelectedId] = useSkinState<string>(
    p,
    "igSelectedPost",
    "",
  );
  const [liked, setLiked] = useSkinState<string[]>(p, "mymyLiked", []);
  const [saved, setSaved] = useSkinState<string[]>(p, "mymySaved", []);
  const [seen, setSeen] = useSkinState<string[]>(p, "mymySeen", []);
  const [comments, setComments] = useSkinState<string[]>(p, "mymyReplies", []);
  const [unfollowed, setUnfollowed] = useSkinState<string[]>(
    p,
    "igUnfollowed",
    [],
  );
  const [expanded, setExpanded] = useSkinState<string[]>(
    p,
    "igExpandedCaptions",
    [],
  );
  const [query, setQuery] = useState("");
  const [sheet, setSheet] = useState<Sheet>(null);
  const [comment, setComment] = useState("");
  const [notice, setNotice] = useState("");
  const [storyIds, setStoryIds] = useState<string[]>([]);
  const [storyIndex, setStoryIndex] = useState(0);
  const [archive, setArchive] = useState(false);
  const [paused, setPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const progressRef = useRef(0);
  const pointer = useRef({ down: 0, x: 0, y: 0, held: false });
  const body = useRef<HTMLDivElement>(null);
  const positions = useRef<Record<string, number>>(
    (() => {
      try {
        const value = JSON.parse(String(p.ui?.igScrollPositions || "{}"));
        return Object.fromEntries(
          Object.entries(value).filter(
            ([, n]) => typeof n === "number" && Number.isFinite(n) && n >= 0,
          ),
        );
      } catch {
        return {};
      }
    })() as Record<string, number>,
  );
  const seenRef = useRef(new Set(seen));
  const callbacks = useRef({ p, setSeen });
  callbacks.current = { p, setSeen };
  for (const id of seen) seenRef.current.add(id);
  const now = instagramNow(p.virtualDate, p.virtualTime);
  const available = instagramContent(p.items, now);
  const profiles = available.filter((i) => i.meta.profile === "true");
  const posts = available
    .filter(
      (i) =>
        i.meta.profile !== "true" &&
        i.meta.story !== "true" &&
        i.folder !== "私信" &&
        i.meta.albumOnly !== "true",
    )
    .sort((a, b) => b.time.localeCompare(a.time));
  const activeStories = currentInstagramStories(available, now);
  const selected = posts.find((i) => i.id === selectedId);
  const profile = profiles.find((i) => i.meta.handle === profileHandle);
  const handle = (i: Item) => i.meta.handle || i.sender;
  const avatar = (i: Item) =>
    i.avatar || profiles.find((a) => handle(a) === handle(i))?.avatar;
  const ownHandle = "my_daily";
  const accountHandle = profile?.meta.handle || ownHandle;
  const accountPosts = posts.filter(
    (i) => handle(i) === accountHandle || (!profile && i.sender === p.owner),
  );
  const highlights = [
    ...new Set(
      available
        .filter(
          (i) =>
            i.meta.story === "true" &&
            handle(i) === accountHandle &&
            i.meta.highlight,
        )
        .map((i) => i.meta.highlight),
    ),
  ];
  const active = available.find((i) => i.id === storyIds[storyIndex]);
  const accountGroups = [...new Set(activeStories.map(handle))].map((h) =>
    activeStories.filter((i) => handle(i) === h),
  );
  const routeKey = selected
    ? "post:" + selected.id
    : tab === "个人主页"
      ? "profile:" + accountHandle
      : tab;
  const ack = useCallback((item: Item) => {
    if (seenRef.current.has(item.id)) return;
    seenRef.current.add(item.id);
    callbacks.current.setSeen([...seenRef.current]);
    callbacks.current.p.onRead(item.id);
  }, []);
  useLayoutEffect(() => {
    if (body.current) body.current.scrollTop = positions.current[routeKey] ?? 0;
  }, [routeKey]);
  useEffect(() => {
    if (active) ack(active);
    p.onReading?.(active?.id || selected?.id || "");
    return () => p.onReading?.("");
  }, [active, selected, p.onReading, ack]);
  useEffect(() => {
    progressRef.current = 0;
    setProgress(0);
  }, [active?.id]);
  const closeStory = () => {
    setStoryIds([]);
    setStoryIndex(0);
    setPaused(false);
  };
  const moveStory = (direction: number) => {
    const index = storyIndex + direction;
    if (index >= storyIds.length) closeStory();
    else {
      setStoryIndex(Math.max(0, index));
      progressRef.current = 0;
      setProgress(0);
    }
  };
  const moveRef = useRef(moveStory);
  moveRef.current = moveStory;
  useEffect(() => {
    if (!active || paused) return;
    const duration = Math.max(
      IG_STORY_MS,
      Math.min(15000, active.body.length * 180),
    );
    let last = performance.now();
    const timer = window.setInterval(() => {
      const stamp = performance.now();
      progressRef.current += (stamp - last) / duration;
      last = stamp;
      setProgress(Math.min(1, progressRef.current));
      if (progressRef.current >= 1) {
        window.clearInterval(timer);
        moveRef.current(1);
      }
    }, 100);
    return () => window.clearInterval(timer);
  }, [active, paused]);
  function remember() {
    if (body.current) positions.current[routeKey] = body.current.scrollTop;
    p.onUi?.("igScrollPositions", JSON.stringify(positions.current));
  }
  function navigate(next: string, account = "") {
    remember();
    setSelectedId("");
    setProfileHandle(account);
    setTab(next);
  }
  function openPost(item: Item) {
    remember();
    ack(item);
    const original = available.find((i) => i.id === item.meta.sourceStory);
    if (original) ack(original);
    setSelectedId(item.id);
  }
  function openStories(items: Item[], isArchive = false) {
    if (!items.length) return;
    remember();
    setArchive(isArchive);
    setStoryIndex(0);
    setStoryIds(items.map((i) => i.id));
    setPaused(false);
  }
  function toggle(id: string, list: string[], set: (items: string[]) => void) {
    set(list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
  }
  const focused = useRef("");
  useEffect(() => {
    const item = available.find((i) => i.id === p.focusItem);
    if (!item || focused.current === item.id) return;
    focused.current = item.id;
    if (item.meta.profile === "true") {
      setTab("个人主页");
      setProfileHandle(handle(item));
    } else if (item.meta.story === "true") {
      setArchive(!activeStories.some((i) => i.id === item.id));
      setStoryIndex(0);
      setStoryIds([item.id]);
    } else {
      ack(item);
      setSelectedId(item.id);
    }
  }, [
    p.focusItem,
    available,
    activeStories,
    ack,
    setTab,
    setProfileHandle,
    setSelectedId,
  ]);
  function renderMedia(item: Item, className = "") {
    return item.media ? (
      <Media item={item} className={className} />
    ) : (
      <div
        className={`rig-text-photo ${className} rig-tone-${item.meta.tone || "sand"}`}
      >
        <span>{item.body}</span>
      </div>
    );
  }
  function post(item: Item, detail = false) {
    const isLiked = liked.includes(item.id),
      isSaved = saved.includes(item.id);
    const commentCount =
      item.comments.length +
      comments.filter((c) => c.startsWith(item.id + "\t")).length;
    return (
      <article className="rig-post" key={item.id} data-ig-post={item.id}>
        <header className="rig-post-header">
          <button
            className="rig-account"
            aria-label={`查看 ${handle(item)} 主页`}
            onClick={() => navigate("个人主页", handle(item))}
          >
            <Avatar name={item.sender} src={avatar(item)} />
            <span className="rig-account-label">
              <strong>{handle(item)}</strong>
              {item.meta.location && <small>{item.meta.location}</small>}
            </span>
          </button>
          <button
            aria-label={"更多操作：" + item.title}
            onClick={() => {
              if (!detail) openPost(item);
              else setSheet({ kind: "share", item });
            }}
          >
            <MoreHorizontal size={23} />
          </button>
        </header>
        <div
          className="rig-post-image"
          onDoubleClick={() => {
            if (!isLiked) setLiked([...liked, item.id]);
          }}
        >
          <InstagramCarousel
            item={item}
            available={available}
            detail={detail}
            p={p}
            onOpen={() => openPost(item)}
          />
        </div>
        <div className="rig-post-actions">
          <button
            aria-label={"点赞" + item.title}
            aria-pressed={isLiked}
            onClick={() => toggle(item.id, liked, setLiked)}
          >
            <Heart
              fill={isLiked ? "#ff3040" : "none"}
              color={isLiked ? "#ff3040" : "currentColor"}
            />
          </button>
          <button
            aria-label={"评论" + item.title}
            onClick={() => setSheet({ kind: "comments", item })}
          >
            <MessageCircle />
          </button>
          <button
            aria-label={"分享" + item.title}
            onClick={() => setSheet({ kind: "share", item })}
          >
            <Send />
          </button>
          <button
            className="rig-save"
            aria-label={"收藏" + item.title}
            aria-pressed={isSaved}
            onClick={() => toggle(item.id, saved, setSaved)}
          >
            <Bookmark fill={isSaved ? "currentColor" : "none"} />
          </button>
        </div>
        <p className="rig-likes">{item.likes + (isLiked ? 1 : 0)}次赞</p>
        <p className="rig-caption">
          <button onClick={() => navigate("个人主页", handle(item))}>
            {handle(item)}
          </button>{" "}
          {!detail && item.body.length > 62 && !expanded.includes(item.id)
            ? item.body.slice(0, 62) + "…"
            : item.body}
          {!detail && item.body.length > 62 && !expanded.includes(item.id) && (
            <button
              className="rig-more-caption"
              onClick={() => setExpanded([...expanded, item.id])}
            >
              更多
            </button>
          )}
        </p>
        <button
          className="rig-comments-link"
          onClick={() => setSheet({ kind: "comments", item })}
        >
          {commentCount ? `查看全部${commentCount}条评论` : "添加评论…"}
        </button>
        <time className="rig-post-time" dateTime={item.time}>
          {instagramDate(item, now)}
        </time>
      </article>
    );
  }
  return (
    <div className="roommate-ig" data-mymy="instagram">
      <header className="rig-header">
        <button
          aria-label={
            selected
              ? "返回Instagram动态"
              : tab === "个人主页" && profile
                ? "返回Instagram首页"
                : "关闭当前App"
          }
          onClick={() => {
            if (selected) setSelectedId("");
            else if (tab === "个人主页" && profile) navigate("主页");
            else {
              remember();
              p.onBack();
            }
          }}
        >
          <ArrowLeft size={24} />
        </button>
        <strong className={tab === "主页" && !selected ? "rig-wordmark" : ""}>
          {selected
            ? "帖子"
            : tab === "个人主页"
              ? accountHandle
              : tab === "主页"
                ? "Instagram"
                : tab}
        </strong>
        <button
          aria-label="查看赞过的帖子"
          onClick={() => setSheet({ kind: "likes" })}
        >
          <Heart size={25} />
        </button>
      </header>
      <div
        className="rig-scroll"
        ref={body}
        onScroll={() => {
          if (body.current) {
            positions.current[routeKey] = body.current.scrollTop;
            p.onUi?.("igScrollPositions", JSON.stringify(positions.current));
          }
        }}
      >
        {selected ? (
          post(selected, true)
        ) : tab === "个人主页" ? (
          <>
            <div className="rig-profile">
              <button
                className="rig-profile-avatar"
                aria-label={
                  profile ? `查看 ${accountHandle} 的快拍` : "我的头像"
                }
                onClick={() =>
                  openStories(
                    activeStories.filter((i) => handle(i) === accountHandle),
                  )
                }
                disabled={
                  !activeStories.some((i) => handle(i) === accountHandle)
                }
              >
                <Avatar
                  name={profile?.sender || p.owner || "我"}
                  src={profile?.avatar}
                />
              </button>
              <div className="rig-profile-stats">
                <span>
                  <b>{accountPosts.length}</b>帖子
                </span>
                <span>
                  <b>
                    {Number(profile?.meta.followers || 0) +
                      (profile && !unfollowed.includes(accountHandle) ? 1 : 0)}
                  </b>
                  粉丝
                </span>
                <span>
                  <b>
                    {profile?.meta.following ||
                      profiles.filter((a) => !unfollowed.includes(handle(a)))
                        .length}
                  </b>
                  关注
                </span>
              </div>
            </div>
            <div className="rig-bio">
              <strong>{profile?.sender || p.owner || "我"}</strong>
              <p>{profile?.meta.bio || profile?.body || ""}</p>
            </div>
            {profile && (
              <div className="rig-profile-buttons">
                <button
                  aria-pressed={!unfollowed.includes(accountHandle)}
                  onClick={() =>
                    toggle(accountHandle, unfollowed, setUnfollowed)
                  }
                >
                  {unfollowed.includes(accountHandle) ? "关注" : "已关注"}
                  {!unfollowed.includes(accountHandle) && <Check size={15} />}
                </button>
              </div>
            )}
            {!!highlights.length && (
              <div className="rig-highlights" aria-label="精选快拍">
                {highlights.map((name) => {
                  const items = available
                    .filter(
                      (i) =>
                        i.meta.story === "true" &&
                        handle(i) === accountHandle &&
                        i.meta.highlight === name,
                    )
                    .sort((a, b) => a.time.localeCompare(b.time));
                  return (
                    <button
                      key={name}
                      aria-label={"查看精选：" + name}
                      onClick={() => openStories(items, true)}
                    >
                      <span>{renderMedia(items[0])}</span>
                      <small>{name}</small>
                    </button>
                  );
                })}
              </div>
            )}
            <div className="rig-grid-tab">
              <Grid3X3 size={23} />
            </div>
            <div className="rig-grid">
              {accountPosts.map((i) => (
                <button
                  key={i.id}
                  aria-label={"打开网格帖子：" + i.title}
                  onClick={() => openPost(i)}
                >
                  {renderMedia(i)}
                  <AlbumBadge item={i} />
                </button>
              ))}
            </div>
            {!accountPosts.length && (
              <div className="rig-empty">
                <Grid3X3 />
                <strong>还没有帖子</strong>
              </div>
            )}
          </>
        ) : tab === "搜索" ? (
          <>
            <label className="rig-search">
              <Search size={18} />
              <input
                aria-label="搜索Instagram"
                placeholder="搜索"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </label>
            {profiles
              .filter((i) =>
                (handle(i) + i.sender)
                  .toLowerCase()
                  .includes(query.toLowerCase()),
              )
              .map((i) => (
                <button
                  className="rig-search-account"
                  key={i.id}
                  onClick={() => navigate("个人主页", handle(i))}
                >
                  <Avatar name={i.sender} src={i.avatar} />
                  <span>
                    <b>{handle(i)}</b>
                    <small>{i.sender}</small>
                  </span>
                </button>
              ))}
            <div className="rig-grid">
              {posts
                .filter((i) =>
                  (i.body + i.title + handle(i))
                    .toLowerCase()
                    .includes(query.toLowerCase()),
                )
                .map((i) => (
                  <button
                    key={i.id}
                    aria-label={"打开搜索帖子：" + i.title}
                    onClick={() => openPost(i)}
                  >
                    {renderMedia(i)}
                    <AlbumBadge item={i} />
                  </button>
                ))}
            </div>
          </>
        ) : tab === "收藏" ? (
          <>
            <p className="rig-section-label">只有你能看到收藏的内容</p>
            {posts.filter((i) => saved.includes(i.id)).map((i) => post(i))}
            {!posts.some((i) => saved.includes(i.id)) && (
              <div className="rig-empty">
                <Bookmark />
                <strong>收藏喜欢的帖子</strong>
              </div>
            )}
          </>
        ) : (
          <>
            {!!accountGroups.length && (
              <div className="rig-stories" aria-label="快拍头像栏">
                {accountGroups.map((items) => {
                  const first = items[0],
                    readAll = items.every((i) => seen.includes(i.id));
                  return (
                    <button
                      className="st"
                      aria-label={"查看快拍：" + handle(first)}
                      key={handle(first)}
                      onClick={() => openStories(items)}
                    >
                      <span
                        className={
                          "rig-story-ring " + (readAll ? "is-seen" : "")
                        }
                      >
                        <Avatar name={first.sender} src={avatar(first)} />
                      </span>
                      <small>{handle(first)}</small>
                    </button>
                  );
                })}
              </div>
            )}
            {posts
              .filter((i) => !unfollowed.includes(handle(i)))
              .map((i) => post(i))}
            {!posts.length && (
              <div className="rig-empty">
                <Home />
                <strong>这里会留下日常</strong>
              </div>
            )}
          </>
        )}
      </div>
      <nav className="rig-nav" aria-label="Instagram底部导航">
        {[
          ["主页", Home],
          ["搜索", Search],
          ["收藏", Bookmark],
          ["个人主页", UserRound],
        ].map(([name, Icon]) => {
          const Label = Icon as typeof Home;
          const value = String(name);
          return (
            <button
              key={value}
              aria-label={value}
              aria-pressed={tab === value && !selected}
              onClick={() => navigate(value)}
            >
              <Label
                fill={
                  tab === value && !selected && value === "主页"
                    ? "currentColor"
                    : "none"
                }
              />
            </button>
          );
        })}
      </nav>
      {sheet && (
        <div
          className="rig-sheet-backdrop"
          onClick={() => {
            setSheet(null);
            setNotice("");
          }}
        >
          <section
            className="rig-sheet"
            role="dialog"
            aria-label={
              sheet.kind === "comments"
                ? "Instagram评论"
                : sheet.kind === "share"
                  ? "分享帖子"
                  : "赞过的帖子"
            }
            onClick={(e) => e.stopPropagation()}
          >
            <div className="rig-sheet-handle" />
            <header>
              <b>
                {sheet.kind === "comments"
                  ? "评论"
                  : sheet.kind === "share"
                    ? "分享"
                    : "赞过的帖子"}
              </b>
              <button
                aria-label="关闭面板"
                onClick={() => {
                  setSheet(null);
                  setNotice("");
                }}
              >
                <X size={22} />
              </button>
            </header>
            {sheet.kind === "comments" && sheet.item && (
              <>
                <div className="rig-comment-list">
                  {[
                    ...sheet.item.comments,
                    ...comments
                      .filter((c) => c.startsWith(sheet.item!.id + "\t"))
                      .map((c) => c.split("\t").slice(1).join("\t")),
                  ].map((c, n) => (
                    <p key={n}>
                      <Avatar name={c.split(/[：:]/)[0]} />
                      <span>{c}</span>
                    </p>
                  ))}
                  {!sheet.item.comments.length &&
                    !comments.some((c) =>
                      c.startsWith(sheet.item!.id + "\t"),
                    ) && <p className="rig-empty-small">还没有评论</p>}
                </div>
                <form
                  className="rig-comment-form"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (comment.trim()) {
                      setComments([
                        ...comments,
                        sheet.item!.id +
                          "\t" +
                          (p.owner || "我") +
                          "：" +
                          comment.trim(),
                      ]);
                      setComment("");
                    }
                  }}
                >
                  <input
                    aria-label="添加评论"
                    placeholder="添加评论…"
                    maxLength={500}
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                  />
                  <button disabled={!comment.trim()}>发布</button>
                </form>
              </>
            )}
            {sheet.kind === "share" && sheet.item && (
              <>
                <button
                  className="rig-sheet-row"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(
                        "@" + handle(sheet.item!) + "\n" + sheet.item!.body,
                      );
                      setNotice("已复制帖子文字");
                    } catch {
                      setNotice("请选择下方文字复制");
                    }
                  }}
                >
                  <Copy size={22} />
                  复制帖子文字
                </button>
                <button
                  className="rig-sheet-row"
                  onClick={() => {
                    if (!saved.includes(sheet.item!.id))
                      setSaved([...saved, sheet.item!.id]);
                    setNotice("已收藏");
                  }}
                >
                  <Bookmark size={22} />
                  收藏帖子
                </button>
                {notice && (
                  <p role="status" className="rig-copy-status">
                    {notice}
                  </p>
                )}
                <p className="rig-copy-text">
                  @{handle(sheet.item)} {sheet.item.body}
                </p>
              </>
            )}
            {sheet.kind === "likes" && (
              <div className="rig-liked-list">
                {posts
                  .filter((i) => liked.includes(i.id))
                  .map((i) => (
                    <button
                      key={i.id}
                      onClick={() => {
                        setSheet(null);
                        openPost(i);
                      }}
                    >
                      {renderMedia(i)}
                      <span>
                        {handle(i)}
                        <small>{i.body}</small>
                      </span>
                      <Check size={18} />
                    </button>
                  ))}
                {!posts.some((i) => liked.includes(i.id)) && (
                  <p className="rig-empty-small">还没有赞过的帖子</p>
                )}
              </div>
            )}
          </section>
        </div>
      )}
      {active && (
        <div
          className="rig-story-view"
          role="dialog"
          aria-label="Instagram快拍"
          data-story-id={active.id}
          onPointerDown={(e) => {
            if ((e.target as HTMLElement).closest("button")) return;
            e.currentTarget.setPointerCapture(e.pointerId);
            pointer.current = {
              down: performance.now(),
              x: e.clientX,
              y: e.clientY,
              held: false,
            };
            setPaused(true);
          }}
          onPointerUp={(e) => {
            if ((e.target as HTMLElement).closest("button")) return;
            const long = performance.now() - pointer.current.down > 280;
            setPaused(false);
            if (
              !long &&
              Math.abs(e.clientX - pointer.current.x) < 20 &&
              Math.abs(e.clientY - pointer.current.y) < 20
            ) {
              const box = e.currentTarget.getBoundingClientRect();
              moveStory(e.clientX - box.left < box.width * 0.33 ? -1 : 1);
            }
          }}
          onPointerCancel={() => setPaused(false)}
        >
          {active.media && (
            <div
              className="rig-story-backdrop"
              style={{ backgroundImage: `url("${active.media}")` }}
            />
          )}
          <div className="rig-story-picture">{renderMedia(active)}</div>
          <div className="rig-story-top">
            <div className="rig-story-progress" aria-label="快拍进度">
              {storyIds.map((id, index) => (
                <span key={id}>
                  <i
                    style={{
                      width:
                        (index < storyIndex
                          ? 100
                          : index === storyIndex
                            ? progress * 100
                            : 0) + "%",
                    }}
                  />
                </span>
              ))}
            </div>
            <header>
              <button
                className="rig-story-identity"
                onClick={() => {
                  const h = handle(active);
                  closeStory();
                  navigate("个人主页", h);
                }}
              >
                <Avatar name={active.sender} src={avatar(active)} />
                <span>
                  <strong>{handle(active)}</strong>
                  <small>
                    {instagramDate(active, now, archive)}
                    {archive ? " · 精选" : ""}
                  </small>
                </span>
              </button>
              <button
                aria-label={paused ? "继续快拍" : "暂停快拍"}
                onClick={() => setPaused(!paused)}
              >
                {paused ? <Play size={21} /> : <Pause size={21} />}
              </button>
              <button aria-label="关闭快拍" onClick={closeStory}>
                <X size={26} />
              </button>
            </header>
          </div>
          {active.media && <p className="rig-story-caption">{active.body}</p>}
          {paused && <span className="rig-story-paused">已暂停</span>}
          <div className="rig-story-bottom">
            <button
              aria-label="上一条快拍"
              disabled={storyIndex === 0}
              onClick={() => moveStory(-1)}
            >
              <ChevronLeft />
            </button>
            <button
              aria-label={"点赞快拍" + active.title}
              aria-pressed={liked.includes(active.id)}
              onClick={() => toggle(active.id, liked, setLiked)}
            >
              <Heart fill={liked.includes(active.id) ? "#ff3040" : "none"} />
            </button>
            <button aria-label="下一条快拍" onClick={() => moveStory(1)}>
              <ChevronRight />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
