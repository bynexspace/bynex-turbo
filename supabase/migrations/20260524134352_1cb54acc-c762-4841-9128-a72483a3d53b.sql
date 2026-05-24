-- Revoke EXECUTE from anon/authenticated on internal SECURITY DEFINER helpers.
-- These are only used inside RLS policies / triggers (run as postgres), never called from the client.
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.is_workspace_member(uuid, uuid) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.is_workspace_owner(uuid, uuid) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.is_app_admin(uuid) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.ensure_unsubscribe_token(uuid, text) FROM anon, authenticated, public;