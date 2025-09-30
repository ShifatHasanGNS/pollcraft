CREATE TYPE "visibility" AS ENUM ('public', 'listed');
CREATE TYPE "identity_mode" AS ENUM ('anonymous', 'identified');
CREATE TYPE "question_kind" AS ENUM ('single', 'multi', 'ranked', 'text');
CREATE TYPE "actor_type" AS ENUM ('system', 'user', 'voter');
CREATE TYPE "share_scope" AS ENUM ('results', 'report');

CREATE TABLE "users" (
    "id" text PRIMARY KEY,
    "email" varchar(255) NOT NULL,
    "name" varchar(120),
    "image" varchar(512),
    "email_verified" timestamptz,
    "created_at" timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX "users_email_unique" ON "users" ("email");

CREATE TABLE "accounts" (
    "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "type" varchar(32) NOT NULL,
    "provider" varchar(255) NOT NULL,
    "provider_account_id" varchar(255) NOT NULL,
    "refresh_token" varchar(512),
    "access_token" varchar(512),
    "expires_at" integer,
    "token_type" varchar(32),
    "scope" varchar(255),
    "id_token" varchar(512),
    "session_state" varchar(255),
    PRIMARY KEY ("provider", "provider_account_id")
);

CREATE TABLE "sessions" (
    "session_token" varchar(255) PRIMARY KEY,
    "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "expires" timestamptz NOT NULL
);

CREATE TABLE "verification_tokens" (
    "identifier" varchar(255) NOT NULL,
    "token" varchar(255) NOT NULL,
    "expires" timestamptz NOT NULL,
    PRIMARY KEY ("identifier", "token")
);

CREATE TABLE "authenticators" (
    "credential_id" varchar(255) NOT NULL UNIQUE,
    "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "provider_account_id" varchar(255) NOT NULL,
    "credential_public_key" varchar(2048) NOT NULL,
    "counter" integer NOT NULL,
    "credential_device_type" varchar(255) NOT NULL,
    "credential_backed_up" boolean NOT NULL,
    "transports" varchar(255),
    PRIMARY KEY ("user_id", "credential_id")
);

CREATE TABLE "password_credentials" (
    "id" text PRIMARY KEY,
    "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "provider" varchar(32) NOT NULL DEFAULT 'credentials',
    "identifier" varchar(255) NOT NULL,
    "hashed_password" varchar(255) NOT NULL,
    "created_at" timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX "password_credentials_provider_identifier"
    ON "password_credentials" ("provider", "identifier");

CREATE TABLE "polls" (
    "id" text PRIMARY KEY,
    "owner_id" text NOT NULL REFERENCES "users"("id"),
    "title" varchar(200) NOT NULL,
    "description" varchar(2000),
    "visibility" "visibility" NOT NULL DEFAULT 'public',
    "identity_mode" "identity_mode" NOT NULL DEFAULT 'anonymous',
    "multi_question" boolean NOT NULL DEFAULT true,
    "opens_at" timestamptz,
    "closes_at" timestamptz,
    "committed_at" timestamptz,
    "definition_hash" varchar(128),
    "version" integer NOT NULL DEFAULT 1,
    "created_at" timestamptz DEFAULT now()
);

CREATE TABLE "questions" (
    "id" text PRIMARY KEY,
    "poll_id" text NOT NULL REFERENCES "polls"("id") ON DELETE CASCADE,
    "kind" "question_kind" NOT NULL,
    "prompt" varchar(2000) NOT NULL,
    "order_index" integer NOT NULL,
    "settings" jsonb
);

CREATE TABLE "options" (
    "id" text PRIMARY KEY,
    "question_id" text NOT NULL REFERENCES "questions"("id") ON DELETE CASCADE,
    "label" varchar(2000) NOT NULL,
    "order_index" integer NOT NULL
);

CREATE TABLE "eligibility_lists" (
    "id" text PRIMARY KEY,
    "poll_id" text NOT NULL REFERENCES "polls"("id") ON DELETE CASCADE,
    "name" varchar(200) NOT NULL,
    "created_at" timestamptz DEFAULT now()
);

CREATE TABLE "eligibility_list_items" (
    "id" text PRIMARY KEY,
    "list_id" text NOT NULL REFERENCES "eligibility_lists"("id") ON DELETE CASCADE,
    "email" varchar(255) NOT NULL,
    "display_name" varchar(200),
    "invited" boolean NOT NULL DEFAULT false,
    "redeemed" boolean NOT NULL DEFAULT false,
    "invite_token_hash" varchar(128) NOT NULL,
    "created_at" timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX "eligibility_email_unique"
    ON "eligibility_list_items" ("list_id", "email");

CREATE TABLE "ballots" (
    "id" text PRIMARY KEY,
    "poll_id" text NOT NULL REFERENCES "polls"("id") ON DELETE CASCADE,
    "voter_ref" varchar(255),
    "anonymous" boolean NOT NULL DEFAULT true,
    "submitted_at" timestamptz,
    "origin_ip_hash" varchar(128),
    "device_token_hash" varchar(128),
    "user_agent_hash" varchar(128)
);

CREATE TABLE "votes" (
    "id" text PRIMARY KEY,
    "ballot_id" text NOT NULL REFERENCES "ballots"("id") ON DELETE CASCADE,
    "poll_id" text NOT NULL REFERENCES "polls"("id") ON DELETE CASCADE,
    "question_id" text NOT NULL REFERENCES "questions"("id"),
    "option_id" text,
    "free_text" varchar(4000),
    "weight" integer NOT NULL DEFAULT 1
);

CREATE TABLE "vote_aggregates" (
    "poll_id" text NOT NULL REFERENCES "polls"("id") ON DELETE CASCADE,
    "question_id" text NOT NULL,
    "option_id" text,
    "count" integer NOT NULL DEFAULT 0,
    "updated_at" timestamptz DEFAULT now(),
    PRIMARY KEY ("poll_id", "question_id", "option_id")
);

CREATE TABLE "share_links" (
    "id" text PRIMARY KEY,
    "poll_id" text NOT NULL REFERENCES "polls"("id") ON DELETE CASCADE,
    "scope" "share_scope" NOT NULL,
    "visibility" "visibility" NOT NULL,
    "token_hash" varchar(128) NOT NULL,
    "expires_at" timestamptz,
    "created_at" timestamptz DEFAULT now()
);

CREATE TABLE "audit_logs" (
    "id" text PRIMARY KEY,
    "ts" timestamptz DEFAULT now(),
    "actor_type" "actor_type" NOT NULL,
    "actor_id" varchar(255),
    "action" varchar(120) NOT NULL,
    "entity" varchar(120) NOT NULL,
    "entity_id" varchar(120) NOT NULL,
    "prev_hash" varchar(128),
    "hash" varchar(128) NOT NULL
);

CREATE OR REPLACE FUNCTION forbid_updates_after_commit() RETURNS trigger AS $$
DECLARE
    target_poll_id text;
BEGIN
    IF TG_TABLE_NAME = 'polls' THEN
        target_poll_id := NEW.id;
    ELSE
        target_poll_id := NEW.poll_id;
    END IF;

    IF EXISTS (
        SELECT 1
        FROM polls p
        WHERE p.id = target_poll_id
          AND p.committed_at IS NOT NULL
    ) THEN
        RAISE EXCEPTION 'Poll is committed; definition cannot be modified';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "t_forbid_poll_update"
BEFORE UPDATE ON "polls"
FOR EACH ROW EXECUTE FUNCTION forbid_updates_after_commit();

CREATE TRIGGER "t_forbid_question_update"
BEFORE UPDATE ON "questions"
FOR EACH ROW EXECUTE FUNCTION forbid_updates_after_commit();

CREATE TRIGGER "t_forbid_option_update"
BEFORE UPDATE ON "options"
FOR EACH ROW EXECUTE FUNCTION forbid_updates_after_commit();

CREATE OR REPLACE FUNCTION apply_vote_and_notify() RETURNS trigger AS $$
BEGIN
    INSERT INTO vote_aggregates (poll_id, question_id, option_id, count, updated_at)
    VALUES (NEW.poll_id, NEW.question_id, NEW.option_id, NEW.weight, now())
    ON CONFLICT (poll_id, question_id, option_id)
    DO UPDATE SET count = vote_aggregates.count + NEW.weight, updated_at = now();

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "t_vote_aggregate"
AFTER INSERT ON "votes"
FOR EACH ROW EXECUTE FUNCTION apply_vote_and_notify();
