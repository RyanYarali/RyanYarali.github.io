-- More for the bot to tell Ryan, still with nothing that identifies anyone.

-- How far down the page a visitor got (0 to 100), and the name of the
-- network the visit came over (an internet provider, a company, a school),
-- as Cloudflare reports it. Not the internet address.
ALTER TABLE visits ADD COLUMN depth INTEGER;
ALTER TABLE visits ADD COLUMN org TEXT;

-- Things a visitor did on a page: downloaded the résumé, followed a link
-- off the site, started typing in the contact form.
CREATE TABLE events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  day TEXT NOT NULL,
  vid TEXT NOT NULL,
  kind TEXT NOT NULL,
  detail TEXT,
  path TEXT
);

CREATE INDEX events_day ON events (day, kind);
CREATE INDEX events_vid ON events (vid);

-- "Already told Ryan about this visitor": one row per visitor and alert, so
-- a ping goes out once. The visitor code changes daily, so this is per day.
CREATE TABLE flags (
  vid TEXT NOT NULL,
  kind TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  PRIMARY KEY (vid, kind)
);

-- When a lead's status last changed, and whether Ryan has been nudged to
-- follow up on one that went quiet.
ALTER TABLE messages ADD COLUMN status_at TEXT;
ALTER TABLE messages ADD COLUMN nudged INTEGER NOT NULL DEFAULT 0;
