import {
  boolean,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";

export const visibilityEnum = pgEnum("visibility", ["public", "listed"]);
export const identityEnum = pgEnum("identity_mode", ["anonymous", "identified"]);
export const qKindEnum = pgEnum("question_kind", ["single", "multi", "ranked", "text"]);
export const actorEnum = pgEnum("actor_type", ["system", "user", "voter"]);
export const shareScope = pgEnum("share_scope", ["results", "report"]);

export const users = pgTable("users", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  email: varchar("email", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 120 }),
  image: varchar("image", { length: 512 }),
  emailVerified: timestamp("email_verified", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const accounts = pgTable(
  "accounts",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: varchar("type", { length: 32 }).notNull(),
    provider: varchar("provider", { length: 255 }).notNull(),
    providerAccountId: varchar("provider_account_id", { length: 255 }).notNull(),
    refresh_token: varchar("refresh_token", { length: 512 }),
    access_token: varchar("access_token", { length: 512 }),
    expires_at: integer("expires_at"),
    token_type: varchar("token_type", { length: 32 }),
    scope: varchar("scope", { length: 255 }),
    id_token: varchar("id_token", { length: 512 }),
    session_state: varchar("session_state", { length: 255 }),
  },
  (t) => ({
    providerAccountUnique: primaryKey({ columns: [t.provider, t.providerAccountId] }),
  }),
);

export const sessions = pgTable("sessions", {
  sessionToken: varchar("session_token", { length: 255 }).primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { withTimezone: true }).notNull(),
});

export const verificationTokens = pgTable(
  "verification_tokens",
  {
    identifier: varchar("identifier", { length: 255 }).notNull(),
    token: varchar("token", { length: 255 }).notNull(),
    expires: timestamp("expires", { withTimezone: true }).notNull(),
  },
  (t) => ({
    identifierTokenPk: primaryKey({ columns: [t.identifier, t.token] }),
  }),
);

export const authenticators = pgTable(
  "authenticators",
  {
    credentialID: varchar("credential_id", { length: 255 }).notNull().unique(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    providerAccountId: varchar("provider_account_id", { length: 255 }).notNull(),
    credentialPublicKey: varchar("credential_public_key", { length: 2048 }).notNull(),
    counter: integer("counter").notNull(),
    credentialDeviceType: varchar("credential_device_type", { length: 255 }).notNull(),
    credentialBackedUp: boolean("credential_backed_up").notNull(),
    transports: varchar("transports", { length: 255 }),
  },
  (t) => ({
    authenticatorPk: primaryKey({ columns: [t.userId, t.credentialID] }),
  }),
);

export const polls = pgTable("polls", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  ownerId: text("owner_id")
    .notNull()
    .references(() => users.id),
  title: varchar("title", { length: 200 }).notNull(),
  description: varchar("description", { length: 2000 }),
  visibility: visibilityEnum("visibility").notNull().default("public"),
  identityMode: identityEnum("identity_mode").notNull().default("anonymous"),
  multiQuestion: boolean("multi_question").notNull().default(true),
  opensAt: timestamp("opens_at", { withTimezone: true }),
  closesAt: timestamp("closes_at", { withTimezone: true }),
  committedAt: timestamp("committed_at", { withTimezone: true }),
  definitionHash: varchar("definition_hash", { length: 128 }),
  version: integer("version").notNull().default(1),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const questions = pgTable("questions", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  pollId: text("poll_id")
    .notNull()
    .references(() => polls.id, { onDelete: "cascade" }),
  kind: qKindEnum("kind").notNull(),
  prompt: varchar("prompt", { length: 2000 }).notNull(),
  orderIndex: integer("order_index").notNull(),
  settings: jsonb("settings"),
});

export const options = pgTable("options", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  questionId: text("question_id")
    .notNull()
    .references(() => questions.id, { onDelete: "cascade" }),
  label: varchar("label", { length: 2000 }).notNull(),
  orderIndex: integer("order_index").notNull(),
});

export const eligibilityLists = pgTable("eligibility_lists", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  pollId: text("poll_id")
    .notNull()
    .references(() => polls.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 200 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const eligibilityItems = pgTable(
  "eligibility_list_items",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    listId: text("list_id")
      .notNull()
      .references(() => eligibilityLists.id, { onDelete: "cascade" }),
    email: varchar("email", { length: 255 }).notNull(),
    displayName: varchar("display_name", { length: 200 }),
    invited: boolean("invited").notNull().default(false),
    redeemed: boolean("redeemed").notNull().default(false),
    inviteTokenHash: varchar("invite_token_hash", { length: 128 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (t) => ({
    listEmailIdx: uniqueIndex("eligibility_email_unique").on(t.listId, t.email),
  }),
);

export const ballots = pgTable("ballots", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  pollId: text("poll_id")
    .notNull()
    .references(() => polls.id, { onDelete: "cascade" }),
  voterRef: varchar("voter_ref", { length: 255 }),
  anonymous: boolean("anonymous").notNull().default(true),
  submittedAt: timestamp("submitted_at", { withTimezone: true }),
  originIpHash: varchar("origin_ip_hash", { length: 128 }),
  deviceTokenHash: varchar("device_token_hash", { length: 128 }),
  userAgentHash: varchar("user_agent_hash", { length: 128 }),
});

export const votes = pgTable("votes", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  ballotId: text("ballot_id")
    .notNull()
    .references(() => ballots.id, { onDelete: "cascade" }),
  pollId: text("poll_id")
    .notNull()
    .references(() => polls.id, { onDelete: "cascade" }),
  questionId: text("question_id")
    .notNull()
    .references(() => questions.id),
  optionId: text("option_id"),
  freeText: varchar("free_text", { length: 4000 }),
  weight: integer("weight").notNull().default(1),
});

export const voteAggregates = pgTable(
  "vote_aggregates",
  {
    pollId: text("poll_id")
      .notNull()
      .references(() => polls.id, { onDelete: "cascade" }),
    questionId: text("question_id").notNull(),
    optionId: text("option_id"),
    count: integer("count").notNull().default(0),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.pollId, t.questionId, t.optionId] }),
  }),
);

export const shareLinks = pgTable("share_links", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  pollId: text("poll_id")
    .notNull()
    .references(() => polls.id, { onDelete: "cascade" }),
  scope: shareScope("scope").notNull(),
  visibility: visibilityEnum("visibility").notNull(),
  tokenHash: varchar("token_hash", { length: 128 }).notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const auditLogs = pgTable("audit_logs", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  ts: timestamp("ts", { withTimezone: true }).defaultNow(),
  actorType: actorEnum("actor_type").notNull(),
  actorId: varchar("actor_id", { length: 255 }),
  action: varchar("action", { length: 120 }).notNull(),
  entity: varchar("entity", { length: 120 }).notNull(),
  entityId: varchar("entity_id", { length: 120 }).notNull(),
  prevHash: varchar("prev_hash", { length: 128 }),
  hash: varchar("hash", { length: 128 }).notNull(),
});

export const passwordCredentials = pgTable(
  "password_credentials",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    provider: varchar("provider", { length: 32 }).notNull().default("credentials"),
    identifier: varchar("identifier", { length: 255 }).notNull(),
    hashedPassword: varchar("hashed_password", { length: 255 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (t) => ({
    providerIdentifierIdx: uniqueIndex("password_credentials_provider_identifier").on(
      t.provider,
      t.identifier,
    ),
  }),
);
