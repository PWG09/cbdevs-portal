-- Consolidate portal/admin read policies and cover the new foreign keys with indexes.
create index if not exists cbdevs_project_milestones_org_project_idx
  on public.cbdevs_project_milestones(organization_id, project_id);
create index if not exists cbdevs_project_documents_org_project_idx
  on public.cbdevs_project_documents(organization_id, project_id);

drop policy if exists cbdevs_channels_client_select on public.cbdevs_channels;
drop policy if exists cbdevs_channels_select on public.cbdevs_channels;
create policy cbdevs_channels_select on public.cbdevs_channels
for select to authenticated
using (
  (private.is_org_member(organization_id) and private.can_access_app(organization_id, 'admin'))
  or (
    project_id is not null
    and exists (
      select 1
      from public.cbdevs_projects p
      join public.cbdevs_clients c on c.id = p.client_id and c.organization_id = p.organization_id
      where p.id = cbdevs_channels.project_id
        and p.organization_id = cbdevs_channels.organization_id
        and c.linked_user_id = (select auth.uid())
        and c.active
    )
  )
);

drop policy if exists cbdevs_messages_client_select on public.cbdevs_messages;
drop policy if exists cbdevs_messages_select on public.cbdevs_messages;
create policy cbdevs_messages_select on public.cbdevs_messages
for select to authenticated
using (
  (private.is_org_member(organization_id) and private.can_access_app(organization_id, 'admin'))
  or exists (
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
drop policy if exists cbdevs_messages_insert on public.cbdevs_messages;
create policy cbdevs_messages_insert on public.cbdevs_messages
for insert to authenticated
with check (
  sender_id = (select auth.uid())
  and char_length(trim(text)) between 1 and 4000
  and (
    (private.is_org_member(organization_id) and private.can_access_app(organization_id, 'admin'))
    or exists (
      select 1
      from public.cbdevs_channels ch
      join public.cbdevs_projects p on p.id = ch.project_id and p.organization_id = ch.organization_id
      join public.cbdevs_clients c on c.id = p.client_id and c.organization_id = p.organization_id
      where ch.id = cbdevs_messages.channel_id
        and ch.organization_id = cbdevs_messages.organization_id
        and c.linked_user_id = (select auth.uid())
        and c.active
    )
  )
);

drop policy if exists cbdevs_payment_links_client_select on public.cbdevs_payment_links;
drop policy if exists cbdevs_payment_links_select on public.cbdevs_payment_links;
create policy cbdevs_payment_links_select on public.cbdevs_payment_links
for select to authenticated
using (
  (private.is_org_member(organization_id) and private.can_access_app(organization_id, 'admin'))
  or (
    status = 'active'
    and (expires_at is null or expires_at > now())
    and (
      exists (
        select 1 from public.cbdevs_clients c
        where c.id = cbdevs_payment_links.client_id
          and c.organization_id = cbdevs_payment_links.organization_id
          and c.linked_user_id = (select auth.uid())
          and c.active
      )
      or exists (
        select 1
        from public.cbdevs_projects p
        join public.cbdevs_clients c on c.id = p.client_id and c.organization_id = p.organization_id
        where p.id = cbdevs_payment_links.project_id
          and p.organization_id = cbdevs_payment_links.organization_id
          and c.linked_user_id = (select auth.uid())
          and c.active
      )
    )
  )
);

drop policy if exists cbdevs_milestones_client_select on public.cbdevs_project_milestones;
drop policy if exists cbdevs_milestones_admin_select on public.cbdevs_project_milestones;
create policy cbdevs_project_milestones_select on public.cbdevs_project_milestones
for select to authenticated
using (
  (private.is_org_member(organization_id) and private.can_access_app(organization_id, 'admin'))
  or exists (
    select 1
    from public.cbdevs_projects p
    join public.cbdevs_clients c on c.id = p.client_id and c.organization_id = p.organization_id
    where p.id = cbdevs_project_milestones.project_id
      and p.organization_id = cbdevs_project_milestones.organization_id
      and c.linked_user_id = (select auth.uid())
      and c.active
  )
);

drop policy if exists cbdevs_documents_client_select on public.cbdevs_project_documents;
drop policy if exists cbdevs_documents_admin_select on public.cbdevs_project_documents;
create policy cbdevs_project_documents_select on public.cbdevs_project_documents
for select to authenticated
using (
  (private.is_org_member(organization_id) and private.can_access_app(organization_id, 'admin'))
  or exists (
    select 1
    from public.cbdevs_projects p
    join public.cbdevs_clients c on c.id = p.client_id and c.organization_id = p.organization_id
    where p.id = cbdevs_project_documents.project_id
      and p.organization_id = cbdevs_project_documents.organization_id
      and c.linked_user_id = (select auth.uid())
      and c.active
  )
);