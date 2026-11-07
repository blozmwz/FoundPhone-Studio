import type { Runtime, Work } from "../schema";

// Old motor bubbles/choice IDs remain valid, so interrupted old conversations
// finish on their original path. Only a newly sent ride acceptance opts into v2.
export function migrateStage3Motor(work: Work, saved: Runtime): Runtime {
  if (work.variables.s3MotorStoryRevision !== 1) return saved;
  const state = structuredClone(saved);
  if (
    state.variables.s3MotorFlow !== 2 &&
    state.variables.s3MotorRide === true &&
    state.variables.s3MotorRideDone === true &&
    !state.variables.s3YukiRideStarted &&
    state.date === "2026-12-27" &&
    state.variables.pendingScene === "s3-dec30" &&
    !state.choices.length &&
    !state.scheduled?.length &&
    !state.variables.sideBusy
  )
    state.variables.pendingScene = "s3-motor-yuki-later";
  // Never infer seat/route/next-invitation choices, backfill their posts, or
  // reopen a completed ride. A normal save has no manufactured v2 branch flags.
  return state;
}
