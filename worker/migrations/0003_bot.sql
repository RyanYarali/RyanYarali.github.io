-- Visits, for the Telegram bot's numbers. No cookies and no IP addresses:
-- vid is a salted hash of the visitor's IP and browser that changes every
-- day, so a visitor can be counted for a day and never followed past it.
CREATE TABLE visits (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  day TEXT NOT NULL,
  vid TEXT NOT NULL,
  path TEXT NOT NULL,
  source TEXT NOT NULL,
  country TEXT,
  city TEXT,
  device TEXT,
  seconds INTEGER
);

CREATE INDEX visits_day ON visits (day);
CREATE INDEX visits_vid ON visits (vid, created_at);

-- Where a lead came from and what they looked at, and where it stands.
ALTER TABLE messages ADD COLUMN vid TEXT;
ALTER TABLE messages ADD COLUMN source TEXT;
ALTER TABLE messages ADD COLUMN context TEXT;
ALTER TABLE messages ADD COLUMN status TEXT NOT NULL DEFAULT 'new';

-- Telegram messages that stand for a lead (the alert, a reply prompt), so a
-- reply to any of them is a reply to that lead.
CREATE TABLE tg_links (
  tg_message_id INTEGER PRIMARY KEY,
  message_id INTEGER NOT NULL
);

-- A reply Ryan wrote in Telegram, waiting for him to press Send.
CREATE TABLE drafts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  message_id INTEGER NOT NULL,
  text TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
