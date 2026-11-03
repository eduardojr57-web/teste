CREATE TABLE "channels" (
	"id" text PRIMARY KEY NOT NULL,
	"server" text,
	"name" text NOT NULL,
	"topic" text DEFAULT '' NOT NULL,
	"type" text DEFAULT 'text' NOT NULL,
	"peer_a" text,
	"peer_b" text,
	"created" bigint NOT NULL
);

CREATE INDEX "channel_server" ON "channels" ("server");
CREATE TABLE "invites" (
	"code" text PRIMARY KEY NOT NULL,
	"server" text NOT NULL,
	"creator" text NOT NULL,
	"expires" bigint NOT NULL
);

CREATE INDEX "invite_server" ON "invites" ("server");
CREATE TABLE "members" (
	"server" text NOT NULL,
	"user" text NOT NULL,
	"role" text DEFAULT 'member' NOT NULL,
	PRIMARY KEY("server", "user")
);

CREATE TABLE "messages" (
	"id" text PRIMARY KEY NOT NULL,
	"channel" text NOT NULL,
	"user" text NOT NULL,
	"content" text NOT NULL,
	"created" bigint NOT NULL,
	"edited" bigint,
	"pinned" bigint DEFAULT 0 NOT NULL,
	"attachment" text
);

CREATE INDEX "message_channel_time" ON "messages" ("channel","created");
CREATE TABLE "reactions" (
	"message" text NOT NULL,
	"user" text NOT NULL,
	"emoji" text NOT NULL,
	PRIMARY KEY("message", "user", "emoji")
);

CREATE TABLE "servers" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"owner" text NOT NULL,
	"color" text NOT NULL,
	"created" bigint NOT NULL
);

CREATE TABLE "signals" (
	"id" bigserial PRIMARY KEY,
	"channel" text NOT NULL,
	"sender" text NOT NULL,
	"recipient" text NOT NULL,
	"payload" text NOT NULL,
	"created" bigint NOT NULL
);

CREATE INDEX "signal_recipient" ON "signals" ("recipient","id");
CREATE TABLE "typing" (
	"user" text PRIMARY KEY NOT NULL,
	"channel" text NOT NULL,
	"active" bigint NOT NULL
);

CREATE TABLE "uploads" (
	"id" text PRIMARY KEY NOT NULL,
	"channel" text NOT NULL,
	"user" text NOT NULL,
	"name" text NOT NULL,
	"mime" text NOT NULL,
	"size" bigint NOT NULL,
	"created" bigint NOT NULL
);

CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"bio" text DEFAULT '' NOT NULL,
	"color" text DEFAULT '#8b7bff' NOT NULL,
	"status" text DEFAULT 'online' NOT NULL,
	"active" bigint NOT NULL
);

CREATE TABLE "voice" (
	"user" text PRIMARY KEY NOT NULL,
	"channel" text NOT NULL,
	"active" bigint NOT NULL
);

CREATE INDEX "voice_channel" ON "voice" ("channel");