import { advance, choose, dispatch } from "../engine";
import { initialRuntime, type Work, type Runtime } from "../schema";
import { storyContinuation } from "./continuation";
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
