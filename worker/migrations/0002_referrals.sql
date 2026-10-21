-- Who sent them, as the sender typed it (a name or an email). Ryan checks
-- it against his clients before applying the discount.
ALTER TABLE messages ADD COLUMN ref TEXT;
