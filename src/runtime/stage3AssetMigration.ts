import { safeMedia, type Runtime, type Work } from "../schema";

// New media is added to the existing author family; it never resets a save or
// treats an old saved false readiness flag as a permanent missing photograph.
export function migrateStage3Assets(work: Work, saved: Runtime): Runtime {
  if (
    work.variables.saveFamily !== "thursday-author" ||
    work.variables.s3IGAssetsRevision !== 1 ||
    saved.variables.s3IGAssetsRevision === 1
  )
    return saved;
  const state = structuredClone(saved);
  const ready = (id: string) =>
    work.data.instagram?.some(
      (item) =>
        item.id === id &&
        item.meta.assetPending !== "true" &&
        !!safeMedia(item.media),
    ) || false;
  state.variables.s3MotorPhotoReady =
    ready("s3-ig-motor") && ready("s3-ig-motor-2");
  state.variables.s3RamenPhotoReady = [
    "s3-ig-ramen",
    "s3-ig-ramen-2",
    "s3-ig-ramen-3",
    "s3-ig-ramen-4",
  ].every(ready);
  const unlock = (ids: string[]) => {
    for (const id of ids)
      if (!state.unlocked.includes(id)) state.unlocked.push(id);
  };
  const motorStarted = [1, 2].some(
    (n) =>
      state.completed.includes(`s3-motor-question-send-${n}`) ||
      state.completed.includes(
        `s3-topic-motor${n === 1 ? "" : "-alternate"}-start`,
      ),
  );
  state.variables.s3MotorInviteStarted = motorStarted;
  if (state.variables.s3MotorPhotoReady && state.completed.includes("s3-dec27"))
    unlock(["s3-ig-motor", "s3-ig-motor-2"]);
  const rode = [1, 2].some((n) =>
    state.completed.includes(`s3-motor-ride-reply-send-${n}-finish`),
  );
  if (state.variables.s3MotorRide === true && rode) {
    state.variables.s3MotorRideDone = true;
    unlock(["s3-ig-owner-ride", "s3-ig-owner-profile", "s3-ig-ride-like"]);
    const notice = "Instagram：i_m_hendery 赞了你的照片：出去兜了一圈";
    if (
      !state.read.includes("s3-ig-ride-like") &&
      !state.notifications.includes(notice)
    )
      state.notifications.push(notice);
  }
  if (state.variables.s3RamenPhotoReady && state.variables.s3RamenMealDone) {
    unlock(["s3-ig-ramen", "s3-ig-ramen-2", "s3-ig-ramen-3", "s3-ig-ramen-4"]);
    state.variables.s3RamenPhotoPublished = true;
  }
  state.variables.s3IGAssetsRevision = 1;
  return state;
}
