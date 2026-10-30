export function localReviewSlot() {
  if (!["localhost", "127.0.0.1", "[::1]"].includes(location.hostname))
    return "";
  const slot = new URLSearchParams(location.search).get("review");
  return slot === "new" || slot === "legacy" || slot === "declined" ? slot : "";
}
export function playerNameKey() {
  const slot = localReviewSlot();
  return "foundphone-player-name" + (slot ? ":rc:" + slot : "");
}
