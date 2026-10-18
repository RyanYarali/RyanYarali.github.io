-- Every message sent through the contact form, kept even when an email
-- fails, so nothing is lost. ip_hash is a salted hash, never the address.
CREATE TABLE messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  topic TEXT NOT NULL,
  addons TEXT NOT NULL DEFAULT '[]',
  estimate INTEGER,
  monthly INTEGER,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  message TEXT NOT NULL,
  ip_hash TEXT NOT NULL,
  notified INTEGER NOT NULL DEFAULT 0,
  replied INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX messages_ip_time ON messages (ip_hash, created_at);
CREATE INDEX messages_email_time ON messages (email, created_at);
