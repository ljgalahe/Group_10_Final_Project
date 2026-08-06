-- Single Management approval: contracts no longer wait on Accountant.
-- Promote any drafts already approved by Manager under the old dual-approval flow.
comment on column contracts.approval_state is
  'draft | pending_approvals | approved | changes_requested — customer sees approved (and legacy) only; Management approval alone sets approved';

update public.contracts
set
  approval_state = 'approved',
  status = case when status = 'draft' then 'active' else status end
where approval_state = 'pending_approvals'
  and manager_approved_at is not null;
