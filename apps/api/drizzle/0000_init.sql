CREATE TABLE "attachments" (
	"id" serial PRIMARY KEY NOT NULL,
	"paper_id" integer NOT NULL,
	"filename" text NOT NULL,
	"content_type" text DEFAULT 'application/octet-stream' NOT NULL,
	"size" bigint DEFAULT 0 NOT NULL,
	"storage_key" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "authors" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"title" text DEFAULT '' NOT NULL,
	"unit" text DEFAULT '' NOT NULL,
	"email" text DEFAULT '' NOT NULL,
	"orcid" text DEFAULT '' NOT NULL,
	"bank" text DEFAULT '' NOT NULL,
	"note" text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "conferences" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"rank" text DEFAULT '' NOT NULL,
	"location" text DEFAULT '' NOT NULL,
	"deadline" text DEFAULT '' NOT NULL,
	"confdate" text DEFAULT '' NOT NULL,
	"fee" integer DEFAULT 0 NOT NULL,
	"fee_text" text DEFAULT '' NOT NULL,
	"web" text DEFAULT '' NOT NULL,
	"note" text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "journals" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"rank" text DEFAULT '' NOT NULL,
	"publisher" text DEFAULT '' NOT NULL,
	"issn" text DEFAULT '' NOT NULL,
	"impact" text DEFAULT '' NOT NULL,
	"country" text DEFAULT '' NOT NULL,
	"web" text DEFAULT '' NOT NULL,
	"fee" text DEFAULT '' NOT NULL,
	"note" text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "papers" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"type" text DEFAULT 'Tạp chí' NOT NULL,
	"venue" text DEFAULT '' NOT NULL,
	"rank" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'Nộp bài' NOT NULL,
	"date" text DEFAULT '' NOT NULL,
	"authors" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"costs" jsonb DEFAULT '{"apc":0,"conf":0,"other":0}'::jsonb NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"doi" text DEFAULT '' NOT NULL,
	"link" text DEFAULT '' NOT NULL,
	"publink" text DEFAULT '' NOT NULL,
	"localpath" text DEFAULT '' NOT NULL,
	"role" text DEFAULT '' NOT NULL,
	"payment" text DEFAULT '' NOT NULL,
	"apc_entries" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"fin" jsonb,
	"history" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"position" double precision DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reward_categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"abbr" text DEFAULT '' NOT NULL,
	"group" text DEFAULT '' NOT NULL,
	"amount" integer DEFAULT 0 NOT NULL,
	"issn" text DEFAULT '' NOT NULL,
	"note" text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "special_issues" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"journal" text DEFAULT '' NOT NULL,
	"rank" text DEFAULT '' NOT NULL,
	"deadline" text DEFAULT '' NOT NULL,
	"type" text DEFAULT 'Special Issue' NOT NULL,
	"note" text DEFAULT '' NOT NULL
);
--> statement-breakpoint
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_paper_id_papers_id_fk" FOREIGN KEY ("paper_id") REFERENCES "public"."papers"("id") ON DELETE cascade ON UPDATE no action;