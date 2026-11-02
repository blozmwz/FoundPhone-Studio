// Produce a physically limited public source, never upload the author story.
export const STAGE3_REVISION = 1505;
export const STAGE3_BUILD = "stage123-20261102-r3";
export function stage3ReleaseStory(full, previousPublic) {
  const story = structuredClone(full);
  story.revision = STAGE3_REVISION;
  story.description = "《礼拜四》Stage 1—3，至2027年1月20日课堂聊天结束。";
  story.variables = {
    ...story.variables,
    publicDemo: true,
    saveFamily: "thursday-public",
    saveCompatibleFrom: 1501,
    releaseBuild: STAGE3_BUILD,
    releaseStage2: false,
    releaseStage3: true,
    releaseComplete: false,
    resumeAfterRelease: "s3-dec04",
  };
  const boundary = "2027-02-01";
  const retired = (id) =>
    /^(life-topic-(movie|food|small))(-|$)/.test(
      id.replace(/^(deliver-|read-)/, ""),
    );
  const items = [
    ...story.chats.flatMap((c) => c.messages),
    ...Object.values(story.content).flat(),
  ];
  const byItem = new Map(
    items.filter((i) => !i.time || i.time < boundary).map((i) => [i.id, i]),
  );
  const byNode = new Map(story.events.map((n) => [n.id, n]));
  const records = new Set(
    [
      ...previousPublic.chats.flatMap((c) => c.messages),
      ...Object.values(previousPublic.content).flat(),
    ].map((i) => i.id),
  );
  const keep = new Set(),
    variables = new Set(),
    scenes = new Set(
      previousPublic.events
        .filter((n) => n.event === "continueScene")
        .map((n) => n.id),
    );
  for (const n of story.events) {
    if (n.event !== "continueScene" || n.id === "authorContinueStage3")
      continue;
    const date = n.actions.find((a) => a.type === "date")?.value;
    if (
      date &&
      date < boundary &&
      !n.conditions?.some(
        (c) => c.key === "s3LegacyPlayback" || c.key === "s3R21Retired",
      )
    )
      scenes.add(n.id);
  }
  const roots = story.events
    .filter(
      (n) =>
        n.type === "start" ||
        [
          "planFilm",
          "filmStatus",
          "avatarViewed",
          "topic",
          "orderFood",
          "reactMessage",
          "igStoryReply",
          "stage3RideYuki",
          "stage3LunchOrder",
        ].includes(n.event),
    )
    .map((n) => n.id);
  const queue = [...roots, ...previousPublic.events.map((n) => n.id)];
  function consider(id) {
    const n = byNode.get(id);
    if (!n || keep.has(id)) return;
    if (n.event === "authorContinueStage3" || n.id === "authorContinueStage3")
      return;
    if (
      n.event === "continueScene" &&
      !scenes.has(n.id) &&
      !scenes.has(n.target)
    )
      return;
    if (
      n.actions.some(
        (a) =>
          (a.type === "date" && String(a.value) >= boundary) ||
          (a.type === "variable" &&
            a.key === "lifeStage" &&
            Number(a.value) > 3),
      )
    )
      return;
    if (
      n.conditions?.some(
        (c) =>
          c.key === "lifeStage" &&
          ["eq", "gte", "gt"].includes(c.op) &&
          Number(c.value) > 3,
      )
    )
      return;
    keep.add(id);
    if (retired(id)) return;
    queue.push(...n.next);
    // Dispatch matches event+target, not only the handler's own ID. Companion
    // handlers can publish media without containing their own date action.
    if (n.event === "continueScene" && n.target)
      queue.push(
        ...story.events
          .filter((h) => h.event === n.event && h.target === n.target)
          .map((h) => h.id),
      );
    for (const a of n.actions) {
      if (a.type === "unlock" && byItem.has(a.key)) records.add(a.key);
      if (a.type === "choice") queue.push(a.key);
      if (a.type === "variable") {
        variables.add(a.key);
        if (a.key === "pendingScene" && scenes.has(String(a.value)))
          queue.push(String(a.value));
      }
    }
  }
  // Hidden records must be discovered by actual reachability; recommendations
  // and historical account photos have no plot trigger and retain safe dates.
  for (const i of items)
    if (
      byItem.has(i.id) &&
      ((!i.hidden && !i.unlock) ||
        i.meta?.history === "true" ||
        i.meta?.profile === "true" ||
        i.meta?.film)
    )
      records.add(i.id);
  let changed = true;
  while (changed) {
    const size = keep.size + records.size;
    while (queue.length) consider(queue.shift());
    for (const n of story.events)
      if (
        (n.event === "read" && records.has(n.target)) ||
        (n.event === "variable" && variables.has(n.target))
      )
        queue.push(n.id);
    while (queue.length) consider(queue.shift());
    for (const id of records) {
      const item = byItem.get(id);
      for (const ref of [
        ...(item?.meta?.albumItems || "").split(","),
        item?.meta?.sourceStory || "",
      ])
        if (byItem.has(ref.trim())) records.add(ref.trim());
    }
    changed = size !== keep.size + records.size;
  }
  // Keep historical IDs from 1502 for save validation, but never their retired
  // send/read triggers. Future author records are absent, including image bytes.
  for (const id of records)
    if (!byItem.has(id)) throw Error("Previous public record missing: " + id);
  story.chats.forEach(
    (c) => (c.messages = c.messages.filter((i) => records.has(i.id))),
  );
  story.content = Object.fromEntries(
    Object.entries(story.content).map(([app, list]) => [
      app,
      list.filter((i) => records.has(i.id)),
    ]),
  );
  story.events = story.events
    .filter((n) => keep.has(n.id))
    .map((n) => {
      n.next = n.next.filter((id) => keep.has(id));
      n.actions = n.actions
        .filter(
          (a) => !["unlock", "hide"].includes(a.type) || records.has(a.key),
        )
        .filter(
          (a) =>
            a.key !== "pendingScene" || !a.value || scenes.has(String(a.value)),
        );
      if (/^s3-class-memory-r4-send-[12]-finish$/.test(n.id))
        n.actions.push({
          type: "variable",
          key: "releaseComplete",
          value: true,
        });
      return n;
    });
  const indexes =
    full.variables?.publicDemo === true
      ? full.tests.map((_, index) => index)
      : [0, 4, 5, 6, 7];
  story.tests = indexes.map((index) => {
    const t = structuredClone(full.tests[index]);
    const end = t.steps.findIndex(
      (s) =>
        s.event === "read" &&
        /^s3-class-memory-r4-send-[12]-reply-[23]$/.test(s.target || ""),
    );
    if (end < 0 && index >= 5 && full.variables?.publicDemo !== true)
      throw Error("Missing Stage3 boundary");
    if (end >= 0) {
      t.steps = t.steps.slice(0, end + 1);
      t.name = "Stage1—3入住完整通路 " + index;
      t.ending = "";
      t.checkpoint = "s3ReviewComplete";
      t.expectUnlocked = [];
    }
    return t;
  });
  for (const id of [
    "s3-ig-motor",
    "s3-ig-motor-2",
    ...[1, 2, 3, 4].map((i) => "s3-photo-ramen-" + i),
  ])
    if (!records.has(id)) throw Error("Required Stage3 media omitted: " + id);
  return story;
}
