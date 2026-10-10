-- CBDEVS Client Portal support.
-- Additive migration: no existing records are deleted or rewritten.
-- Apply only after reviewing the target Supabase project and deployment window.

begin;

alter table public.cbdevs_channels
  add column if not exists project_id uuid references public.cbdevs_projects(id) on delete cascade;

create unique index if not exists cbdevs_projects_org_id_id_uq
  on public.cbdevs_projects(organization_id, id);

create index if not exists cbdevs_channels_project_id_idx
  on public.cbdevs_channels(project_id);

create table if not exists public.cbdevs_project_milestones (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null references public.cbdevs_projects(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 1 and 240),
  status text not null default 'Pendiente'
    check (status in ('Pendiente', 'En progreso', 'Completado')),
  due_date date,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint cbdevs_project_milestones_project_org_fk
    foreign key (organization_id, project_id)
    references public.cbdevs_projects(organization_id, id)
    on delete cascade
);

create index if not exists cbdevs_project_milestones_project_sort_idx
  on public.cbdevs_project_milestones(project_id, sort_order, created_at);

create table if not exists public.cbdevs_project_documents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null references public.cbdevs_projects(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 1 and 240),
  url text not null check (url ~ '^https://'),
  document_type text not null default 'Otro'
    check (document_type in ('Propuesta', 'Contrato', 'Factura', 'Entrega', 'Otro')),
  created_at timestamptz not null default now(),
  constraint cbdevs_project_documents_project_org_fk
    foreign key (organization_id, project_id)
    references public.cbdevs_projects(organization_id, id)
    on delete cascade
);

create index if not exists cbdevs_project_documents_project_created_idx
  on public.cbdevs_project_documents(project_id, created_at desc);

alter table public.cbdevs_project_milestones enable row level security;
alter table public.cbdevs_project_documents enable row level security;

grant select, insert, update, delete on public.cbdevs_project_milestones to authenticated;
grant select, insert, update, delete on public.cbdevs_project_documents to authenticated;

drop policy if exists cbdevs_milestones_admin_select on public.cbdevs_project_milestones;
create policy cbdevs_milestones_admin_select on public.cbdevs_project_milestones
for select to authenticated
using (private.is_org_member(organization_id) and private.can_access_app(organization_id, 'admin'));

drop policy if exists cbdevs_milestones_admin_insert on public.cbdevs_project_milestones;
create policy cbdevs_milestones_admin_insert on public.cbdevs_project_milestones
for insert to authenticated
with check (
  private.has_org_role(organization_id, array['owner','admin','manager']::text[])
  and private.can_access_app(organization_id, 'admin')
  and exists (select 1 from public.cbdevs_projects p where p.id = cbdevs_project_milestones.project_id and p.organization_id = cbdevs_project_milestones.organization_id)
);

drop policy if exists cbdevs_milestones_admin_update on public.cbdevs_project_milestones;
create policy cbdevs_milestones_admin_update on public.cbdevs_project_milestones
for update to authenticated
using (private.has_org_role(organization_id, array['owner','admin','manager']::text[]) and private.can_access_app(organization_id, 'admin'))
with check (
  private.has_org_role(organization_id, array['owner','admin','manager']::text[])
  and private.can_access_app(organization_id, 'admin')
  and exists (select 1 from public.cbdevs_projects p where p.id = cbdevs_project_documents.project_id and p.organization_id = cbdevs_project_documents.organization_id)
);

drop policy if exists cbdevs_milestones_admin_delete on public.cbdevs_project_milestones;
create policy cbdevs_milestones_admin_delete on public.cbdevs_project_milestones
for delete to authenticated
using (private.has_org_role(organization_id, array['owner','admin']::text[]) and private.can_access_app(organization_id, 'admin'));

drop policy if exists cbdevs_milestones_client_select on public.cbdevs_project_milestones;
create policy cbdevs_milestones_client_select on public.cbdevs_project_milestones
for select to authenticated
using (
  exists (
    select 1 from public.cbdevs_projects p
    join public.cbdevs_clients c on c.id = p.client_id and c.organization_id = p.organization_id
    where p.id = cbdevs_project_milestones.project_id
      and p.organization_id = cbdevs_project_milestones.organization_id
      and c.linked_user_id = (select auth.uid())
      and c.active
  )
);

drop policy if exists cbdevs_documents_admin_select on public.cbdevs_project_documents;
create policy cbdevs_documents_admin_select on public.cbdevs_project_documents
for select to authenticated
using (private.is_org_member(organization_id) and private.can_access_app(organization_id, 'admin'));

drop policy if exists cbdevs_documents_admin_insert on public.cbdevs_project_documents;
create policy cbdevs_documents_admin_insert on public.cbdevs_project_documents
for insert to authenticated
with check (
  private.has_org_role(organization_id, array['owner','admin','manager']::text[])
  and private.can_access_app(organization_id, 'admin')
  and exists (select 1 from public.cbdevs_projects p where p.id = project_id and p.organization_id = organization_id)
);

drop policy if exists cbdevs_documents_admin_update on public.cbdevs_project_documents;
create policy cbdevs_documents_admin_update on public.cbdevs_project_documents
for update to authenticated
using (private.has_org_role(organization_id, array['owner','admin','manager']::text[]) and private.can_access_app(organization_id, 'admin'))
with check (
  private.has_org_role(organization_id, array['owner','admin','manager']::text[])
  and private.can_access_app(organization_id, 'admin')
  and exists (select 1 from public.cbdevs_projects p where p.id = project_id and p.organization_id = organization_id)
);

