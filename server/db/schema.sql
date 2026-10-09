-- The complete shape of the database. Safe to run against an empty database,
-- and safe to run twice (nothing here drops data).
--
-- If you ran an older version of this file that had no username column, the
-- users table already exists and will not be changed. On a LOCAL database with
-- nothing you need, run this once first:  DROP TABLE palettes, users CASCADE;

CREATE TABLE IF NOT EXISTS users (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT        NOT NULL UNIQUE
                            CHECK (email = lower(email) AND char_length(email) <= 254),
  username      TEXT        NOT NULL CHECK (username ~ '^[A-Za-z0-9_]{3,24}$'),
  password_hash TEXT        NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Usernames are unique ignoring case, so "Mia" and "mia" cannot both exist.
CREATE UNIQUE INDEX IF NOT EXISTS users_username_lower_idx ON users (lower(username));

CREATE TABLE IF NOT EXISTS palettes (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name       TEXT        NOT NULL CHECK (char_length(name) BETWEEN 1 AND 60),
  colors     TEXT[]      NOT NULL CHECK (array_length(colors, 1) = 5),
  tags       TEXT[]      NOT NULL DEFAULT '{}' CHECK (cardinality(tags) <= 8),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- The Saved screen lists one user's palettes, newest first.
CREATE INDEX IF NOT EXISTS palettes_user_created_idx ON palettes (user_id, created_at DESC);
