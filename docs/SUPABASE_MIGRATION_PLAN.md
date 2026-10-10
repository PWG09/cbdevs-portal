# CBDEVS Client Portal — Supabase Migration and Release Checklist

## Implemented in the application branch

- Supabase browser client using `@supabase/ssr`.
- Middleware session validation/refresh using Supabase Auth.
- Supabase password login and password recovery completion.
- Client-linked project loading through the shared Postgres schema and RLS.
- Supabase-backed profile display and settings.
- Supabase payment history and active payment links.
- Supabase project chat.
- Removal of the demo-project fallback.
- Additive SQL migration for milestones, documents, project channels, and client-specific read/send policies.
- Repository instructions in `AGENTS.md`.

## Shared database facts checked

The central Supabase project is `cbdevsmain`, ref `rpfupihdsqxprhptxypv`.

Relevant existing tables include `profiles`, `organizations`, `organization_members`, `organization_apps`, `user_app_permissions`, `app_catalog`, `cbdevs_clients`, `cbdevs_projects`, `cbdevs_channels`, `cbdevs_messages`, `cbdevs_payments`, and `cbdevs_payment_links`.

The schema uses snake_case fields and RLS. Client access is associated through `cbdevs_clients.linked_user_id`; matching an email address alone is not sufficient.

## Required setup before clients can use the portal

1. Apply all SQL files in `supabase/migrations/` in filename order. The current portal migrations add the client portal schema/policies and consolidate policies/indexes for performance.
2. Verify all new tables, grants, policies, trigger, and foreign keys after application.
3. Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in Vercel Preview and Production.
4. Configure Supabase Auth Site URL and redirect allowlist for the portal and `/reset-password`.
5. Provision client Auth users through a trusted administrator workflow and link the UUID to `cbdevs_clients.linked_user_id`.
6. Ensure each client/project/payment/link uses the same organization and client relationships.
7. Test access with two separate client accounts and an unrelated account.
8. Verify chat reads and writes, payment history, document URLs, and password recovery.
9. Run lint, typecheck, build, and review Vercel preview logs before production promotion.

## Important limits

- No client accounts or projects are created by this migration.
- Existing Firebase Auth identities and Firestore data are not imported automatically. If legacy data exists, it requires a separate approved, validated migration.
- The portal does not create accounts or assign privileges from public metadata.
- Payment links are displayed from trusted database records; the portal does not create or confirm payments.
- Email delivery depends on the Supabase Auth email provider and redirect settings.
- Build/deployment success does not replace RLS and multi-user security tests.

## Security follow-up

The Supabase security advisor previously reported leaked-password protection as disabled. Review and enable this in Supabase Auth settings according to the CBDEVS password policy. Do not weaken account protections to work around email or password recovery configuration.
