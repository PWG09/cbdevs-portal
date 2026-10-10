# CBDEVS Portal — Agent Instructions

## Product and architecture
- This repository is the CBDEVS client portal.
- The required platform direction is Next.js App Router + TypeScript + Supabase Auth/Postgres/RLS + Vercel. Do not add new Firebase dependencies or features.
- The shared Supabase project is `cbdevsmain` (ref `rpfupihdsqxprhptxypv`). Do not expose service-role secrets in browser code.
- The shared app key is `client-portal`. Enforce access to the correct organization and app; authenticated does not mean authorized.
- The live schema currently includes `profiles`, `organizations`, `organization_members`, `organization_apps`, `user_app_permissions`, `cbdevs_clients`, `cbdevs_projects`, `cbdevs_channels`, `cbdevs_messages`, `cbdevs_payments`, and `cbdevs_payment_links`. Inspect current columns and RLS policies before relying on them.
- The observed shared database currently has no organization memberships or portal project/client rows. Do not invent or seed production organization/user records. A trusted setup step is required before client data can appear.

## Security
- All authorization must be enforced by server-side checks and PostgreSQL RLS, not only client-side route guards.
- Never trust a client-supplied organization ID, user ID, role, app key, client ID, or project ID without validating it against authenticated context and RLS.
- Client portal users must only see projects, payment records, channels, and messages explicitly linked to their Supabase identity and organization.
- Review RLS for every new query and mutation. Do not disable RLS to make the UI work.
- Never expose `service_role`, secret keys, session tokens, or private provider credentials in client bundles or logs.
- Validate all message text, profile fields, URLs, IDs, and external input at runtime. Bound message lengths and result counts.
- Use safe external links (`rel="noopener noreferrer"` when opening a new tab).
- Never present mock/demo records as live customer data.

## Engineering
- Inspect existing code and schema before making changes. Prefer small, root-cause fixes over broad rewrites.
- Preserve user changes. Never perform destructive production actions without explicit authorization.
- Use strict TypeScript, accessible responsive UI, clear loading/error/empty states, and reusable components where useful.
- Add regression tests for bugs when feasible. Run lint, type checks, tests, and production build when an executable environment is available.
- Do not claim tests or deployments succeeded unless they were actually executed and verified.
- Keep migrations version-controlled and document deployment/setup prerequisites.
- At task completion, summarize changed files, security implications, commands/tests actually run, and anything that remains unverified.
