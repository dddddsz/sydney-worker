-- Migration number: 0001 	 2026-06-06T11:43:11.741Z
CREATE TABLE IF NOT EXISTS sessions (
  id         TEXT PRIMARY KEY,
  type       TEXT NOT NULL,
  user_id    INTEGER NOT NULL,
  group_id   INTEGER,
  messages   TEXT NOT NULL DEFAULT '[]',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);