drop policy if exists cbdevs_documents_admin_delete on public.cbdevs_project_documents;
create policy cbdevs_documents_admin_delete on public.cbdevs_project_documents
for delete to authenticated
using (private.has_org_role(organization_id, array['owner','admin']::text[]) and private.can_access_app(organization_id, 'admin'));

drop policy if exists cbdevs_documents_client_select on public.cbdevs_project_documents;
create policy cbdevs_documents_client_select on public.cbdevs_project_documents
for select to authenticated
using (
  exists (
    select 1 from public.cbdevs_projects p
    join public.cbdevs_clients c on c.id = p.client_id and c.organization_id = p.organization_id
    where p.id = cbdevs_project_documents.project_id
      and p.organization_id = cbdevs_project_documents.organization_id
      and c.linked_user_id = (select auth.uid())
      and c.active
  )
);

-- Client portal access is limited to projects linked to the signed-in auth user.
drop policy if exists cbdevs_clients_select on public.cbdevs_clients;
create policy cbdevs_clients_select on public.cbdevs_clients
for select to authenticated
using (
  (private.is_org_member(organization_id) and private.can_access_app(organization_id, 'admin'))
  or (linked_user_id = (select auth.uid()) and active)
);

drop policy if exists cbdevs_projects_select on public.cbdevs_projects;
create policy cbdevs_projects_select on public.cbdevs_projects
for select to authenticated
using (
  (private.is_org_member(organization_id) and private.can_access_app(organization_id, 'admin'))
  or exists (
    select 1 from public.cbdevs_clients c
    where c.id = cbdevs_projects.client_id
      and c.organization_id = cbdevs_projects.organization_id
      and c.linked_user_id = (select auth.uid())
      and c.active
  )
);

drop policy if exists cbdevs_payments_select on public.cbdevs_payments;
create policy cbdevs_payments_select on public.cbdevs_payments
for select to authenticated
using (
  (private.is_org_member(organization_id) and private.can_access_app(organization_id, 'admin'))
  or exists (
    select 1 from public.cbdevs_clients c
    where c.id = cbdevs_payments.client_id
      and c.organization_id = cbdevs_payments.organization_id
      and c.linked_user_id = (select auth.uid())
      and c.active
  )
);

drop policy if exists cbdevs_channels_client_select on public.cbdevs_channels;
create policy cbdevs_channels_client_select on public.cbdevs_channels
for select to authenticated
using (
  project_id is not null and exists (
    select 1 from public.cbdevs_projects p
    join public.cbdevs_clients c on c.id = p.client_id and c.organization_id = p.organization_id
    where p.id = cbdevs_channels.project_id
      and p.organization_id = cbdevs_channels.organization_id
      and c.linked_user_id = (select auth.uid())
      and c.active
  )
);

drop policy if exists cbdevs_messages_client_select on public.cbdevs_messages;
create policy cbdevs_messages_client_select on public.cbdevs_messages
for select to authenticated
using (
  exists (
    select 1
    from public.cbdevs_channels ch
    join public.cbdevs_projects p on p.id = ch.project_id and p.organization_id = ch.organization_id
    join public.cbdevs_clients c on c.id = p.client_id and c.organization_id = p.organization_id
    where ch.id = cbdevs_messages.channel_id
      and ch.organization_id = cbdevs_messages.organization_id
      and c.linked_user_id = (select auth.uid())
      and c.active
  )
);

drop policy if exists cbdevs_messages_client_insert on public.cbdevs_messages;
create policy cbdevs_messages_client_insert on public.cbdevs_messages
for insert to authenticated
with check (
  sender_id = (select auth.uid())
  and char_length(trim(text)) between 1 and 4000
  and exists (
    select 1
    from public.cbdevs_channels ch
    join public.cbdevs_projects p on p.id = ch.project_id and p.organization_id = ch.organization_id
    join public.cbdevs_clients c on c.id = p.client_id and c.organization_id = p.organization_id
    where ch.id = cbdevs_messages.channel_id
      and ch.organization_id = cbdevs_messages.organization_id
      and c.linked_user_id = (select auth.uid())
      and c.active
  )
);

drop policy if exists cbdevs_payment_links_client_select on public.cbdevs_payment_links;
create policy cbdevs_payment_links_client_select on public.cbdevs_payment_links
for select to authenticated
using (
  status = 'active'
  and (expires_at is null or expires_at > now())
  and exists (
    select 1 from public.cbdevs_clients c
    where c.id = cbdevs_payment_links.client_id
      and c.organization_id = cbdevs_payment_links.organization_id
      and c.linked_user_id = (select auth.uid())
      and c.active
  )
);

-- Create a private channel for new projects, without requiring client-supplied channel IDs.
create or replace function private.create_project_channel()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  insert into public.cbdevs_channels (organization_id, name, created_by, project_id)
  values (new.organization_id, 'project:' || new.id::text, new.created_by, new.id)
  on conflict do nothing;
  return new;
end;
$;

revoke all on function private.create_project_channel() from public, anon, authenticated;

drop trigger if exists cbdevs_projects_create_channel on public.cbdevs_projects;
create trigger cbdevs_projects_create_channel
after insert on public.cbdevs_projects
for each row execute function private.create_project_channel();

-- Backfill channels for existing projects only when no channel is already linked.
insert into public.cbdevs_channels (organization_id, name, created_by, project_id)
select p.organization_id, 'project:' || p.id::text, p.created_by, p.id
from public.cbdevs_projects p
where not exists (
  select 1 from public.cbdevs_channels ch
  where ch.project_id = p.id
)
on conflict do nothing;

commit;