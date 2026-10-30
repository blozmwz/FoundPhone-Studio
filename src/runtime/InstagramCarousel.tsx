import { useRef } from "react";
import { ChevronLeft, ChevronRight, Layers } from "lucide-react";
import type { Item } from "../schema";
import type { SkinProps } from "../AppSkins";
import { safeMedia } from "../schema";
import { useSkinState } from "../skinState";

// Album pages are ordinary authored media records, never executable imports.
export function instagramSlides(item: Item, available: Item[]) {
  const extra = (item.meta.albumItems || "")
    .split(",")
    .map((id) => available.find((i) => i.id === id.trim()))
    .filter((i): i is Item => !!i && !!safeMedia(i.media));
  return [item, ...extra].filter((i) => !!safeMedia(i.media));
}
export function InstagramCarousel({
  item,
  available,
  detail,
  p,
  onOpen,
}: {
  item: Item;
  available: Item[];
  detail: boolean;
  p: SkinProps;
  onOpen: () => void;
}) {
  const slides = instagramSlides(item, available);
  const [stored, setStored] = useSkinState<number>(p, "igSlide:" + item.id, 0);
  const index = Math.max(0, Math.min(slides.length - 1, stored));
  const current = slides[index];
  const pointer = useRef<{ x: number; y: number } | null>(null);
  const suppress = useRef(false);
  if (!current) return null;
  const move = (direction: number) =>
    setStored(Math.max(0, Math.min(slides.length - 1, index + direction)));
  return (
    <div
      className="rig-carousel"
      data-slide={index + 1}
      onPointerDown={(e) => {
        pointer.current = { x: e.clientX, y: e.clientY };
      }}
      onPointerUp={(e) => {
        if (!pointer.current) return;
        const dx = e.clientX - pointer.current.x,
          dy = e.clientY - pointer.current.y;
        pointer.current = null;
        if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.5) {
          move(dx < 0 ? 1 : -1);
          suppress.current = true;
          window.setTimeout(() => {
            suppress.current = false;
          }, 300);
        }
      }}
      onPointerCancel={() => {
        pointer.current = null;
      }}
    >
      {detail ? (
        <img
          src={safeMedia(current.media)}
          alt={`${item.title} · 第${index + 1}张`}
          draggable={false}
        />
      ) : (
        <button
          className="rig-carousel-open"
          aria-label={"查看帖子：" + item.title}
          onClick={() => {
            if (suppress.current) {
              suppress.current = false;
              return;
            }
            onOpen();
          }}
        >
          <img
            src={safeMedia(current.media)}
            alt={`${item.title} · 第${index + 1}张`}
            draggable={false}
          />
        </button>
      )}
      {slides.length > 1 && (
        <>
          <span className="rig-carousel-counter" aria-live="polite">
            {index + 1}/{slides.length}
          </span>
          {index > 0 && (
            <button
              className="rig-carousel-prev"
              aria-label={"上一张照片：" + item.title}
              onClick={(e) => {
                e.stopPropagation();
                move(-1);
              }}
            >
              <ChevronLeft size={18} />
            </button>
          )}
          {index < slides.length - 1 && (
            <button
              className="rig-carousel-next"
              aria-label={"下一张照片：" + item.title}
              onClick={(e) => {
                e.stopPropagation();
                move(1);
              }}
            >
              <ChevronRight size={18} />
            </button>
          )}
          <div className="rig-carousel-dots" aria-label="照片页码">
            {slides.map((slide, n) => (
              <button
                key={slide.id}
                aria-label={`查看第${n + 1}张照片：${item.title}`}
                aria-pressed={n === index}
                onClick={() => setStored(n)}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
export function AlbumBadge({ item }: { item: Item }) {
  return item.meta.albumItems ? (
    <Layers className="rig-album-badge" size={18} aria-label="多图帖子" />
  ) : null;
}
