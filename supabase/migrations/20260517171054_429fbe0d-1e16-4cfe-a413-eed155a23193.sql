
-- ENUMS
CREATE TYPE public.email_sender_status AS ENUM ('pendente', 'verificado', 'falhou');
CREATE TYPE public.email_list_tipo AS ENUM ('manual', 'smart');
CREATE TYPE public.email_campaign_status AS ENUM ('rascunho', 'agendada', 'enviando', 'enviada', 'pausada', 'cancelada');
CREATE TYPE public.email_sequence_gatilho AS ENUM ('manual', 'novo_lead', 'mudou_status', 'tag_aplicada');
CREATE TYPE public.email_enrollment_status AS ENUM ('ativo', 'pausado', 'completo', 'unsubscribed');
CREATE TYPE public.email_send_status AS ENUM ('pendente', 'enviado', 'falhou', 'suprimido');
CREATE TYPE public.email_event_tipo AS ENUM ('delivered', 'opened', 'clicked', 'bounced', 'complained', 'unsubscribed', 'soft_bounce');
CREATE TYPE public.email_suppression_motivo AS ENUM ('bounce', 'complaint', 'unsubscribe', 'manual');

-- SENDERS
CREATE TABLE public.email_senders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  email text NOT NULL,
  nome_exibicao text NOT NULL,
  status public.email_sender_status NOT NULL DEFAULT 'pendente',
  provider_sender_id text,
  dns_records jsonb DEFAULT '{}'::jsonb,
  verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, email)
);
ALTER TABLE public.email_senders ENABLE ROW LEVEL SECURITY;
CREATE POLICY senders_all ON public.email_senders FOR ALL
  USING (public.is_workspace_member(workspace_id, auth.uid()))
  WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()));

-- TEMPLATES
CREATE TABLE public.email_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  nome text NOT NULL,
  assunto text NOT NULL,
  html text NOT NULL,
  variaveis jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY templates_all ON public.email_templates FOR ALL
  USING (public.is_workspace_member(workspace_id, auth.uid()))
  WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()));
CREATE TRIGGER email_templates_updated BEFORE UPDATE ON public.email_templates
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- LISTS
CREATE TABLE public.email_lists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  nome text NOT NULL,
  tipo public.email_list_tipo NOT NULL DEFAULT 'manual',
  filtros jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.email_lists ENABLE ROW LEVEL SECURITY;
CREATE POLICY lists_all ON public.email_lists FOR ALL
  USING (public.is_workspace_member(workspace_id, auth.uid()))
  WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()));

CREATE TABLE public.email_list_members (
  list_id uuid NOT NULL REFERENCES public.email_lists(id) ON DELETE CASCADE,
  lead_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (list_id, lead_id)
);
ALTER TABLE public.email_list_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY list_members_all ON public.email_list_members FOR ALL
  USING (EXISTS (SELECT 1 FROM public.email_lists l
    WHERE l.id = email_list_members.list_id
    AND public.is_workspace_member(l.workspace_id, auth.uid())))
  WITH CHECK (EXISTS (SELECT 1 FROM public.email_lists l
    WHERE l.id = email_list_members.list_id
    AND public.is_workspace_member(l.workspace_id, auth.uid())));

-- CAMPAIGNS
CREATE TABLE public.email_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  nome text NOT NULL,
  template_id uuid REFERENCES public.email_templates(id) ON DELETE SET NULL,
  list_id uuid REFERENCES public.email_lists(id) ON DELETE SET NULL,
  sender_id uuid REFERENCES public.email_senders(id) ON DELETE SET NULL,
  status public.email_campaign_status NOT NULL DEFAULT 'rascunho',
  agendada_para timestamptz,
  iniciada_em timestamptz,
  finalizada_em timestamptz,
  stats jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.email_campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY campaigns_all ON public.email_campaigns FOR ALL
  USING (public.is_workspace_member(workspace_id, auth.uid()))
  WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()));
CREATE TRIGGER email_campaigns_updated BEFORE UPDATE ON public.email_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_campaigns_scheduled ON public.email_campaigns(agendada_para)
  WHERE status = 'agendada';

-- SEQUENCES
CREATE TABLE public.email_sequences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  nome text NOT NULL,
  descricao text,
  sender_id uuid REFERENCES public.email_senders(id) ON DELETE SET NULL,
  gatilho_tipo public.email_sequence_gatilho NOT NULL DEFAULT 'manual',
  gatilho_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  ativa boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.email_sequences ENABLE ROW LEVEL SECURITY;
CREATE POLICY sequences_all ON public.email_sequences FOR ALL
  USING (public.is_workspace_member(workspace_id, auth.uid()))
  WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()));
