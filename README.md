# CBDEVS Client Portal

Private customer portal for CBDEVS clients to review project progress, milestones, delivery links, payment history, and project messages.

## Stack

- Next.js App Router, React, TypeScript, Tailwind CSS
- Supabase Auth with SSR cookie handling
- Supabase Postgres and Row Level Security (RLS)
- Vercel deployments

Firebase has been removed from the application. Do not reintroduce Firebase for new portal features.

## Environment

Copy `.env.example` to `.env.local` and set:

- `NEXT_PUBLIC_SUPABASE_URL`: the central CBDEVS Supabase project URL.
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: the public/publishable key for that project. The legacy `NEXT_PUBLIC_SUPABASE_ANON_KEY` is supported as a fallback.

Never set a Supabase `service_role` or secret key in a `NEXT_PUBLIC_` variable. The browser uses the publishable key and relies on authenticated user JWTs plus RLS.

## Development

```bash
npm ci
npm run dev
```

Quality checks:

```bash
npm run lint
npm run typecheck
npm run build
```

## Supabase schema

The portal reads from the shared `cbdevsmain` project using the existing tables:

- `profiles`
- `cbdevs_clients`
- `cbdevs_projects`
- `cbdevs_payments`
- `cbdevs_payment_links`
- `cbdevs_channels`
- `cbdevs_messages`

The migrations in `supabase/migrations/` add project milestones/documents, project-channel linking, client-specific RLS policies, consolidated policy evaluation, and indexes for the new foreign keys. Apply them in filename order and verify each version in Supabase migration history.

Apply the migration to the intended Supabase project after reviewing it. Verify the tables and policies afterward. Do not disable RLS to fix a portal error.

## Linking a client account

Client accounts are provisioned by an authorized CBDEVS administrator. Public self-registration is intentionally not provided.

1. Create or invite the user through Supabase Auth using the approved account-provisioning workflow.
2. Obtain the resulting Auth user UUID from the trusted Auth dashboard/admin workflow.
3. In the matching `cbdevs_clients` row, set `linked_user_id` to that UUID and keep `active = true`.
4. Ensure the linked client and projects share the same `organization_id`, and each project references the correct `client_id`.
5. Verify the user can read only their own project, milestones, documents, payments, payment links, and project chat.
6. Verify another authenticated user cannot read or modify those records.

Never allow the client to choose or update their own `linked_user_id`, organization, project ownership, role, or permissions from the portal.

## Project and chat model

- Project fields come from `cbdevs_projects`.
- Milestones come from `cbdevs_project_milestones`.
- Documents come from `cbdevs_project_documents`.
- Each project is linked to a channel through `cbdevs_channels.project_id`.
- Messages use `cbdevs_messages` and are restricted by the linked project/client RLS policies.
- Payment history uses `cbdevs_payments`; checkout links use `cbdevs_payment_links`.

The portal does not treat email matching as proof of ownership. Access is linked to the authenticated Supabase user UUID.

## Security

- Authentication sessions are verified through Supabase Auth.
- Row-level authorization is enforced in Postgres. Client-side guards are only a UX layer.
- Client queries never use service-role credentials.
- Profile settings cannot change a user's role or permissions.
- Chat message bodies are limited to 4,000 characters and validated by database policy.
- External payment links must use HTTPS and open with safe target attributes.
- No demo project data is used as a fallback for live accounts.

## Deployment checklist

1. Set the Supabase URL and publishable key in Vercel for Preview and Production.
2. Confirm the Supabase Auth Site URL and redirect allowlist include the exact portal domains, including the password recovery route.
3. Apply the SQL migration and verify the resulting schema and RLS policies.
4. Link a test client account and project using the trusted provisioning process.
5. Test cross-client reads, writes, chat access, and payment visibility with at least two separate test accounts.
6. Run lint, TypeScript, and production build checks.
7. Validate the Vercel preview before promoting to production.

A successful build alone is not proof that RLS, Auth redirects, email delivery, or real project data are configured correctly.
