import { advance, choose, dispatch } from "../engine";
import { initialRuntime, type Work, type Runtime } from "../schema";
import { storyContinuation } from "./continuation";
import { lifeInteraction } from "./lifeInteractions";
import { pendingScene } from "./scenePacing";

export function viewingCheckpoint(work: Work): Runtime {
  if (work.id !== "fridge-light-roommates")
    throw Error("此作品没有看房试玩节点");
  let state = dispatch(work, initialRuntime(work), "start");
  for (let turn = 0; turn < 160; turn++) {
    state = advance(work, state, 120000);
    if (state.choices.some((c) => c.target === "viewing-arrival-send-1")) {
      return { ...state, notifications: [] };
    }
    if (state.choices.length) {
      state = choose(work, state, state.choices[0].target);
    } else if (pendingScene(work, state)) {
      state = dispatch(
        work,
        state,
        "continueScene",
        pendingScene(work, state)!.id,
      );
    } else {
      const next = storyContinuation(work, state);
      if (!next) break;
      state = dispatch(work, state, "read", next.item.id);
    }
  }
  throw Error("看房试玩节点未能到达");
}

export function roommateCheckpoint(work: Work): Runtime {
  let state = viewingCheckpoint(work);
  for (let turn = 0; turn < 140; turn++) {
    state = advance(work, state, 120000);
    if (state.choices.some((c) => c.target === "life-arrived-send-1"))
      return { ...state, notifications: [] };
    if (state.choices.length) {
      state = choose(
        work,
        state,
        state.choices.find((c) => c.target === "choose-house-stay")?.target ??
          state.choices[0].target,
      );
    } else if (pendingScene(work, state)) {
      state = dispatch(
        work,
        state,
        "continueScene",
        pendingScene(work, state)!.id,
      );
    } else {
      const next = storyContinuation(work, state);
      if (!next) break;
      state = dispatch(work, state, "read", next.item.id);
    }
  }
  throw Error("入住试玩节点未能到达");
}

export function stage2Checkpoint(work: Work): Runtime {
  let state = roommateCheckpoint(work);
  for (let turn = 0; turn < 100; turn++) {
    state = advance(work, state, 120000);
    if (state.variables.pendingScene === "s2-accidental")
      return { ...state, notifications: [] };
    if (state.choices.length)
      state = choose(work, state, state.choices[0].target);
    else if (pendingScene(work, state))
      state = dispatch(
        work,
        state,
        "continueScene",
        pendingScene(work, state)!.id,
      );
    else {
      const next = storyContinuation(work, state);
      if (!next) break;
      state = dispatch(work, state, "read", next.item.id);
    }
  }
  throw Error("Stage 2 试玩节点未能到达");
}

// Start before the last Stage2 choice so the player can personally read the
// final two bubbles, then cross the real date entry into Stage3.
export function stage2TailCheckpoint(work: Work): Runtime {
  let state = stage2Checkpoint(work);
  for (let turn = 0; turn < 240; turn++) {
    state = advance(work, state, 120000);
    if (
      state.choices.some(
        (choice) => choice.target === "s2-film-weekly-reply-send-1",
      )
    )
      return { ...state, notifications: [] };
    if (state.choices.length)
      state = choose(work, state, state.choices[0].target);
    else if (pendingScene(work, state))
      state = dispatch(
        work,
        state,
        "continueScene",
        pendingScene(work, state)!.id,
      );
    else {
      const next = storyContinuation(work, state);
      if (!next) break;
      state = dispatch(work, state, "read", next.item.id);
    }
  }
  throw Error("Stage2 末尾接续节点未能到达");
}

export function stage3Checkpoint(work: Work): Runtime {
  let state = stage2Checkpoint(work);
  for (let turn = 0; turn < 240; turn++) {
    state = advance(work, state, 120000);
    if (state.variables.pendingScene === "s3-dec04")
      return { ...state, notifications: [] };
    if (state.choices.length)
      state = choose(work, state, state.choices[0].target);
    else if (pendingScene(work, state))
      state = dispatch(
        work,
        state,
        "continueScene",
        pendingScene(work, state)!.id,
      );
    else {
      const next = storyContinuation(work, state);
      if (!next) break;
      state = dispatch(work, state, "read", next.item.id);
    }
  }
  throw Error("Stage 3 试玩节点未能到达");
}

