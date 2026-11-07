import { useState } from "react";
import { motion } from "motion/react";
import { X } from "lucide-react";
import { AppArtwork } from "./AppArtwork";
import type { Item, Work } from "./schema";
import { groupedNotifications } from "./notifications";
export { notificationContent } from "./notifications";
export function SystemNotifications({
  notices,
  apps,
  onOpen,
  onDismiss,
  unreadItems,
  compact = false,
}: {
  notices: string[];
  apps: Work["apps"];
  onOpen: (text: string) => void;
  onDismiss: (indices: number[]) => void;
  unreadItems?: Item[];
  compact?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const entries = groupedNotifications(notices, apps, unreadItems);
  const shown = compact && !expanded ? entries.slice(0, 1) : entries;
  return (
    <div
      className={
        "device-notices " +
        (compact && !expanded && entries.length > 1 ? "notice-stacked" : "")
      }
    >
      <div className="notice-cards">
        {shown.map((n) => {
          return (
            <motion.div
              layout
              className="device-notice"
              key={n.appId + "::" + n.title + (n.appId === "messages" ? "" : "::" + n.body)}
              initial={{ opacity: 0, y: 35, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.3}
              onDragEnd={(_, info) => {
                if (info.offset.x < -80) onDismiss(n.indices);
              }}
            >
              <button className="notice-open" onClick={() => onOpen(n.text)}>
                <span className="notice-app-art">
                  <AppArtwork id={n.appId} />
                </span>
                <span className="notice-copy">
                  <strong>{n.title}{n.count > 1 && <small className="notice-unread-count">{n.count} 条未读</small>}</strong>
                  <span>{n.body}</span>
                </span>
                <time>现在</time>
              </button>
              {!compact && (
                <button
                  className="notice-remove"
                  aria-label="清除通知"
                  onClick={() => onDismiss(n.indices)}
                >
                  <X size={15} />
                </button>
              )}
            </motion.div>
          );
        })}
      </div>
      {compact && entries.length > 1 && (
        <button
          className="notice-expand"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? "收起" : entries.length + " 组通知"}
        </button>
      )}
    </div>
  );
}
