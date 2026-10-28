import { expect, it } from "vitest";
import source from "../../stories/template/story.json";
import { compileStory } from "../story-engine/compiler";
import { testStory } from "../story-engine/testStory";
import { initialRuntime } from "../schema";
import { dispatch, choose, advance } from "../engine";
const {story,work}=compileStory(source);
it("passes every approved public ending",()=>expect(testStory(story,work)).toEqual([]));
it("ships only the approved two chapters and their assets",()=>{
 expect(story.variables.publicDemo).toBe(true);expect(work.phone.passcode).toBe("0917");
 expect(work.data.instagram ?? []).toEqual([]);
 expect(work.data.messages.some(m=>m.id.startsWith("life-")||m.id.startsWith("rev15-"))).toBe(false);
 expect(work.data.notes.some(m=>m.id==="diary-nearly-kiss")).toBe(false);
 expect(JSON.stringify(source)).not.toContain("sourcePhoto");
 expect(story.events.some(e=>e.event==="resumeDraft"||e.event==="reunion")).toBe(false);
});
it.each(story.tests)("preserves saved delays and ends once: $name",route=>{
 let state=dispatch(work,initialRuntime(work),"start");
 for(const step of route.steps){state=JSON.parse(JSON.stringify(state));if(step.advanceMs!==undefined)state=advance(work,state,step.advanceMs);if(step.event)state=dispatch(work,state,step.event,step.target);if(step.choose)state=choose(work,state,step.choose);}
 expect(state.endings).toEqual([route.ending]);state=advance(work,state,3600000);expect(state.endings).toEqual([route.ending]);expect(state.scheduled).toEqual([]);
});