CREATE TRIGGER email_sequences_updated BEFORE UPDATE ON public.email_sequences
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.email_sequence_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sequence_id uuid NOT NULL REFERENCES public.email_sequences(id) ON DELETE CASCADE,
  ordem int NOT NULL,
  template_id uuid REFERENCES public.email_templates(id) ON DELETE SET NULL,
  delay_dias int NOT NULL DEFAULT 0,
  delay_horas int NOT NULL DEFAULT 0,
  condicao jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (sequence_id, ordem)
);
ALTER TABLE public.email_sequence_steps ENABLE ROW LEVEL SECURITY;
CREATE POLICY sequence_steps_all ON public.email_sequence_steps FOR ALL
  USING (EXISTS (SELECT 1 FROM public.email_sequences s
    WHERE s.id = email_sequence_steps.sequence_id
    AND public.is_workspace_member(s.workspace_id, auth.uid())))
  WITH CHECK (EXISTS (SELECT 1 FROM public.email_sequences s
    WHERE s.id = email_sequence_steps.sequence_id
    AND public.is_workspace_member(s.workspace_id, auth.uid())));

CREATE TABLE public.email_sequence_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sequence_id uuid NOT NULL REFERENCES public.email_sequences(id) ON DELETE CASCADE,
  lead_id uuid NOT NULL,
  workspace_id uuid NOT NULL,
  current_step int NOT NULL DEFAULT 0,
  next_send_at timestamptz,
  status public.email_enrollment_status NOT NULL DEFAULT 'ativo',
  enrolled_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  UNIQUE (sequence_id, lead_id)
);
ALTER TABLE public.email_sequence_enrollments ENABLE ROW LEVEL SECURITY;
CREATE POLICY enrollments_all ON public.email_sequence_enrollments FOR ALL
  USING (public.is_workspace_member(workspace_id, auth.uid()))
  WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()));
CREATE INDEX idx_enrollments_next ON public.email_sequence_enrollments(next_send_at)
  WHERE status = 'ativo';

-- SENDS
CREATE TABLE public.email_sends (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  campaign_id uuid REFERENCES public.email_campaigns(id) ON DELETE SET NULL,
  enrollment_id uuid REFERENCES public.email_sequence_enrollments(id) ON DELETE SET NULL,
  step_id uuid REFERENCES public.email_sequence_steps(id) ON DELETE SET NULL,
  lead_id uuid,
  recipient_email text NOT NULL,
  assunto text,
  provider_message_id text,
  status public.email_send_status NOT NULL DEFAULT 'pendente',
  error_message text,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.email_sends ENABLE ROW LEVEL SECURITY;
CREATE POLICY sends_read ON public.email_sends FOR SELECT
  USING (public.is_workspace_member(workspace_id, auth.uid()));
CREATE INDEX idx_sends_provider_msg ON public.email_sends(provider_message_id)
  WHERE provider_message_id IS NOT NULL;
CREATE INDEX idx_sends_campaign ON public.email_sends(campaign_id);
CREATE INDEX idx_sends_workspace_recent ON public.email_sends(workspace_id, created_at DESC);

-- EVENTS
CREATE TABLE public.email_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  send_id uuid REFERENCES public.email_sends(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL,
  tipo public.email_event_tipo NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  occurred_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.email_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY events_read ON public.email_events FOR SELECT
  USING (public.is_workspace_member(workspace_id, auth.uid()));
CREATE INDEX idx_events_send ON public.email_events(send_id);

-- SUPPRESSIONS
CREATE TABLE public.email_suppressions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  email text NOT NULL,
  motivo public.email_suppression_motivo NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, email)
);
ALTER TABLE public.email_suppressions ENABLE ROW LEVEL SECURITY;
CREATE POLICY suppressions_read ON public.email_suppressions FOR SELECT
  USING (public.is_workspace_member(workspace_id, auth.uid()));
CREATE POLICY suppressions_insert ON public.email_suppressions FOR INSERT
  WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()));

-- UNSUBSCRIBE TOKENS (acessado via service role na rota pública)
CREATE TABLE public.email_unsubscribe_tokens (
  token text PRIMARY KEY,
  workspace_id uuid NOT NULL,
  email text NOT NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, email)
);
ALTER TABLE public.email_unsubscribe_tokens ENABLE ROW LEVEL SECURITY;
-- sem policies: só service role acessa

-- Helper: gerar token de descadastro (chamado server-side)
CREATE OR REPLACE FUNCTION public.ensure_unsubscribe_token(_workspace_id uuid, _email text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _token text;
BEGIN
  SELECT token INTO _token FROM public.email_unsubscribe_tokens
    WHERE workspace_id = _workspace_id AND email = _email;
  IF _token IS NULL THEN
    _token := encode(gen_random_bytes(24), 'hex');
    INSERT INTO public.email_unsubscribe_tokens (token, workspace_id, email)
      VALUES (_token, _workspace_id, _email);
  END IF;
  RETURN _token;
END;
$$;