export function stage3ReviewState(state: Runtime): Runtime {
  if (!state.variables.s3ReviewComplete || state.endings.length) return state;
  return {
    ...state,
    variables: { ...state.variables, pendingScene: "", s3PreviewPaused: true },
  };
}

export function pizzaCheckpoint(work: Work): Runtime {
  let state = stage2Checkpoint(work);
  for (let turn = 0; turn < 220; turn++) {
    state = advance(work, state, 120000);
    if (
      state.choices.some((choice) => choice.target === "s2-pizza-invite-send-1")
    )
      return { ...state, notifications: [] };
    if (state.choices.length)
      state = choose(work, state, state.choices[0].target);
    else if (pendingScene(work, state))
      state = dispatch(
        work,
        state,
        "continueScene",
        pendingScene(work, state)!.id,
      );
    else {
      const next = storyContinuation(work, state);
      if (!next) break;
      state = dispatch(work, state, "read", next.item.id);
    }
  }
  throw Error("第⑥段披萨试玩节点未能到达");
}

// Local IG review only; replays approved choices into a separate preview save.
export function instagramCheckpoint(work: Work): Runtime {
  let state = stage2Checkpoint(work);
  for (let turn = 0; turn < 220; turn++) {
    state = advance(work, state, 120000);
    if (state.variables.pendingScene === "rev15-outing")
      return { ...state, notifications: [] };
    if (state.choices.length)
      state = choose(work, state, state.choices[0].target);
    else if (pendingScene(work, state))
      state = dispatch(
        work,
        state,
        "continueScene",
        pendingScene(work, state)!.id,
      );
    else {
      const next = storyContinuation(work, state);
      if (!next) break;
      state = dispatch(work, state, "read", next.item.id);
    }
  }
  throw Error("Instagram 试玩节点未能到达");
}

// Replays only the player's already chosen opening options, then stops before
// the major housing decision. Later-route data is never carried across.
export function housingCheckpoint(work: Work, previous: Runtime): Runtime {
  let state = dispatch(work, initialRuntime(work), "start");
  for (let turn = 0; turn < 300; turn++) {
    state = advance(work, state, 120000);
    if (state.choices.some((c) => c.target === "choose-house-stay"))
      return { ...state, notifications: [] };
    if (state.choices.length)
      state = choose(
        work,
        state,
        state.choices.find((c) => previous.completed.includes(c.target))
          ?.target ?? state.choices[0].target,
      );
    else if (pendingScene(work, state))
      state = dispatch(
        work,
        state,
        "continueScene",
        pendingScene(work, state)!.id,
      );
    else {
      const next = storyContinuation(work, state);
      if (!next) break;
      state = dispatch(work, state, "read", next.item.id);
    }
  }
  throw Error("无法恢复入住选择节点，请先导出存档。");
}

// Local review only: advance existing authored events, never manufacture social
// unlocks. Each URL has its own save slot and stops at the Stage3 boundary.
export function stage3MotorCheckpoint(work: Work): Runtime {
  return stage3MediaCheckpoint(work, "s3-dec27");
}
export function stage3RamenCheckpoint(work: Work): Runtime {
  return stage3MediaCheckpoint(work, "s3-ramen-after");
}
function stage3MediaCheckpoint(work: Work, scene: string): Runtime {
  let state = stage3Checkpoint(work);
  for (let turn = 0; turn < 400; turn++) {
    state = advance(work, state, 120000);
    if (state.completed.includes(scene) && state.choices.length) return state;
    if (state.choices.length)
      state = choose(work, state, state.choices[0].target);
    else if (pendingScene(work, state))
      state = dispatch(
        work,
        state,
        "continueScene",
        pendingScene(work, state)!.id,
      );
    else if (state.variables.s3LunchOrdering)
      state = lifeInteraction(work, state, "orderFood", "ramen");
    else {
      const next = storyContinuation(work, state);
      if (!next) break;
      state = dispatch(work, state, "read", next.item.id);
    }
  }
  throw Error("Stage3 图片试玩节点未能到达：" + scene);
}
