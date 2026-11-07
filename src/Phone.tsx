import { rotateAnonymousRun } from './runtime/anonymousAnalytics';
import { useAnonymousAnalytics } from './runtime/useAnonymousAnalytics';
import {newPlaythrough} from './runtime/newPlaythrough';
import {migrateReview39} from './runtime/review39Migration';
import { EndingPage } from './runtime/EndingPage';
import { withJourney } from './runtime/journeyProgress';
import { EndingLockControl } from './runtime/EndingLockControl';
import { FinalRouteReplay, captureFinalFork } from './runtime/FinalRouteReplay';
import { localAutoReviewTickMs } from './runtime/localAutoReview';
import { BackgroundMusic, MusicApp, MusicMini, EndingMusicControls } from "./runtime/BackgroundMusic";
import { ChapterProgress, captureChapter } from "./runtime/ChapterProgress";
import { migrateStage45 } from "./runtime/stage45";
import { beginEndingLock, canLockForEnding, completeEndingLock, canCloseReunion, closeReunion, reopenReunion,beginFinalClose,completeFinalClose,reviewEnding,beginReunionReview } from "./runtime/lateEnding";
import { reconcileReadNotices, unreadMessages, visibleMessages } from "./runtime/messageRead";
import { restoreWithBackup } from "./runtime/restoreWithBackup";
import { SaveBackup } from "./runtime/SaveBackupPanel";
import { downloadBackup, encodeBackup } from "./runtime/saveBackup";
import { housingCheckpoint } from "./runtime/checkpoint";
import { lifeInteraction } from "./runtime/lifeInteractions";
import { FilmList, Delivery } from "./runtime/LifeApps";
import { storyDatedItem } from "./runtime/storyDates";
import {
  instagramInteraction,
  motorStoryReplies,
} from "./runtime/instagramInteractions";
import { pendingScene } from "./runtime/scenePacing";
import { storyContinuation } from "./runtime/continuation";
import { RoommateMessages, replyThread } from "./runtime/RoommateMessages";
import { StatusGlyph } from "./ios/StatusGlyph";
import { SocialDetail, socialDetailApps } from "./skins/SocialDetails";
import { NativeCalculator } from "./ios/Calculator";
import { HomeLauncher } from "./launcher/HomeLauncher";
import { useDeviceLayout } from "./launcher/layout";
import "./launcher/launcher.css";
import { NativeDetail, nativeDetailApps } from "./ios/Details";
import "./ios/details.css";
import {
  SystemNotifications,
  notificationContent,
} from "./SystemNotifications";
import {
  readLauncherOrigin,
  AppWindow,
  screenOrigin,
} from "./vendor/ios-web/Launcher";
import {
  DeviceLock,
  ControlCenter,
  DeviceKeyboard,
  KeyboardContext,
  NativeSettings,
} from "./DeviceSystem";
import { AppArtwork, hasNativeArtwork } from "./AppArtwork";
import { getFields } from "./fields";
import { catalogSkins } from "./skins/catalog";
import "./skins/skins.css";
import "./ios18.css";
import "./device-system.css";
import "./ios/tokens.css";
import "./ios/reference.css";
import "./ios/status-bar.css";
import { WeChatSkin, WhatsAppSkin } from "./AppSkins";
import { RichText } from "./RichText";
import {
  useEffect,
  useState,
  useRef,
  Suspense,
  type CSSProperties,
  type ReactNode,
} from "react";
import { AnimatePresence } from "motion/react";
import {
  ChevronLeft,
  Plus,
  Search,
  LockKeyhole,
  Heart,
  MessageCircle,
  MoreHorizontal,
  ArrowUp,
  Folder,
  Phone as PhoneIcon,
} from "lucide-react";
import { getApp, type AppPlugin } from "./registry";
import {
  initialRuntime,
  safeMedia,
  type Work,
  type Item,
  type Runtime,
  type UiValue,
} from "./schema";
import { dispatch, choose, visible, advance } from "./engine";
import {
  persistRuntime,
  readSavedRuntime,
  preserveMigrationBackup,
  commitMigratedRuntime,
} from "./persistence";
export function AppIcon({
  id,
  name,
  small = false,
  custom = "",
  date,
  time,
  unread = 0,
}: {
  id: string;
  name?: string;
  small?: boolean;
  custom?: string;
  date?: string;
  time?: string;
  unread?: number;
}) {
  const a = getApp(id);
  const Icon = a.icon;
  return (
    <span className={`app-icon-wrap ${small ? "small" : ""}`}>
      <span className="app-icon" style={{ background: a.color }}>
        {custom ? (
          safeMedia(custom) ? (
            <img src={safeMedia(custom)} alt="自定义图标" />
          ) : (
            <span>{custom.slice(0, 2)}</span>
          )
        ) : hasNativeArtwork(id) ? (
          <AppArtwork id={id} date={date} time={time} />
        ) : (
          <Icon size={small ? 21 : 28} strokeWidth={1.65} />
        )}
      </span>
      {unread > 0 && (
        <b className="app-unread-badge" aria-label={`信息 ${unread} 条未读`}>
          {unread > 99 ? "99+" : unread}
        </b>
      )}
      {name && <span className="app-name">{name}</span>}
    </span>
  );
}
type PhoneProps = Omit<Parameters<typeof PhoneRuntime>[0], "deviceLayout">;
export function Phone(props: PhoneProps) {
  const deviceLayout = useDeviceLayout(props.work, props.creator);
  const normalScope = props.saveKey || props.work.id;
  const [activeScope, setActiveScope] = useState(() => {
    try { const key = localStorage.getItem(normalScope + ":chapter-active");
      return key?.startsWith(normalScope + ":chapter-replay:") ? key : normalScope;
    } catch { return normalScope; }
  });
  const replay = activeScope !== normalScope;
  return (
    <PhoneRuntime key={activeScope} {...props}
      runtime={replay ? undefined : props.runtime}
      onRuntime={replay ? undefined : props.onRuntime}
      saveKey={activeScope} normalScope={normalScope} onReplay={(scope)=>{
        if(scope!==normalScope)rotateAnonymousRun(scope);
        if(scope===normalScope && props.onRuntime)void readSavedRuntime(normalScope).then(row=>{if(row)props.onRuntime?.(row.state);setActiveScope(scope);});
        else setActiveScope(scope);
      }}
      work={deviceLayout.work} deviceLayout={deviceLayout}
    />
  );
}
function PhoneRuntime({
  deviceLayout,
  work,
  creator = false,
  onEdit,
  onAdd,
  onSettings,
  onOpen,
  runtime: external,
  onRuntime,
  saveKey = work.id,
  nameKey,
  normalScope = saveKey,
  onReplay,
}: {
  deviceLayout: ReturnType<typeof useDeviceLayout>;
  work: Work;
  creator?: boolean;
  onEdit?: (app: string, item: Item) => void;
  onAdd?: (app: string) => void;
  onSettings?: () => void;
  onOpen?: (app: string) => void;
  runtime?: Runtime;
  onRuntime?: (s: Runtime) => void;
  saveKey?: string;
  nameKey?: string;
  normalScope?: string;
  onReplay?: (scope: string) => void;
}) {
  const [app, setApp] = useState("");
  const [focusItem, setFocusItem] = useState("");
  const [readingItem, setReadingItem] = useState("");
  const [pendingNotice, setPendingNotice] = useState("");
  const [homeRequest, setHomeRequest] = useState(0);
  const [locked, setLocked] = useState(!creator);
  const [pinOpen, setPinOpen] = useState(false);
  const [quickCamera, setQuickCamera] = useState(false);
  const [keyboard, setKeyboard] = useState(false);
  const [recent, setRecent] = useState<string[]>([]);
  const appSnapshots = useRef(new Map<string, HTMLElement>());
  const [banner, setBanner] = useState("");
  const noticesSeen = useRef<string[]>([]);
  const [contextApp, setContextApp] = useState("");
  const [deviceScale, setDeviceScale] = useState(0.84);
  const shell = useRef<HTMLDivElement>(null);
  const gesture = useRef({ x: 0, y: 0, time: 0, zone: "" });
  const [launchOrigin, setLaunchOrigin] = useState(screenOrigin);

  const beginUnlock = () => {
    setPinError("");
    setQuickCamera(false);
    if (work.phone.passcode) setPinOpen(true);
    else unlock();
  };
  const pressTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const gestureConsumed = useRef(false);
  const [pinError, setPinError] = useState("");
  const [folder, setFolder] = useState("");
  const [panel, setPanel] = useState("");
  const [own, setOwn] = useState(() => initialRuntime(work));
  const [ready, setReady] = useState(creator || !!external);
  const [loadError, setLoadError] = useState("");
  const [blockedSave, setBlockedSave] = useState<Runtime | null>(null);
  const existingForAnalytics=useRef(false);
  const [endingDismissed, setEndingDismissed] = useState(false);
  useEffect(() => {
    const el = shell.current;
    if (!el) return;
    const fit = () => {
      setDeviceScale(
        Math.max(
          0.4,
          Math.min(
            1,
            (el.parentElement!.clientWidth - 24) / 407,
            (window.innerHeight - (creator ? 170 : external ? 150 : 40)) / 866,
          ),
        ),
      );
    };
    const observer = new ResizeObserver(fit);
    observer.observe(el.parentElement!);
    window.addEventListener("resize", fit);
    fit();
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", fit);
    };
  }, [creator, ready]);
  const s = external ?? own;
  useAnonymousAnalytics(work,s,ready,saveKey,normalScope,existingForAnalytics.current,creator||!!external);
  const runtimeRef = useRef(s);
  runtimeRef.current = s;
  const withPlayerName = (next:Runtime):Runtime => {
    const value=work.id==='fridge-light-roommates'?reconcileReadNotices(work,withJourney(next)):next;
    return {...value,ui:{...value.ui,profile:{...value.ui?.profile,playerName:work.phone.owner}}};
  };
  const update = (next: Runtime) => {
    next = withPlayerName(migrateReview39(work,migrateStage45(work, next)));
    runtimeRef.current = next;
    if (!creator) void captureFinalFork(saveKey,next).catch(()=>setLoadError("分岔回看点未能保存，当前进度仍自动保存。"));
    setOwn(next);
    onRuntime?.(next);
    if (!creator && work.id==='fridge-light-roommates') void captureChapter(normalScope,next,saveKey!==normalScope).catch(() => setLoadError("章节检查点未能保存，当前进度仍自动保存。"));
    if (!creator && !external)
      void persistRuntime(saveKey, next).catch(() =>
        setLoadError("存档失败，请导出备份并检查浏览器存储权限。"),
      );
  };
  useEffect(() => {
    let active = true;
    if (creator || external) return;
    void readSavedRuntime(saveKey)
      .then(async (saved) => {
        if (!active) return;
        try {
          const value = withPlayerName(
            saved
              ? (await restoreWithBackup(
                  work,
                  work.phone.owner,
                  {
                    read: async () => saved,
                    backup: (state, target, name) =>
                      preserveMigrationBackup(saveKey, state, target, name),
                    commit: (before, after) =>
                      commitMigratedRuntime(saveKey, before, after),
                  },
                  () => active,
                ))!
              : dispatch(work, initialRuntime(work), "start"),
          );
          if (!active) return;
          existingForAnalytics.current=!!saved;
          runtimeRef.current = value;
          setOwn(value);
          setReady(true);
          if (!saved)
            void persistRuntime(saveKey, value).catch(() =>
              setLoadError("存档失败，请导出备份。"),
            );
        } catch (e) {
          if (!active) return;
          setBlockedSave(saved?.state ?? null);
          setLoadError(
            e instanceof Error ? e.message : "存档读取失败，原进度保留。",
          );
        }
      })
      .catch(() => {
        if (active)
          setLoadError(
            "无法读取本地存档，请检查浏览器存储权限；未覆盖原进度。",
          );
      });
    return () => {
      active = false;
    };
  }, [saveKey, work.id, work.updatedAt, creator, external]);
  useEffect(() => {
    if (creator || !ready) return;
    const interval = setInterval(() => {
      const previous = runtimeRef.current;
      // Only the isolated, local visible-review window can adjust its clock.
      // Timed nodes still run through advance; no unlock/read/choice is injected.
      const tickMs = localAutoReviewTickMs();
      if (!tickMs) return;
      const next = advance(work, previous, tickMs);
      runtimeRef.current = next;
      const changed =
        next.time !== previous.time ||
        next.trace.join() !== previous.trace.join() ||
        (next.scheduled?.length ?? 0) !== (previous.scheduled?.length ?? 0) ||
        (next.scheduled?.length ?? 0) > 0 ||
        Math.floor((next.elapsedMs ?? 0) / 5000) !==
          Math.floor((previous.elapsedMs ?? 0) / 5000);
      if (changed) update(next);
    }, 1000);
    return () => clearInterval(interval);
  }, [creator, ready, work.id, work.updatedAt]);
  useEffect(() => {
    if (s.ui?.messages?.reunionPhase !== "dark") return;
    setLocked(true); setApp(""); setPinOpen(false);
    const timer = setTimeout(() => update(lifeInteraction(work, runtimeRef.current, "reunionLock", "quiet")), 900);
    return () => clearTimeout(timer);
  }, [s.ui?.messages?.reunionPhase]);
  useEffect(() => {
    const phase = s.ui?.messages?.endingPhase;
    if (phase === "reading") { setLocked(false); setApp(""); return; }
    if (phase !== "dark") return;
    setLocked(true); setApp(""); setPinOpen(false);
    const timer = setTimeout(() => update(completeEndingLock(work, runtimeRef.current)), 1300);
    return () => clearTimeout(timer);
  }, [s.ui?.messages?.endingPhase]);
  useEffect(()=>{
    if(s.ui?.messages?.finalPhase!=='dark')return;
    setApp('');setKeyboard(false);setBanner('');
    const timer=setTimeout(()=>update(completeFinalClose(runtimeRef.current)),1000);
    return()=>clearTimeout(timer);
  },[s.ui?.messages?.finalPhase]);
  useEffect(()=>{
    if(!ready||locked||s.ui?.messages?.reviewReunion!==true)return;
    const current=runtimeRef.current;update({...current,ui:{...current.ui,messages:{...current.ui?.messages,reviewReunion:false}}});
    open('messages');setFocusItem('s45-reunion-invite-2');
  },[ready,locked,s.ui?.messages?.reviewReunion]);
  const event = (event: string, target: string) => {
    if (!creator) {
      if (
        event === "read" &&
        roommateStory &&
        ![
          ...Object.values(work.data).flat(),
          ...Object.values(runtimeRef.current.messages).flat(),
        ].some((item) => item.id === target)
      )
        return;
      if (
        event === "continueScene" &&
        pendingScene(work, runtimeRef.current)?.id !== target
      )
        return;
      const next = dispatch(work, runtimeRef.current, event, target);
      const value = event === "read" ? reconcileReadNotices(work, next) : next;
      update(value);
      if (event === "read")
        setBanner((current) =>
          value.notifications.includes(current) ? current : "",
        );
    }
  };
  const captureApp = () => {
    if (!app) return;
    const current = shell.current?.querySelector<HTMLElement>(".app-screen");
    if (!current) return;
    const snapshot = current.cloneNode(true) as HTMLElement;
    snapshot.style.transform = "none";
    snapshot.style.opacity = "1";
    snapshot.style.filter = "none";
    snapshot.style.borderRadius = "0";
    snapshot.querySelectorAll("audio").forEach((el) => el.remove());
    snapshot.querySelectorAll("video").forEach((el) => {
      el.removeAttribute("autoplay");
      el.removeAttribute("src");
    });
    snapshot.querySelectorAll("[id]").forEach((el) => el.removeAttribute("id"));
    appSnapshots.current.set(app, snapshot);
    for (const id of appSnapshots.current.keys())
      if (!recent.includes(id) && id !== app) appSnapshots.current.delete(id);
  };
  const leaveApp = () => {
    if (work.id === "fridge-light-roommates" && readingItem &&
        !work.data.threads?.some(i => i.id === readingItem && i.meta.coreRead === "true"))
      event("read", readingItem);
    setApp("");
    setFocusItem("");
  };
  const open = (id: string) => {
    if (!work.apps.some((a) => a.id === id && a.installed)) return;
    setApp(id);
    setFocusItem("");
    setKeyboard(false);
    setRecent((v) => [id, ...v.filter((a) => a !== id)].slice(0, 8));
    setFolder("");
    setPanel("");
    onOpen?.(id);
    event("openApp", id);
  };
  const openNotice = (text: string) => {
    const notice = notificationContent(text, work.apps);
    if (notice.appId === "messages") {
      const incoming = visibleMessages(work, runtimeRef.current).filter((m) => !m.outgoing && m.title === notice.title);
      const item = unreadMessages(work, runtimeRef.current, notice.title).at(-1) ?? incoming.at(-1);
      open("messages");
      if (item) setFocusItem(item.id);
      return;
    }
    const items = (work.data[notice.appId] ?? []).map(item => storyDatedItem(item, runtimeRef.current)).filter((i) =>
      visible(i, runtimeRef.current),
    );
    const item = items.find(
      (i) =>
        (notice.appId !== "messages" || i.sender === notice.title) &&
        (i.body === notice.body || (i.title && notice.body.includes(i.title))),
    );
    open(notice.appId);
    if (item) setFocusItem(item.id);
  };
  const installedApps = work.apps.filter((a) => a.installed);
  const apps = installedApps.filter((a) => a.visible);
  const unlock = (pin = "") => {
    if (!work.phone.passcode || pin === work.phone.passcode) {
      setLocked(false);
      setPinOpen(false);
      setPinError("");
      event("password", pin);
      if (pendingNotice) {
        openNotice(pendingNotice);
        setPendingNotice("");
      }
    } else {
      setPinError(
        work.id === "fridge-light-roommates" && work.phone.passcode === "0917"
          ? "密码不正确。提示：礼拜四"
          : "密码不正确",
      );
      setPinOpen(true);
    }
  };
  useEffect(() => {
    if (app && !work.apps.some((a) => a.id === app && a.installed)) setApp("");
  }, [app, work.apps]);
  const roommateStory = work.id === "fridge-light-roommates";
  const continuation = storyContinuation(work, s);
  const nextScene = pendingScene(work, s);
  const unreadItems = roommateStory ? unreadMessages(work, s) : undefined;
  const pendingReply = roommateStory ? (s.variables.s29PhotoReady ? "Hendery" : replyThread(work, s.choices)) : "";
  const displayTime = creator ? work.phone.time : s.time || work.phone.time;
  const plugin = getApp(app);
  useEffect(() => {
    const previous = [...noticesSeen.current];
    const added = s.notifications.filter((text) => {
      const index = previous.indexOf(text);
      if (index < 0) return true;
      previous.splice(index, 1);
      return false;
    });
    if (!locked && work.phone.notifications && added.length) {
      const text = added.at(-1) || "";
      const activeThread =
        shell.current?.querySelector<HTMLElement>(".roommate-messages")?.dataset
          .thread;
      const sameThread =
        roommateStory &&
        app === "messages" &&
        notificationContent(text, work.apps).title === activeThread;
      setBanner(sameThread ? "" : text);
    }
    noticesSeen.current = [...s.notifications];
  }, [s.notifications, locked, work.phone.notifications]);
  useEffect(() => {
    if (!banner) return;
    const timer = setTimeout(() => setBanner(""), 4500);
    return () => clearTimeout(timer);
  }, [banner]);
  const dismissNotice = (indices: number[]) =>
    update({
      ...runtimeRef.current,
      notifications: runtimeRef.current.notifications.filter(
        (_, i) => !indices.includes(i),
      ),
    });
  const photoWallpaper = work.phone.wallpaper.startsWith("data:image/")
    ? safeMedia(work.phone.wallpaper)
    : "";
  async function restartStory() {
    if(!onReplay||!confirm("沿用当前名字开启独立新周目？原进度和已解锁记录保留，可随时返回原进度。这不会清除存档。"))return;
    const previous=runtimeRef.current;await persistRuntime(saveKey,previous);await preserveMigrationBackup(saveKey,previous,work.updatedAt,work.phone.owner);
    const fresh=newPlaythrough(work,previous,normalScope);await persistRuntime(fresh.id,fresh.state);
    localStorage.setItem(normalScope+":chapter-active",fresh.id);onReplay(fresh.id);
  }
  const saveControls = !creator ? (
    <SaveBackup
      embedded
      work={work}
      state={s}
      saveKey={saveKey}
      nameKey={nameKey}
      onRestart={restartStory}
      chapters={onReplay ? <ChapterProgress work={work} state={s} scope={saveKey} normalScope={normalScope} replay={saveKey !== normalScope} onReplay={onReplay}/> : undefined}
    />
  ) : undefined;
  if (!ready)
    return (
      <div className="phone-loading">
        <p>{loadError || "正在恢复进度…"}</p>
        {blockedSave && (
          <>
            <button
              onClick={() =>
                downloadBackup(encodeBackup(blockedSave, work.phone.owner))
              }
            >
              导出保留的旧存档
            </button>
            <SaveBackup
              work={work}
              state={blockedSave}
              saveKey={saveKey}
              nameKey={nameKey}
            />
          </>
        )}
      </div>
    );
  return (
    <div
      ref={shell}
      style={{ "--phone-scale": deviceScale } as CSSProperties}
      className={`phone-shell ios18 ${roommateStory ? "roommate-phone" : ""} ${work.phone.theme === "dark" ? "dark-phone" : ""}`}
    >
      <BackgroundMusic endingRoute={String(s.variables.s28EndingPending||s.variables.s45Ending||'')} endingVisible={['dark','reading'].includes(String(s.ui?.messages?.endingPhase))&&s.ui?.messages?.reunionOpen!==true&&s.ui?.messages?.reunionEndCard!==true&&s.ui?.messages?.finalPhase!=='dark'} scope={saveKey} saved={s.ui?.music || {}} commit={(key,value)=>{
        const current=runtimeRef.current;
        update({...current,ui:{...current.ui,music:{...current.ui?.music,[key]:value}}});
      }}>
      <KeyboardContext.Provider value={setKeyboard}>
        <div
          style={
            photoWallpaper
              ? {
                  backgroundImage: `url("${photoWallpaper}")`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                  backgroundRepeat: "no-repeat",
                }
              : undefined
          }
          className={`phone-screen wallpaper-${photoWallpaper ? "photo" : work.phone.wallpaper} ${locked ? "is-locked" : ""} ${app ? "in-app" : ""} ${keyboard ? "keyboard-open" : ""}`}
          data-app={app}
          onDragStart={(e) => e.preventDefault()}
          onPointerDown={(e) => {
            gestureConsumed.current = false;
            const button = (e.target as HTMLElement).closest<HTMLElement>(
              "[data-app-id]",
            );
            if (button) {
              pressTimer.current = setTimeout(() => {
                gestureConsumed.current = true;
                setContextApp(button.dataset.appId || "");
              }, 550);
            }
            const box = e.currentTarget.getBoundingClientRect(),
              x = (e.clientX - box.left) / deviceScale,
              y = (e.clientY - box.top) / deviceScale;
            gesture.current = {
              x,
              y,
              time: Date.now(),
              zone: y < 58 ? "top" : y > 818 ? "bottom" : locked ? "lock" : "",
            };
          }}
          onPointerMove={(e) => {
            if (Math.abs(e.movementX) > 5 || Math.abs(e.movementY) > 5)
              clearTimeout(pressTimer.current);
          }}
          onPointerCancel={() => clearTimeout(pressTimer.current)}
          onPointerUp={(e) => {
            clearTimeout(pressTimer.current);
            const box = e.currentTarget.getBoundingClientRect(),
              y = (e.clientY - box.top) / deviceScale,
              g = gesture.current;
            const dy = y - g.y;
            if (g.zone === "top" && dy > 65)
              setPanel(g.x > 230 ? "control" : "notification");
            else if ((g.zone === "bottom" || g.zone === "lock") && dy < -55) {
              gestureConsumed.current = true;
              if (!locked) captureApp();
              setKeyboard(false);
              if (panel) {
                setPanel("");
              } else if (locked) {
                beginUnlock();
              } else if (g.zone === "bottom" && Date.now() - g.time > 450) {
                captureApp();
                setPanel("switcher");
              } else {
                leaveApp();
                setPanel("");
                setFolder("");
              }
            }
          }}
          onClickCapture={(e) => {
            const target = (e.target as HTMLElement).closest(
              ".home-app-grid button,.dock button",
            );
            if (target) {
              setLaunchOrigin(
                readLauncherOrigin(target as HTMLElement, e.currentTarget),
              );
            }
          }}
        >
          {loadError && (
            <p className="autosave-error" role="alert">
              {loadError}
            </p>
          )}
          {!photoWallpaper && (
            <>
              <div className="wallpaper-orb orb-one" />
              <div className="wallpaper-orb orb-two" />
            </>
          )}
          <div className="status-bar">
            <button
              onClick={() =>
                setPanel(panel === "notification" ? "" : "notification")
              }
              className="status-time"
              aria-label="通知中心"
            >
              {displayTime}
              <StatusGlyph kind="silent" />
            </button>
            <div className="dynamic-island" />
            <button
              className="signals"
              onClick={() => setPanel(panel === "control" ? "" : "control")}
              aria-label="控制中心"
            >
              <StatusGlyph kind="cellular" />
              <StatusGlyph kind="wifi" />
              <span
                className={`ios-battery${work.phone.battery <= 20 ? " low-battery" : ""}`}
              >
                <span style={{ width: `${work.phone.battery}%` }} />
                <b>{work.phone.battery}</b>
              </span>
            </button>
          </div>
          <AnimatePresence mode="wait">
            {locked && !(quickCamera && app === "camera") ? (
              <DeviceLock
                work={
                  s.date
                    ? { ...work, phone: { ...work.phone, date: s.date } }
                    : work
                }
                time={displayTime}
                notices={s.notifications}
                unreadItems={unreadItems}
                onDismiss={dismissNotice}
                pinOpen={pinOpen}
                setPinOpen={setPinOpen}
                error={pinError}
                onUnlock={unlock}
                onOpenNotice={
                  roommateStory
                    ? (text) => {
                        if (work.phone.passcode) {
                          setPendingNotice(text);
                          setPinOpen(true);
                        } else {
                          unlock();
                          openNotice(text);
                        }
                      }
                    : undefined
                }
                onLight={() => setPanel("light")}
                onCamera={() => {
                  setQuickCamera(true);
                  open("camera");
                }}
              />
            ) : app && app !== "appstore" ? (
              <AppWindow
                key={app}
                className={`app-screen engine-${plugin.engine} skin-${app}`}
                creator={creator}
                origin={launchOrigin}
              >
                <AppContent
                  key={`${app}:${focusItem}`}
                  focusItem={focusItem}
                  onReading={setReadingItem}
                  onOpenContact={(id) => {
                    open("contacts");
                    setFocusItem(id);
                  }}
                  app={plugin}
                  name={
                    work.apps.find((a) => a.id === app)?.name ?? plugin.name
                  }
                  items={[
                    ...(work.data[app] ?? []),
                    ...(s.messages[app] ?? []),
                  ].map((item) =>
                    roommateStory ? storyDatedItem(item, s) : item,
                  )}
                  creator={creator}
                  state={s}
                  onStoryEvent={(event, target) => {
                    const before = runtimeRef.current;
                    const next = lifeInteraction(work, before, event, target);
                    if (next === before) return;
                    update(next);
                  }}
                  onStoryAction={(event, target) => {
                    const before = runtimeRef.current;
                    const next = instagramInteraction(
                      work,
                      before,
                      event,
                      target,
                    );
                    if (next === before) return false;
                    update(next);
                    if (event === "igStoryReply") {
                      open("messages");
                      setFocusItem(target.split("\t")[1] + "-out-1");
                    }
                    return true;
                  }}
                  onChoose={(target) =>
                    update(choose(work, runtimeRef.current, target))
                  }
                  onRead={(id) => event("read", id)}
                  onEdit={(item) => onEdit?.(app, item)}
                  onAdd={() => onAdd?.(app)}
                  onBack={leaveApp}
                  onSettings={onSettings}
                  saveControls={saveControls}
                  onUi={(key, value) => {
                    const current = runtimeRef.current;
                    update(
                      dispatch(
                        work,
                        {
                          ...current,
                          ui: {
                            ...current.ui,
                            [app]: { ...current.ui?.[app], [key]: value },
                          },
                        },
                        "variable",
                        `ui:${app}:${key}`,
                      ),
                    );
                  }}
                  work={work}
                />
              </AppWindow>
            ) : (
              <HomeLauncher
                key={
                  "home-" + homeRequest + (app === "appstore" ? "store" : "")
                }
                storeOpen={app === "appstore"}
                closeStore={() => setApp("")}
                work={work}
                layout={deviceLayout.layout}
                change={deviceLayout.change}
                importLayout={deviceLayout.importLayout}
                error={deviceLayout.error}
                open={open}
                onFolder={setFolder}
                search={() => setPanel("search")}
                time={displayTime}
                icon={(a, small) => (
                  <AppIcon
                    key={a.id}
                    id={a.id}
                    name={small ? undefined : a.name}
                    small={small}
                    custom={a.icon}
                    unread={
                      a.id === "messages" ? unreadMessages(work, s).length : 0
                    }
                    date={s.date || work.phone.date}
                    time={s.time}
                  />
                )}
                clearApp={(id) =>
                  update({
                    ...runtimeRef.current,
                    messages: Object.fromEntries(
                      Object.entries(runtimeRef.current.messages).filter(
                        ([app]) => app !== id,
                      ),
                    ),
                  })
                }
              />
            )}
          </AnimatePresence>
          {folder && (
            <div className="folder-overlay" onClick={() => setFolder("")}>
              <h2>{folder}</h2>
              <div className="folder-apps" onClick={(e) => e.stopPropagation()}>
                {apps
                  .filter((a) => a.folder === folder)
                  .map((a) => (
                    <button key={a.id} onClick={() => open(a.id)}>
                      <AppIcon id={a.id} name={a.name} custom={a.icon} />
                    </button>
                  ))}
              </div>
              <button className="glass-btn" onClick={() => setFolder("")}>
                关闭文件夹
              </button>
            </div>
          )}
          {panel === "control" && (
            <ControlCenter
              battery={work.phone.battery}
              network={work.phone.network}
              close={() => setPanel("")}
            />
          )}
          {panel && panel !== "control" && panel !== "switcher" && (
            <div
              className={`system-panel ${panel === "light" ? "flash-on" : ""}`}
            >
              <button className="panel-close" onClick={() => setPanel("")}>
                关闭 <ChevronLeft size={14} />
              </button>
              {panel === "notification" ? (
                <>
                  <h2>通知中心</h2>
                  {work.phone.notifications && s.notifications.length ? (
                    <SystemNotifications
                      notices={s.notifications}
                      unreadItems={unreadItems}
                      apps={work.apps}
                      onOpen={(text) => {
                        setPanel("");
                        if (roommateStory) {
                          if (locked && work.phone.passcode) {
                            setPendingNotice(text);
                            setPinOpen(true);
                            setPanel("");
                          } else openNotice(text);
                          return;
                        }
                        if (locked) beginUnlock();
                        else if (installedApps.some((a) => a.id === "messages"))
                          open("messages");
                      }}
                      onDismiss={dismissNotice}
                    />
                  ) : (
                    <p>没有新通知</p>
                  )}
                </>
              ) : panel === "search" ? (
                <>
                  <h2>搜索 App</h2>
                  <AppSearch apps={installedApps} open={open} />
                </>
              ) : (
                <h2>手电筒已打开</h2>
              )}
            </div>
          )}
          {!creator && !roommateStory && s.choices.length > 0 && !locked && (
            <div className="story-overlay">
              <span className="eyebrow">傳送訊息</span>
              <h3>你會怎麼回？</h3>
              {s.choices.map((c) => (
                <button
                  key={c.target}
                  aria-label={`傳送訊息：${c.label}`}
                  onClick={() => update(choose(work, s, c.target))}
                >
                  {c.label}
                  <ArrowUp size={15} />
                </button>
              ))}
            </div>
          )}
          {!creator &&
            !locked &&
            !app &&
            s.variables.openingPaused === true && (
              <div className="opening-review-note" role="status">
                <strong>
                  {s.variables.viewingReviewComplete
                    ? "搬家时间约好了"
                    : "约好了"}
                </strong>
                <span>
                  租房和搬家时间已确认。本轮先到这里，可以继续逛逛手机。
                </span>
              </div>
            )}
          {!creator &&
            !locked &&
            !app &&
            (work.variables.releaseStage2 === true ||
              work.variables.releaseStage3 === true) &&
            s.variables.releaseComplete === true &&
            (s.ui?.release?.updateHintShown === true ? (
              <p className="release-update-hint" role="status">
                目前已更新至这里，等待后续更新。
              </p>
            ) : (
              <button
                className="roommate-continuation"
                aria-label="继续到下一日期"
                onClick={() =>
                  update({
                    ...runtimeRef.current,
                    ui: {
                      ...runtimeRef.current.ui,
                      release: {
                        ...runtimeRef.current.ui?.release,
                        updateHintShown: true,
                      },
                    },
                  })
                }
              >
                继续到下一日期
              </button>
            ))}
          {!creator && !locked && !app && nextScene && (
            <button
              className="roommate-continuation"
              aria-label="继续到下一段日常"
              onClick={() => {
                event("continueScene", nextScene.id);
              }}
            >
              <span>这会儿可以先逛逛手机</span>
              <strong>
                {nextScene.label} · {nextScene.date} {nextScene.time}
              </strong>
            </button>
          )}
          {!creator && !locked && app !== "settings" && continuation && !readingItem && !banner && (
            <button
              className={`roommate-continuation ${app ? "in-app" : ""}`}
              aria-label={`打开未读内容：${continuation.item.title}`}
              onClick={() => {
                open(continuation.appId);
                setFocusItem(continuation.item.id);
                // Opening a record is navigation; its reader confirms completion.
              }}
            >
              <span>
                {work.apps.find((a) => a.id === continuation.appId)?.name} ·
                未读
              </span>
              <strong>{continuation.item.title}</strong>
              <span>{continuation.item.body.slice(0, 42)}</span>
            </button>
          )}
          {!creator &&
            pendingReply &&
            !locked &&
            app !== "messages" &&
            app !== "settings" &&
            !(app === "instagram" && readingItem) && (
              <button
                className="roommate-reply-link"
                onClick={() => {
                  open("messages");
                  // Give a reopened Messages window an explicit conversation key,
                  // even when its previous exit animation is still mounted.
                  setFocusItem(
                    work.data.messages.find((m) => m.title === pendingReply)
                      ?.id ?? "",
                  );
                }}
              >
                {s.variables.initiating ? "找" : "回复"} {pendingReply}
                {s.variables.initiating ? "聊聊" : ""}
              </button>
            )}
          {!creator && !locked && !app && canCloseReunion(s) && !s.ui?.messages?.reunionEndCard &&
            <EndingLockControl onLock={() => {
              setKeyboard(false); setApp(""); setBanner("");
              update(closeReunion(runtimeRef.current));
            }}/>}
          {!creator && s.ui?.messages?.endingPhase==='reading' && s.ui?.messages?.reunionOpen!==true && !s.ui?.messages?.reunionEndCard && <EndingMusicControls/>}
          {!creator && s.ui?.messages?.reunionEndCard === true && <div className="reunion-end-card" role="region" aria-label="礼拜四完">
            <h2>礼拜四</h2><p>完</p><p>感谢游玩</p>
            <button onClick={() => {
              update(reopenReunion(runtimeRef.current)); setLocked(false);
              open("messages"); setFocusItem(runtimeRef.current.variables.s45ReunionStarted ? "s45-reunion-invite-2" : "");
            }}>回看手机</button>
            <button onClick={() => {
              update(reviewEnding(runtimeRef.current));setEndingDismissed(false);setLocked(false);setApp('');
            }}>回看结局</button>
          </div>}
          {!creator && !locked && !app && canLockForEnding(s) && <EndingLockControl soundtrack onLock={() => {
            setBanner(""); update(beginEndingLock(runtimeRef.current));
          }}/>}
          {!creator && !locked && s.endings.length > 0 && s.ui?.messages?.endingPhase === "browse" && s.ui?.messages?.reunionOpen !== true && <button className="story-lock-hint" onClick={() => {
            const current = runtimeRef.current; setEndingDismissed(false); update({ ...current, ui: { ...current.ui, messages: { ...current.ui?.messages, endingPhase: "reading" } } });
          }}>查看结局</button>}
          {!creator && s.endings.length>0 && !endingDismissed &&
            s.ui?.messages?.endingPhase!=='browse' && !locked &&
            s.ui?.messages?.reunionOpen!==true && !s.ui?.messages?.reunionEndCard &&
            s.ui?.messages?.finalPhase!=='dark' && (
              s.variables.s45Ending==='A'||s.variables.s45Ending==='B' ?
              <EndingPage key={String(s.variables.s45Ending)} body={s.endings[s.endings.length-1]} route={s.variables.s45Ending}
                read={s.ui?.messages?.['endingRead:'+s.variables.s45Ending]===true}
                onRead={()=>{const current=runtimeRef.current;update({...current,ui:{...current.ui,messages:{...current.ui?.messages,['endingRead:'+current.variables.s45Ending]:true}}});}}
                onFinish={()=>{setApp('');update(beginFinalClose(runtimeRef.current,runtimeRef.current.variables.s45Ending==='A'?'A':'B'));}}
                onReunion={()=>{update(beginReunionReview(runtimeRef.current));setLocked(true);setApp('');}}
                other={<FinalRouteReplay work={work} state={s} scope={saveKey} normalScope={normalScope} onReplay={onReplay}/>}/>
              : <div className="story-overlay ending"><h2>什么都没有发生</h2><p>{s.endings[s.endings.length-1].split('\n').slice(1).join('\n').trim()}</p>
                {roommateStory&&<button onClick={()=>{if(!confirm('返回入住选择？此选择之后的剧情会重置，名字保留。'))return;update(housingCheckpoint(work,s));setApp('');}}>返回是否入住的选择</button>}
                <button onClick={()=>{setEndingDismissed(true);setApp('');}}>返回手机</button>
              </div>
            )}
          {!creator && s.incomingCall && (
            <div className="incoming-call-screen">
              <small>
                {s.incomingCall.status === "ringing" ? "来电" : "通话中"} ·
                作品内模拟
              </small>
              <div className="incoming-avatar">
                {s.incomingCall.caller.slice(0, 1)}
              </div>
              <h2>{s.incomingCall.caller}</h2>
              {s.incomingCall.status === "answered" &&
                (() => {
                  const record = work.data.phone?.find(
                    (i) => i.id === s.incomingCall?.target,
                  );
                  return record?.kind === "audio" && safeMedia(record.media) ? (
                    <audio controls src={safeMedia(record.media)} />
                  ) : (
                    <p>这是一通虚构来电。</p>
                  );
                })()}
              <div className="incoming-actions">
                <button
                  className="decline-call"
                  onClick={() => {
                    const call = runtimeRef.current.incomingCall;
                    if (call)
                      update(
                        dispatch(
                          work,
                          { ...runtimeRef.current, incomingCall: null },
                          call.status === "ringing"
                            ? "callDeclined"
                            : "callEnded",
                          call.target || call.caller,
                        ),
                      );
                  }}
                >
                  <PhoneIcon size={25} />
                  <span>
                    {s.incomingCall.status === "ringing" ? "拒接" : "挂断"}
                  </span>
                </button>
                {s.incomingCall.status === "ringing" && (
                  <button
                    className="accept-call"
                    onClick={() => {
                      const call = runtimeRef.current.incomingCall;
                      if (call)
                        update(
                          dispatch(
                            work,
                            {
                              ...runtimeRef.current,
                              incomingCall: { ...call, status: "answered" },
                            },
                            "callAnswered",
                            call.target || call.caller,
                          ),
                        );
                    }}
                  >
                    <PhoneIcon size={25} />
                    <span>接听</span>
                  </button>
                )}
              </div>
            </div>
          )}
          {banner && !locked && (
            <button
              className="device-banner"
              onClick={() => {
                setBanner("");
                if (roommateStory) openNotice(banner);
                else setPanel("notification");
              }}
            >
              <AppIcon
                id={notificationContent(banner, work.apps).appId}
                small
              />
              <span>
                <strong>{notificationContent(banner, work.apps).title}</strong>
                <span>{notificationContent(banner, work.apps).body}</span>
              </span>
            </button>
          )}
          {panel === "switcher" && (
            <div className="device-switcher">
              <div className="switcher-cards">
                {recent
                  .filter(
                    (id) =>
                      installedApps.some((a) => a.id === id) &&
                      appSnapshots.current.has(id),
                  )
                  .map((id) => (
                    <button
                      className="recent-app-card"
                      key={id}
                      onClick={() => open(id)}
                    >
                      <span className="recent-app-label">
                        <AppIcon id={id} small />
                        <strong>
                          {work.apps.find((a) => a.id === id)?.name}
                        </strong>
                      </span>
                      <span className="recent-app-window">
                        <span
                          className="recent-app-snapshot"
                          aria-hidden="true"
                          inert
                          ref={(el) => {
                            const snapshot = appSnapshots.current.get(id);
                            if (el && snapshot)
                              el.replaceChildren(snapshot.cloneNode(true));
                          }}
                        />
                      </span>
                    </button>
                  ))}
              </div>
              <button className="switcher-done" onClick={() => setPanel("")}>
                完成
              </button>
            </div>
          )}
          {contextApp && (
            <div
              className="home-context-shade"
              onClick={() => setContextApp("")}
            >
              <div className="home-context-menu">
                <AppIcon id={contextApp} />
                <strong>
                  {work.apps.find((a) => a.id === contextApp)?.name}
                </strong>
                <button
                  onClick={() => {
                    open(contextApp);
                    setContextApp("");
                  }}
                >
                  打开 App
                </button>
                <button
                  onClick={() => {
                    setContextApp("");
                    setPanel("search");
                  }}
                >
                  在 App 库中查看
                </button>
                <button onClick={() => setContextApp("")}>取消</button>
              </div>
            </div>
          )}
          {keyboard && <DeviceKeyboard close={() => setKeyboard(false)} />}
          {loadError && (
            <button className="runtime-error" onClick={() => setLoadError("")}>
              {loadError}
            </button>
          )}
          <button
            className="home-indicator"
            aria-label="返回桌面"
            onClick={() => {
              if (gestureConsumed.current) return;
              if (locked) {
                beginUnlock();
                return;
              }
              captureApp();
              setHomeRequest((n) => n + 1);
              setKeyboard(false);
              leaveApp();
              setFolder("");
              setPanel("");
            }}
          />
          {!creator && !locked && app !== "music" && <MusicMini open={()=>open("music")}/>}
          {s.ui?.messages?.reunionPhase === "dark" && <div className="reunion-blackout" aria-label="锁屏过渡"/>}
          {(s.ui?.messages?.endingPhase === "dark" || s.ui?.messages?.finalPhase === "dark") && <div className="ending-blackout" aria-label="锁上手机过渡"/>}
          {saveKey !== normalScope && onReplay && !locked && <button className="chapter-return" onClick={()=>{
            localStorage.removeItem(normalScope+":chapter-active"); onReplay(normalScope);
          }}>返回原进度</button>}
          <div className="screen-dimmer" />
          <div className="hardware-reflection" />
        </div>
      </KeyboardContext.Provider>
      </BackgroundMusic>
    </div>
  );
}
function AppSearch({
  apps,
  open,
}: {
  apps: Work["apps"];
  open: (id: string) => void;
}) {
  const [q, set] = useState("");
  return (
    <>
      <input
        autoFocus
        value={q}
        placeholder="App 名称"
        onChange={(e) => set(e.target.value)}
      />
      {apps
        .filter((a) => a.name.toLowerCase().includes(q.toLowerCase()))
        .map((a) => (
          <button
            className="search-result"
            key={a.id}
            onClick={() => open(a.id)}
          >
            <AppIcon id={a.id} small />
            {a.name}
          </button>
        ))}
    </>
  );
}
function Media({ item }: { item: Item }) {
  const src = safeMedia(item.media);
  return src ? (
    item.kind === "audio" ? (
      <audio controls src={src} />
    ) : item.kind === "video" ? (
      <video controls playsInline src={src} />
    ) : (
      <img loading="lazy" src={src} alt={item.title} />
    )
  ) : (
    <div
      className={`original-art art-${item.id.includes("ticket") ? "ticket" : "rain"}`}
    >
      <span>
        {item.id.includes("ticket") ? "城南 / SOUTHBOUND" : "after the rain"}
      </span>
      <strong>{item.id.includes("ticket") ? "09 · 01" : "雨 后"}</strong>
      <small>
        {item.id.includes("ticket")
          ? "16:30 · 一张未完成的约定"
          : "a little moment of quiet"}
      </small>
    </div>
  );
}
function AppContent({
  app,
  name,
  items,
  creator,
  state,
  onRead,
  onEdit,
  onAdd,
  onBack,
  onSettings,
  saveControls,
  onUi,
  work,
  onChoose,
  focusItem,
  onReading,
  onOpenContact,
  onStoryEvent,
  onStoryAction,
}: {
  onStoryAction?: (event: string, target: string) => boolean;
  onStoryEvent?: (event: string, target: string) => void;
  onOpenContact?: (id: string) => void;
  onReading?: (id: string) => void;
  focusItem?: string;
  app: AppPlugin;
  name: string;
  items: Item[];
  creator: boolean;
  state: Runtime;
  onRead: (id: string) => void;
  onEdit: (item: Item) => void;
  onAdd: () => void;
  onBack: () => void;
  onSettings?: () => void;
  saveControls?: ReactNode;
  onUi?: (key: string, value: UiValue) => void;
  work: Work;
  onChoose: (target: string) => void;
}) {
  const [detail, setDetail] = useState<Item | null>(
    app.id === "threads" ||
      app.id === "messages" ||
      (app.id === "instagram" && work.id === "fridge-light-roommates")
      ? null
      : (items.find((i) => i.id === focusItem) ?? null),
  );
  useEffect(() => {
    if (app.id === "threads") return;
    onReading?.(detail?.id ?? "");
    return () => onReading?.("");
  }, [detail?.id, onReading, app.id]);
  const [thread, setThread] = useState("");
  const [tab, setTab] = useState(app.tabs[0]);
  const [q, setQ] = useState("");
  const [pw, setPw] = useState("");
  const [unlocks, setUnlocks] = useState<string[]>([]);
  const [pwError, setPwError] = useState("");
  const [likes, setLikes] = useState<string[]>([]);
  const shown = items
    .filter((i) => creator || visible(i, state))
    .filter((i) =>
      (i.title + i.body + i.sender).toLowerCase().includes(q.toLowerCase()),
    );
  const filtered =
    tab === "收藏"
      ? shown.filter((i) => i.favorite)
      : tab === app.tabs[0]
        ? shown
        : shown.filter((i) => i.folder === tab);
  const read = (i: Item) => {
    if (creator) {
      onEdit(i);
      return;
    }
    setDetail(i);
    if (
      work.id !== "fridge-light-roommates" &&
      (!i.password || unlocks.includes(i.id))
    )
      onRead(i.id);
  };
  const chats = [...new Set(shown.map((i) => i.title))];
  const back = () => {
    if (detail) {
      if (
        work.id === "fridge-light-roommates" &&
        (!detail.password || unlocks.includes(detail.id))
      )
        onRead(detail.id);
      setDetail(null);
    } else if (thread) setThread("");
    else onBack();
  };
  if (work.id === "fridge-light-roommates" && !creator && app.id === "music") return <MusicApp back={onBack}/>;
  if (
    work.id === "fridge-light-roommates" &&
    !creator &&
    (app.id === "netflix" || app.id === "delivery")
  ) {
    const Component = app.id === "netflix" ? FilmList : Delivery;
    return (
      <Component
        items={shown}
        state={state}
        onEvent={(e, t) => onStoryEvent?.(e, t)}
        onUi={onUi}
        onBack={onBack}
      />
    );
  }
  if (work.id === "fridge-light-roommates" && app.id === "messages" && !creator)
    return (
      <RoommateMessages
        items={shown}
        state={state}
        work={work}
        onRead={onRead}
        onChoose={onChoose}
        onOpenContact={onOpenContact}
        initialThread={items.find((i) => i.id === focusItem)?.title}
        onDraft={(id) => onUi?.("replyDraft", id)}
        onReaction={(id, reaction) => {
          onUi?.("reaction:" + id, reaction);
          if (reaction) onStoryEvent?.("reactMessage", id);
        }}
        onStoryEvent={onStoryEvent}
        onBack={onBack}
      />
    );
  const Skin =
    app.id === "wechat"
      ? WeChatSkin
      : app.id === "whatsapp"
        ? WhatsAppSkin
        : (catalogSkins[app.id as keyof typeof catalogSkins] ?? null);
  const detailView = detail ? (
    <div className="phone-content detail-content">
      {detail.password && !creator && !unlocks.includes(detail.id) ? (
        <div className="locked-note">
          <LockKeyhole size={36} />
          <h3>这条内容已锁定</h3>
          <input
            type="password"
            placeholder="内容密码"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
          />
          <button
            onClick={() => {
              if (pw === detail.password) {
                setUnlocks([...unlocks, detail.id]);
                onRead(detail.id);
                setPwError("");
              } else setPwError("密码不正确");
            }}
          >
            解锁内容
          </button>
          <small>{pwError}</small>
        </div>
      ) : (
        <>
          <small className="detail-meta">
            {detail.time} · {detail.sender}
          </small>
          <h2>{detail.title}</h2>
          {(detail.media || ["media", "social"].includes(app.engine)) && (
            <Media item={detail} />
          )}
          <RichText value={detail.richText} fallback={detail.body} />
          <dl className="item-metadata">
            {getFields(app.id)
              .filter((f) => detail.meta?.[f.key])
              .map((f) => (
                <div key={f.key}>
                  <dt>{f.label}</dt>
                  <dd>{detail.meta[f.key]}</dd>
                </div>
              ))}
          </dl>
          {detail.folder && (
            <span className="folder-label">
              <Folder size={12} />
              {detail.folder}
            </span>
          )}
          {detail.comments.map((c, i) => (
            <p key={i} className="comment">
              {c}
            </p>
          ))}
        </>
      )}
    </div>
  ) : null;
  if (Skin)
    return (
      <>
        <div className="catalog-slot" hidden={!!detail}>
          <Suspense fallback={<div className="catalog-loading">正在打开…</div>}>
            <Skin
              onStoryAction={onStoryAction}
              storyReplies={(id) => motorStoryReplies(work, state, id)}
              focusItem={focusItem}
              deferRead={work.id === "fridge-light-roommates"}
              onReading={onReading}
              appId={app.id}
              owner={work.phone.owner}
              virtualTime={state.time}
              virtualDate={state.date}
              ui={state.ui?.[app.id]}
              onUi={creator ? undefined : onUi}
              name={name}
              items={shown}
              creator={creator}
              onRead={onRead}
              onItem={read}
              onAdd={onAdd}
              onBack={onBack}
              thread={thread}
              onThread={setThread}
            />
          </Suspense>
        </div>
        {detail &&
          (socialDetailApps.has(app.id) &&
          (!detail.password || unlocks.includes(detail.id)) ? (
            <SocialDetail
              app={app.id}
              item={detail}
              back={back}
              owner={work.phone.owner}
              ui={state.ui?.[app.id]}
              onUi={onUi}
            />
          ) : nativeDetailApps.has(app.id) &&
            (!detail.password || unlocks.includes(detail.id)) ? (
            <NativeDetail app={app.id} item={detail} back={back} />
          ) : (
            <>
              <div className="app-nav">
                <button aria-label="返回" onClick={back}>
                  <ChevronLeft size={23} />
                </button>
                <strong>{detail.title}</strong>
                <span />
              </div>
              {detailView}
            </>
          ))}
      </>
    );
  return (
    <>
      <div className="app-nav">
        <button onClick={back} aria-label="返回">
          <ChevronLeft size={23} />
          {detail || thread ? "返回" : ""}
        </button>
        <strong>{thread || name}</strong>
        <button
          onClick={
            creator
              ? onAdd
              : () =>
                  document
                    .querySelector<HTMLInputElement>(
                      ".app-screen .phone-search input",
                    )
                    ?.focus()
          }
          aria-label={creator ? "新增内容" : "搜索内容"}
        >
          {creator ? <Plus size={22} /> : <Search size={20} />}
        </button>
      </div>
      {app.id === "settings" && !detail ? (
        <NativeSettings
          work={work}
          items={items}
          creator={creator}
          onItem={read}
          onSettings={onSettings}
          saveControls={saveControls}
        />
      ) : app.id === "calculator" && !detail ? (
        <NativeCalculator
          items={shown}
          onRead={read}
          ui={state.ui?.[app.id]}
          onUi={onUi}
        />
      ) : detail ? (
        detailView
      ) : app.engine === "messaging" && thread ? (
        <div className="chat-content">
          <div className="chat-time">2026 年 9 月 1 日</div>
          {shown
            .filter((i) => i.title === thread)
            .map((i) => (
              <button
                key={i.id}
                className={`message-row ${i.outgoing ? "outgoing" : ""}`}
                onClick={() => (creator ? onEdit(i) : onRead(i.id))}
              >
                <span className="avatar">{i.sender.slice(0, 1)}</span>
                <span className="bubble">
                  {i.kind === "image" ||
                  i.kind === "audio" ||
                  i.kind === "video" ? (
                    <Media item={i} />
                  ) : i.kind === "transfer" ? (
                    <span className="transfer">
                      ¥ {i.body}
                      <small>虚构转账记录</small>
                    </span>
                  ) : (
                    i.body
                  )}
                  <small>
                    {i.time.slice(-5)} {i.read ? "✓✓" : ""}
                  </small>
                  {creator && (i.hidden || i.unlock) && (
                    <LockKeyhole size={12} />
                  )}
                </span>
              </button>
            ))}
          {creator ? (
            <button className="chat-compose" onClick={onAdd}>
              ＋ 添加一条消息
            </button>
          ) : (
            <div className="chat-compose muted">
              根据剧情推进，互动回复将在这里出现。
            </div>
          )}
        </div>
      ) : (
        <div
          className={`phone-content ${app.engine === "social" ? "feed-content" : ""}`}
        >
          {app.engine !== "media" && (
            <div className="phone-search">
              <Search size={15} />
              <input
                placeholder={`搜索${name}`}
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
          )}
          {app.engine === "messaging" ? (
            chats.map((t) => {
              const list = shown.filter((i) => i.title === t),
                last = list[list.length - 1];
              return (
                <button
                  className="contact-row"
                  key={t}
                  onClick={() => {
                    setThread(t);
                    onRead(t);
                  }}
                >
                  <span className="avatar" style={{ background: app.color }}>
                    {t.slice(0, 1)}
                  </span>
                  <span>
                    <strong>{t}</strong>
                    <p>{last.body}</p>
                  </span>
                  <small>{last.time.slice(-5)}</small>
                </button>
              );
            })
          ) : app.engine === "media" ? (
            <>
              <div className="media-heading">
                <h1>{tab}</h1>
                <p>{filtered.length} 个故事片段</p>
              </div>
              <div className="media-grid">
                {filtered.map((i) => (
                  <button key={i.id} onClick={() => read(i)}>
                    <Media item={i} />
                    <span>
                      {i.title} {creator && i.hidden ? "· 隐藏" : ""}
                    </span>
                  </button>
                ))}
              </div>
            </>
          ) : app.engine === "social" ? (
            filtered.map((i) => (
              <article className="social-post" key={i.id}>
                <div className="post-author">
                  <span className="avatar" style={{ background: app.color }}>
                    {i.sender.slice(0, 1)}
                  </span>
                  <div>
                    <strong>{i.sender}</strong>
                    <small>{i.time}</small>
                  </div>
                  <button aria-label="查看帖子详情" onClick={() => read(i)}>
                    <MoreHorizontal size={20} />
                  </button>
                </div>
                <button className="post-image" onClick={() => read(i)}>
                  <Media item={i} />
                </button>
                <div className="post-actions">
                  <button
                    aria-label="虚构点赞"
                    onClick={() =>
                      setLikes(
                        likes.includes(i.id)
                          ? likes.filter((id) => id !== i.id)
                          : [...likes, i.id],
                      )
                    }
                  >
                    <Heart
                      size={22}
                      fill={likes.includes(i.id) ? "#d67670" : "none"}
                    />
                  </button>
                  <button aria-label="查看评论" onClick={() => read(i)}>
                    <MessageCircle size={22} />
                  </button>
                  <small>
                    {i.likes + (likes.includes(i.id) ? 1 : 0)} 次虚构喜欢
                  </small>
                </div>
                <button className="post-text" onClick={() => read(i)}>
                  <strong>{i.title}</strong>
                  <p>{i.body}</p>
                </button>
              </article>
            ))
          ) : (
            filtered.map((i) => (
              <button
                key={i.id}
                className={`record-row ${app.engine === "document" ? "document-row" : ""}`}
                onClick={() => read(i)}
              >
                <div className="record-symbol">
                  {app.engine === "records" ? (
                    <app.icon size={20} />
                  ) : (
                    <span>{i.title.slice(0, 1)}</span>
                  )}
                </div>
                <div>
                  <strong>{i.title}</strong>
                  <p>{i.body.split("\n")[0]}</p>
                  <small>
                    {i.time} {i.folder && `· ${i.folder}`}
                  </small>
                </div>
                {i.password || i.hidden ? (
                  <LockKeyhole size={14} />
                ) : (
                  <ChevronLeft className="chevron-right" size={16} />
                )}
              </button>
            ))
          )}
          {!filtered.length && app.engine !== "messaging" && (
            <div className="empty-app">
              <app.icon size={36} />
              <h3>这一页还很安静</h3>
              <p>
                {creator
                  ? "添加属于这个 App 的故事内容。"
                  : "暂时没有可浏览的内容。"}
              </p>
            </div>
          )}
          {creator && (
            <button className="phone-add" onClick={onAdd}>
              <Plus size={15} />
              添加
              {app.engine === "messaging"
                ? "聊天"
                : app.engine === "social"
                  ? "帖子"
                  : app.engine === "media"
                    ? "素材"
                    : "内容"}
            </button>
          )}
        </div>
      )}
      {!detail &&
        !thread &&
        app.id !== "calculator" &&
        app.id !== "settings" && (
          <div className="app-tabs">
            {app.tabs.map((t, i) => (
              <button
                key={t}
                className={tab === t ? "selected" : ""}
                onClick={() => setTab(t)}
              >
                {i === 0 ? (
                  <MessageCircle size={17} />
                ) : i === 1 ? (
                  <Search size={17} />
                ) : (
                  <UsersIcon />
                )}
                <span>{t}</span>
              </button>
            ))}
          </div>
        )}
    </>
  );
}
function UsersIcon() {
  return <PhoneIcon size={17} />;
}
