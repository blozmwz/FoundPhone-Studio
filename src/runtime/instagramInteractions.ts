import { authoredReplyOptions, authoredReplyKey } from './authoredInstagramReplies';
import { choose, visible } from "../engine";
import { safeMedia, type Runtime, type Work } from "../schema";
import { currentInstagramStories, instagramNow } from "./instagramModel";

export function motorStoryReplies(work: Work, state: Runtime, id: string) {
  const item = work.data.instagram?.find((item) => item.id === id);
  if (item && item.meta.replyOptions && visible(item,state) &&
      !state.ui?.instagram?.[authoredReplyKey(id)]) {
    return authoredReplyOptions(item).map((r,index)=>({label:r.label,target:id+':reply:'+(index+1)}));
  }
  if (
    !item ||
    item.meta.motorInvite !== "true" ||
    !safeMedia(item.media) ||
    !visible(item, state) ||
    !state.read.includes(id) ||
    state.endings.length ||
    state.scheduled?.length ||
    state.variables.sideBusy ||
    state.variables.s3MotorInviteStarted ||
    !currentInstagramStories([item], instagramNow(state.date, state.time))
      .length
  )
    return [];
  return state.choices.length === 2 &&
    state.choices.every((choice) =>
      /^s3-motor-question-send-[12]$/.test(choice.target),
    )
    ? state.choices
    : [];
}

export function instagramInteraction(
  work: Work,
  state: Runtime,
  event: string,
  target: string,
) {
  if (work.id !== "fridge-light-roommates") return state;
  if (event === "igConversationReply") {
    const [id,reply]=target.split("\t");
    const choices=motorStoryReplies(work,state,id);
    const index=choices.findIndex(c=>c.target===reply);
    if(index<0)return state;
    return {...state,ui:{...state.ui,instagram:{...state.ui?.instagram,[authoredReplyKey(id)]:index+1}}};
  }
  if (event === "igStoryReply") {
    const [id, reply] = target.split("\t");
    if (
      !motorStoryReplies(work, state, id).some(
        (choice) => choice.target === reply,
      )
    )
      return state;
    return choose(work, state, reply);
  }
  if (event === "igOwnerReply") {
    // Retired public Yuki-comment flow: her response is now a separate iMessage.
    return state;
  }
  return state;
}
