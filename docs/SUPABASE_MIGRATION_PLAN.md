# CBDEVS Client Portal — Supabase Migration Plan

## Current state verified from the repository
- The app currently uses Firebase Auth and Firestore in the login form, auth guard, project hook, chat, billing, profile settings, and shell.
- `lib/mock-data.ts` contains sample customer projects. The project hook previously showed a demo project before reading the signed-in user's data; that fallback has been removed.
- The shared Supabase project `cbdevsmain` already has the `client-portal` app registration and these relevant tables: `profiles`, `organizations`, `organization_members`, `organization_apps`, `user_app_permissions`, `cbdevs_clients`, `cbdevs_projects`, `cbdevs_channels`, `cbdevs_messages`, `cbdevs_payments`, and `cbdevs_payment_links`.
- The shared project currently has no organization memberships and no client/project rows in the inspected tables. Do not assume the portal can show a client's records until trusted organization and client-user linking is configured.
- Existing shared schema columns do not fully match the portal's current model. Projects use snake_case fields, payments do not currently expose the portal's old Firestore `description` and `checkoutUrl` shape, and chat messages are linked to channels rather than directly to projects.

## Required implementation sequence
1. Install and pin `@supabase/supabase-js` and `@supabase/ssr`, updating the lockfile with the package manager rather than editing it manually.
2. Add browser and server Supabase clients using the current supported Next.js SSR guidance. Use the publishable key in public client configuration only; never expose a service-role key.
3. Replace Firebase Auth with Supabase Auth and server-verified sessions. Ensure protected routes and server operations verify the user, not only client state.
4. Replace Firestore reads with the existing shared Supabase schema. Explicitly map snake_case database rows to typed portal models; do not cast arbitrary database rows to the old TypeScript types.
5. Link a portal user through `cbdevs_clients.linked_user_id`. Project access must be based on that relationship and the existing organization/app policies, not on an email string alone.
6. Review chat access before enabling client messaging. Current shared `cbdevs_messages` policies require organization membership and Admin app access; that does not yet demonstrate that a client-only portal account can read/write project messages. Add an explicit, narrowly scoped client policy and a reliable project-to-channel relationship before releasing chat.
7. Map payment history to `cbdevs_payments` and active checkout links to `cbdevs_payment_links`. Verify payment records and checkout URLs come from trusted provider/backend state, not client-supplied data.
8. Move profile editing to `profiles`. A portal user must not be able to edit roles, membership status, or app permissions.
9. Remove Firebase packages, configuration, rules, and imports only after all Firebase-dependent code has been replaced and the new flows have been verified.
10. Add tests for unauthenticated access, cross-organization access, unlinked users, revoked memberships, client messaging, payment visibility, and profile role escalation.
11. Run lint, TypeScript, tests, and production build; then verify Vercel environment variables and preview deployment before production release.

## Important release blockers
- A trusted setup procedure must establish the organization and appropriate membership/application access. Do not create privileged users based on the first signup or user-editable metadata.
- The current database schema needs a reviewed migration for project milestones/documents and the project-to-channel relationship if those existing portal features must remain.
- RLS for client messaging must be designed around linked client identity and project ownership. Do not disable RLS or grant broad organization access as a shortcut.
- Existing Firebase accounts and records are not automatically migrated by changing environment variables. If legacy Firebase data exists, plan and validate a separate explicit migration; do not silently import or delete it.

## Security note
The shared Supabase project's security advisor currently reports leaked-password protection as disabled. Consider enabling it in Supabase Auth settings after checking the desired signup/password policy:
https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection
