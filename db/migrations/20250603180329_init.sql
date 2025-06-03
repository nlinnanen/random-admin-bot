-- migrate:up
CREATE TABLE chat_data (
  chat_id   BIGINT      PRIMARY KEY,
  i         INTEGER     NOT NULL DEFAULT 0,
  usernames JSONB,
  schedule  TEXT
);

-- migrate:down
DROP TABLE IF EXISTS chat_ids;
