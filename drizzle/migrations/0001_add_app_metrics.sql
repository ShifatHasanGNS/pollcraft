CREATE TABLE IF NOT EXISTS "app_metrics" (
  "key" text PRIMARY KEY,
  "value" bigint NOT NULL DEFAULT 0,
  "updated_at" timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "visitor_tokens" (
  "token_hash" text PRIMARY KEY,
  "first_seen" timestamptz DEFAULT now()
);
