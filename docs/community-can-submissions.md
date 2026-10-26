# Community can submissions

## What this feature does

- An unknown barcode on the scanner opens a contribution form.
- Signed-in collectors can submit the can name, optional metadata, and front/back/barcode photos.
- Submissions are stored in `public.can_submissions` with status `pending`; they are not added to `public.cans` automatically.
- Trusted admins review submissions at `/admin-submissions`. Approval runs the database function `public.approve_can_submission(uuid)`, which checks the barcode and promotes the submission atomically. Rejected submissions remain separate from the catalogue.

## Database setup required

The migration is in `supabase/migrations/20261026000000_community_can_submissions.sql`.

**Merging this pull request does not, by itself, apply SQL to the live Supabase database.** Apply the migration to the correct Supabase project before testing the contribution flow. If this project is not yet using Supabase CLI migrations, review the migration and run it once in the Supabase Dashboard SQL Editor. Do not run it against a different project or run it repeatedly as an ad-hoc script; use the repository migration workflow for subsequent changes.

The migration creates the submissions table, row-level security policies, the `can-submissions` Storage bucket and the approval function. It does not alter or delete existing catalogue or collection rows.

## Configure an administrator

The moderation route and the database policies both require the trusted JWT claim `app_metadata.role = "admin"`. Assign this claim only through a trusted Supabase Auth Admin workflow for the intended reviewer account. Do **not** put the role in editable `user_metadata`, and do not expose a service-role key in the client application. After updating app metadata, sign out and sign in again so the session receives the updated claim.

## Basic verification checklist

1. Sign in as a normal collector and scan a barcode that is not in `cans`.
2. Submit a valid front photo and required can name; verify a pending row appears in `can_submissions`.
3. Confirm the submission is not visible in the public catalogue or collection.
4. Sign in as a trusted admin and open `/admin-submissions`.
5. Approve a submission and confirm it appears in `cans`; reject another and confirm it does not.
6. Try submitting the same barcode twice and verify the duplicate is rejected.
