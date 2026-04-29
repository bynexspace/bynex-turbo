
-- Enums
CREATE TYPE public.app_role AS ENUM ('owner', 'member');
CREATE TYPE public.lead_status AS ENUM ('novo', 'contactado', 'negociando', 'convertido', 'perdido');
CREATE TYPE public.lead_origin AS ENUM ('google_maps', 'cnae', 'linkedin', 'manual');
CREATE TYPE public.task_type AS ENUM ('whatsapp', 'ligacao', 'email');
CREATE TYPE public.task_status AS ENUM ('pendente', 'feita', 'adiada');
CREATE TYPE public.plan_type AS ENUM ('essencial', 'pro', 'premium');
CREATE TYPE public.intel_mode AS ENUM ('sdr', 'closer');

-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Workspaces
CREATE TABLE public.workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  plano public.plan_type NOT NULL DEFAULT 'essencial',
  stripe_customer_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Workspace members (papel separado, sem recursão de RLS)
CREATE TABLE public.workspace_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL DEFAULT 'member',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, user_id)
);
CREATE INDEX idx_workspace_members_user ON public.workspace_members(user_id);
CREATE INDEX idx_workspace_members_workspace ON public.workspace_members(workspace_id);

-- Leads
CREATE TABLE public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  telefone TEXT,
  email TEXT,
  site TEXT,
  status public.lead_status NOT NULL DEFAULT 'novo',
  origem public.lead_origin NOT NULL DEFAULT 'manual',
  rating NUMERIC(3,2),
  reviews INTEGER,
  cidade TEXT,
  estado TEXT,
  endereco TEXT,
  valor_estimado NUMERIC(12,2),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_leads_workspace ON public.leads(workspace_id);
CREATE INDEX idx_leads_status ON public.leads(workspace_id, status);

-- Flows
CREATE TABLE public.flows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  descricao TEXT,
  passos JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_flows_workspace ON public.flows(workspace_id);

-- Tasks
CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
  flow_id UUID REFERENCES public.flows(id) ON DELETE SET NULL,
  tipo public.task_type NOT NULL,
  conteudo TEXT,
  status public.task_status NOT NULL DEFAULT 'pendente',
  data_execucao TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_tasks_workspace ON public.tasks(workspace_id);
CREATE INDEX idx_tasks_lead ON public.tasks(lead_id);

-- Integrations
CREATE TABLE public.integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL UNIQUE REFERENCES public.workspaces(id) ON DELETE CASCADE,
  apify_key TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Intel reports
CREATE TABLE public.intel_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  modo public.intel_mode NOT NULL,
  segmento TEXT,
  cidade TEXT,
  estado TEXT,
  porte TEXT,
  tempo_mercado TEXT,
  dores TEXT[],
  cnae TEXT,
  resultado JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_intel_workspace ON public.intel_reports(workspace_id);

-- Lead activities (histórico)
CREATE TABLE public.lead_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  tipo TEXT NOT NULL,
  descricao TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_activities_lead ON public.lead_activities(lead_id);

-- AI conversations
CREATE TABLE public.ai_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  titulo TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE public.ai_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.ai_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_ai_messages_conv ON public.ai_messages(conversation_id);

-- ============= Helper functions (SECURITY DEFINER) =============

CREATE OR REPLACE FUNCTION public.is_workspace_member(_workspace_id UUID, _user_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE workspace_id = _workspace_id AND user_id = _user_id
  );
$$;

CREATE OR REPLACE FUNCTION public.is_workspace_owner(_workspace_id UUID, _user_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE workspace_id = _workspace_id AND user_id = _user_id AND role = 'owner'
  );
$$;

-- ============= Trigger: cria profile + workspace ao signup =============

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  new_workspace_id UUID;
  user_name TEXT;
BEGIN
  user_name := COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1));

  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, user_name);

  INSERT INTO public.workspaces (nome, plano)
  VALUES (user_name || ' workspace', 'essencial')
  RETURNING id INTO new_workspace_id;

  INSERT INTO public.workspace_members (workspace_id, user_id, role)
  VALUES (new_workspace_id, NEW.id, 'owner');

  INSERT INTO public.integrations (workspace_id) VALUES (new_workspace_id);

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;
CREATE TRIGGER trg_leads_updated BEFORE UPDATE ON public.leads
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_integrations_updated BEFORE UPDATE ON public.integrations
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============= RLS =============

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.intel_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_messages ENABLE ROW LEVEL SECURITY;

-- profiles
CREATE POLICY "own profile read" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- workspaces
CREATE POLICY "members can read workspace" ON public.workspaces FOR SELECT
  USING (public.is_workspace_member(id, auth.uid()));
CREATE POLICY "owner can update workspace" ON public.workspaces FOR UPDATE
  USING (public.is_workspace_owner(id, auth.uid()));

-- workspace_members
CREATE POLICY "see members of my workspaces" ON public.workspace_members FOR SELECT
  USING (public.is_workspace_member(workspace_id, auth.uid()));
CREATE POLICY "owner manages members" ON public.workspace_members FOR ALL
  USING (public.is_workspace_owner(workspace_id, auth.uid()))
  WITH CHECK (public.is_workspace_owner(workspace_id, auth.uid()));

-- generic helper macro: members CRUD
CREATE POLICY "leads_all" ON public.leads FOR ALL
  USING (public.is_workspace_member(workspace_id, auth.uid()))
  WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()));

CREATE POLICY "flows_all" ON public.flows FOR ALL
  USING (public.is_workspace_member(workspace_id, auth.uid()))
  WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()));

CREATE POLICY "tasks_all" ON public.tasks FOR ALL
  USING (public.is_workspace_member(workspace_id, auth.uid()))
  WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()));

CREATE POLICY "integrations_read" ON public.integrations FOR SELECT
  USING (public.is_workspace_member(workspace_id, auth.uid()));
CREATE POLICY "integrations_write_owner" ON public.integrations FOR ALL
  USING (public.is_workspace_owner(workspace_id, auth.uid()))
  WITH CHECK (public.is_workspace_owner(workspace_id, auth.uid()));

CREATE POLICY "intel_all" ON public.intel_reports FOR ALL
  USING (public.is_workspace_member(workspace_id, auth.uid()))
  WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()));

CREATE POLICY "activities_all" ON public.lead_activities FOR ALL
  USING (public.is_workspace_member(workspace_id, auth.uid()))
  WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()));

CREATE POLICY "ai_conv_all" ON public.ai_conversations FOR ALL
  USING (public.is_workspace_member(workspace_id, auth.uid()))
  WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()));

CREATE POLICY "ai_msg_all" ON public.ai_messages FOR ALL
  USING (EXISTS (SELECT 1 FROM public.ai_conversations c WHERE c.id = conversation_id AND public.is_workspace_member(c.workspace_id, auth.uid())))
  WITH CHECK (EXISTS (SELECT 1 FROM public.ai_conversations c WHERE c.id = conversation_id AND public.is_workspace_member(c.workspace_id, auth.uid())));
