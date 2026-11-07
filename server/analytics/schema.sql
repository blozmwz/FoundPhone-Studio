-- Only random IDs and fixed progress categories. Never names, drafts or saves.
CREATE TABLE IF NOT EXISTS analytics_events (
  id TEXT PRIMARY KEY, visitor TEXT NOT NULL, session TEXT NOT NULL,
  run TEXT NOT NULL, mode TEXT NOT NULL CHECK(mode IN ('first','replay')),
  kind TEXT NOT NULL, chapter INTEGER NOT NULL DEFAULT 0,
  ending TEXT NOT NULL DEFAULT '', build TEXT NOT NULL,
  day TEXT NOT NULL, at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS analytics_events_day ON analytics_events(day,kind);
CREATE INDEX IF NOT EXISTS analytics_events_visitor ON analytics_events(visitor,at);
CREATE INDEX IF NOT EXISTS analytics_events_run ON analytics_events(run,kind,chapter,at);
CREATE TABLE IF NOT EXISTS analytics_active (
  visitor TEXT NOT NULL, minute INTEGER NOT NULL, session TEXT NOT NULL,
  run TEXT NOT NULL, mode TEXT NOT NULL, chapter INTEGER NOT NULL,
  ms INTEGER NOT NULL CHECK(ms BETWEEN 0 AND 60000), day TEXT NOT NULL, at INTEGER NOT NULL,
  PRIMARY KEY(visitor,minute)
);
CREATE INDEX IF NOT EXISTS analytics_active_day ON analytics_active(day);
CREATE INDEX IF NOT EXISTS analytics_active_at ON analytics_active(at);
CREATE TABLE IF NOT EXISTS analytics_meta (key TEXT PRIMARY KEY,value TEXT NOT NULL);
CREATE UNIQUE INDEX IF NOT EXISTS analytics_event_once ON analytics_events(run,kind,chapter,ending) WHERE kind <> 'view';
