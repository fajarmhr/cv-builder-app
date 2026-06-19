-- Enable Row Level Security on all public tables exposed via Supabase PostgREST.
-- The app accesses the database only through Prisma using the `postgres` role
-- (the table owner), which bypasses RLS — so the app keeps working normally.
-- With no policies defined, the anon/authenticated PostgREST roles are denied
-- all access, closing the public Data API exposure flagged by the Supabase linter.

ALTER TABLE "public"."User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."Resume" ENABLE ROW LEVEL SECURITY;
