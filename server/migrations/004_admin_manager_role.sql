BEGIN;
ALTER TABLE akira_admin_roles
  DROP CONSTRAINT IF EXISTS akira_admin_roles_role_check;
ALTER TABLE akira_admin_roles
  ADD CONSTRAINT akira_admin_roles_role_check
  CHECK (role IN ('super_admin', 'admin', 'manager', 'moderator'));
COMMIT;
