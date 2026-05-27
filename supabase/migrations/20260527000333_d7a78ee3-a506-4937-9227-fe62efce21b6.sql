
-- ===== Modo Organic — fundação + features =====

-- 1) User preferences (toggle master)
CREATE TABLE public.user_preferences (
  user_id uuid PRIMARY KEY,
  organic_mode_enabled boolean NOT NULL DEFAULT false,
  organic_first_seen boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_preferences TO authenticated;
GRANT ALL ON public.user_preferences TO service_role;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own prefs select" ON public.user_preferences FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own prefs insert" ON public.user_preferences FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own prefs update" ON public.user_preferences FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE TRIGGER trg_user_prefs_updated BEFORE UPDATE ON public.user_preferences
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 2) Referrals (Passos 6 e 7)
CREATE TYPE public.referral_status AS ENUM (
  'pending_validation','validated','approached','in_conversation','converted','lost'
);
CREATE TABLE public.referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  referrer_lead_id uuid NOT NULL,
  referred_name text NOT NULL,
  referred_phone text,
  referred_email text,
  status public.referral_status NOT NULL DEFAULT 'pending_validation',
  validation_message_sent_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_referrals_workspace ON public.referrals(workspace_id);
CREATE INDEX idx_referrals_referrer ON public.referrals(referrer_lead_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.referrals TO authenticated;
GRANT ALL ON public.referrals TO service_role;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "referrals_all" ON public.referrals FOR ALL TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid()))
  WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()));
CREATE TRIGGER trg_referrals_updated BEFORE UPDATE ON public.referrals
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 3) As 3 Listas — coluna list_type em leads
CREATE TYPE public.lead_list_type AS ENUM (
  'cold','list_1_social','list_2_referrer','list_3_past_client'
);
ALTER TABLE public.leads ADD COLUMN list_type public.lead_list_type NOT NULL DEFAULT 'cold';
CREATE INDEX idx_leads_list_type ON public.leads(workspace_id, list_type);

-- 4) Daily check-ins (Compromisso diário)
CREATE TABLE public.daily_checkins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  workspace_id uuid NOT NULL,
  date date NOT NULL DEFAULT (now() AT TIME ZONE 'America/Sao_Paulo')::date,
  emotional_tank_level smallint NOT NULL CHECK (emotional_tank_level BETWEEN 1 AND 5),
  target_approaches integer NOT NULL DEFAULT 5,
  actual_approaches integer NOT NULL DEFAULT 0,
  completed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, date)
);
CREATE INDEX idx_daily_checkins_user_date ON public.daily_checkins(user_id, date DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.daily_checkins TO authenticated;
GRANT ALL ON public.daily_checkins TO service_role;
ALTER TABLE public.daily_checkins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own checkin select" ON public.daily_checkins FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own checkin insert" ON public.daily_checkins FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own checkin update" ON public.daily_checkins FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE TRIGGER trg_daily_checkins_updated BEFORE UPDATE ON public.daily_checkins
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
