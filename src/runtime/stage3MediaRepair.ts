import { safeMedia, type Runtime, type Work } from "../schema";

// Repair actual event unlocks on every restore, without clearing history or
// depending on defaults merged by an older cached runtime.
export function repairStage3Media(work: Work, saved: Runtime): Runtime {
  if (!work.data.instagram?.some((i) => i.id === "s3-ig-motor-2")) return saved;
  const s = structuredClone(saved);
  const unlock = (id: string) => {
    if (
      Object.values(work.data).some((rows) => rows.some((i) => i.id === id)) &&
      !s.unlocked.includes(id)
    )
      s.unlocked.push(id);
  };
  const stories = ["s3-ig-motor", "s3-ig-motor-2"];
  s.variables.s3MotorPhotoReady = stories.every((id) =>
    work.data.instagram.some((i) => i.id === id && !!safeMedia(i.media)),
  );
  const started =
    s.variables.s3MotorInviteStarted === true ||
    s.completed.some((id) =>
      /^s3-motor-question-send-[12]$|^s3-topic-motor(-alternate)?-start$/.test(
        id,
      ),
    );
  if (s.completed.includes("s3-dec27")) {
    stories.forEach(unlock);
    if (started) {
      s.variables.s3MotorInviteStarted = true;
      s.variables.s3MotorStorySeen = true;
    } else {
      const seen = stories.some((id) => s.read.includes(id));
      s.variables.s3MotorStorySeen = seen;
      const motorChoices =
        s.choices.length === 2 &&
        s.choices.every((c) => /^s3-motor-question-send-[12]$/.test(c.target));
      if (!seen && motorChoices) s.choices = [];
      // An interrupted old unsent draft remains in UI state; reading the Story
      // restores its existing choices, never sends it on the player's behalf.
      if (
        seen &&
        !s.choices.length &&
        !s.scheduled?.length &&
        !s.variables.sideBusy
      ) {
        s.choices = [1, 2].map((n) => {
          const node = work.nodes.find(
            (i) => i.id === `s3-motor-question-send-${n}`,
          )!;
          return { target: node.id, label: node.label };
        });
      }
      const date = `${s.date} ${s.time}`;
      if (
        !seen &&
        date >= "2026-12-27 19:20" &&
        date < "2026-12-28 19:20" &&
        !s.notifications.some(
          (n) => n === "Instagram：Hendery 更新了快拍：摩托车",
        )
      )
        s.notifications.push("Instagram：Hendery 更新了快拍：摩托车");
    }
  }
  if (
    s.variables.s3RamenMealDone === true ||
    s.completed.includes("s3-ramen-after")
  ) {
    s.variables.s3RamenPhotosTaken = true;
    for (let n = 1; n <= 4; n++) unlock(`s3-photo-ramen-${n}`);
  }
  return s;
}
