CREATE TYPE workspace_status AS ENUM ('ativo', 'suspenso');
ALTER TABLE public.workspaces ADD COLUMN status workspace_status NOT NULL DEFAULT 'ativo';