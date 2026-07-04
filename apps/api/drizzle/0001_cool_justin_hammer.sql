CREATE TABLE "dashboard_note" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"body" text DEFAULT '' NOT NULL,
	"sign" text DEFAULT '' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
