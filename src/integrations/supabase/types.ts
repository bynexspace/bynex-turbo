export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      ai_conversations: {
        Row: {
          created_at: string
          id: string
          lead_id: string | null
          titulo: string | null
          user_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          lead_id?: string | null
          titulo?: string | null
          user_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          lead_id?: string | null
          titulo?: string | null
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_conversations_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_conversations_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          role: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          role: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "ai_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      app_admins: {
        Row: {
          created_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          user_id?: string
        }
        Relationships: []
      }
      email_campaigns: {
        Row: {
          agendada_para: string | null
          created_at: string
          finalizada_em: string | null
          id: string
          iniciada_em: string | null
          list_id: string | null
          nome: string
          sender_id: string | null
          stats: Json
          status: Database["public"]["Enums"]["email_campaign_status"]
          template_id: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          agendada_para?: string | null
          created_at?: string
          finalizada_em?: string | null
          id?: string
          iniciada_em?: string | null
          list_id?: string | null
          nome: string
          sender_id?: string | null
          stats?: Json
          status?: Database["public"]["Enums"]["email_campaign_status"]
          template_id?: string | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          agendada_para?: string | null
          created_at?: string
          finalizada_em?: string | null
          id?: string
          iniciada_em?: string | null
          list_id?: string | null
          nome?: string
          sender_id?: string | null
          stats?: Json
          status?: Database["public"]["Enums"]["email_campaign_status"]
          template_id?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_campaigns_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "email_lists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_campaigns_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "email_senders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_campaigns_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "email_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      email_events: {
        Row: {
          id: string
          metadata: Json | null
          occurred_at: string
          send_id: string | null
          tipo: Database["public"]["Enums"]["email_event_tipo"]
          workspace_id: string
        }
        Insert: {
          id?: string
          metadata?: Json | null
          occurred_at?: string
          send_id?: string | null
          tipo: Database["public"]["Enums"]["email_event_tipo"]
          workspace_id: string
        }
        Update: {
          id?: string
          metadata?: Json | null
          occurred_at?: string
          send_id?: string | null
          tipo?: Database["public"]["Enums"]["email_event_tipo"]
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_events_send_id_fkey"
            columns: ["send_id"]
            isOneToOne: false
            referencedRelation: "email_sends"
            referencedColumns: ["id"]
          },
        ]
      }
      email_list_members: {
        Row: {
          created_at: string
          lead_id: string
          list_id: string
        }
        Insert: {
          created_at?: string
          lead_id: string
          list_id: string
        }
        Update: {
          created_at?: string
          lead_id?: string
          list_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_list_members_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "email_lists"
            referencedColumns: ["id"]
          },
        ]
      }
      email_lists: {
        Row: {
          created_at: string
          filtros: Json
          id: string
          nome: string
          tipo: Database["public"]["Enums"]["email_list_tipo"]
          workspace_id: string
        }
        Insert: {
          created_at?: string
          filtros?: Json
          id?: string
          nome: string
          tipo?: Database["public"]["Enums"]["email_list_tipo"]
          workspace_id: string
        }
        Update: {
          created_at?: string
          filtros?: Json
          id?: string
          nome?: string
          tipo?: Database["public"]["Enums"]["email_list_tipo"]
          workspace_id?: string
        }
        Relationships: []
      }
      email_senders: {
        Row: {
          created_at: string
          dns_records: Json | null
          email: string
          id: string
          nome_exibicao: string
          provider_sender_id: string | null
          status: Database["public"]["Enums"]["email_sender_status"]
          verified_at: string | null
          workspace_id: string
        }
        Insert: {
          created_at?: string
          dns_records?: Json | null
          email: string
          id?: string
          nome_exibicao: string
          provider_sender_id?: string | null
          status?: Database["public"]["Enums"]["email_sender_status"]
          verified_at?: string | null
          workspace_id: string
        }
        Update: {
          created_at?: string
          dns_records?: Json | null
          email?: string
          id?: string
          nome_exibicao?: string
          provider_sender_id?: string | null
          status?: Database["public"]["Enums"]["email_sender_status"]
          verified_at?: string | null
          workspace_id?: string
        }
        Relationships: []
      }
      email_sends: {
        Row: {
          assunto: string | null
          campaign_id: string | null
          created_at: string
          enrollment_id: string | null
          error_message: string | null
          id: string
          lead_id: string | null
          provider_message_id: string | null
          recipient_email: string
          sent_at: string | null
          status: Database["public"]["Enums"]["email_send_status"]
          step_id: string | null
          workspace_id: string
        }
        Insert: {
          assunto?: string | null
          campaign_id?: string | null
          created_at?: string
          enrollment_id?: string | null
          error_message?: string | null
          id?: string
          lead_id?: string | null
          provider_message_id?: string | null
          recipient_email: string
          sent_at?: string | null
          status?: Database["public"]["Enums"]["email_send_status"]
          step_id?: string | null
          workspace_id: string
        }
        Update: {
          assunto?: string | null
          campaign_id?: string | null
          created_at?: string
          enrollment_id?: string | null
          error_message?: string | null
          id?: string
          lead_id?: string | null
          provider_message_id?: string | null
          recipient_email?: string
          sent_at?: string | null
          status?: Database["public"]["Enums"]["email_send_status"]
          step_id?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_sends_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "email_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_sends_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "email_sequence_enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_sends_step_id_fkey"
            columns: ["step_id"]
            isOneToOne: false
            referencedRelation: "email_sequence_steps"
            referencedColumns: ["id"]
          },
        ]
      }
      email_sequence_enrollments: {
        Row: {
          completed_at: string | null
          current_step: number
          enrolled_at: string
          id: string
          lead_id: string
          next_send_at: string | null
          sequence_id: string
          status: Database["public"]["Enums"]["email_enrollment_status"]
          workspace_id: string
        }
        Insert: {
          completed_at?: string | null
          current_step?: number
          enrolled_at?: string
          id?: string
          lead_id: string
          next_send_at?: string | null
          sequence_id: string
          status?: Database["public"]["Enums"]["email_enrollment_status"]
          workspace_id: string
        }
        Update: {
          completed_at?: string | null
          current_step?: number
          enrolled_at?: string
          id?: string
          lead_id?: string
          next_send_at?: string | null
          sequence_id?: string
          status?: Database["public"]["Enums"]["email_enrollment_status"]
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_sequence_enrollments_sequence_id_fkey"
            columns: ["sequence_id"]
            isOneToOne: false
            referencedRelation: "email_sequences"
            referencedColumns: ["id"]
          },
        ]
      }
      email_sequence_steps: {
        Row: {
          condicao: Json | null
          created_at: string
          delay_dias: number
          delay_horas: number
          id: string
          ordem: number
          sequence_id: string
          template_id: string | null
        }
        Insert: {
          condicao?: Json | null
          created_at?: string
          delay_dias?: number
          delay_horas?: number
          id?: string
          ordem: number
          sequence_id: string
          template_id?: string | null
        }
        Update: {
          condicao?: Json | null
          created_at?: string
          delay_dias?: number
          delay_horas?: number
          id?: string
          ordem?: number
          sequence_id?: string
          template_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_sequence_steps_sequence_id_fkey"
            columns: ["sequence_id"]
            isOneToOne: false
            referencedRelation: "email_sequences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_sequence_steps_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "email_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      email_sequences: {
        Row: {
          ativa: boolean
          created_at: string
          descricao: string | null
          gatilho_config: Json
          gatilho_tipo: Database["public"]["Enums"]["email_sequence_gatilho"]
          id: string
          nome: string
          sender_id: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          ativa?: boolean
          created_at?: string
          descricao?: string | null
          gatilho_config?: Json
          gatilho_tipo?: Database["public"]["Enums"]["email_sequence_gatilho"]
          id?: string
          nome: string
          sender_id?: string | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          ativa?: boolean
          created_at?: string
          descricao?: string | null
          gatilho_config?: Json
          gatilho_tipo?: Database["public"]["Enums"]["email_sequence_gatilho"]
          id?: string
          nome?: string
          sender_id?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_sequences_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "email_senders"
            referencedColumns: ["id"]
          },
        ]
      }
      email_suppressions: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          motivo: Database["public"]["Enums"]["email_suppression_motivo"]
          workspace_id: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          motivo: Database["public"]["Enums"]["email_suppression_motivo"]
          workspace_id: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          motivo?: Database["public"]["Enums"]["email_suppression_motivo"]
          workspace_id?: string
        }
        Relationships: []
      }
      email_templates: {
        Row: {
          assunto: string
          created_at: string
          html: string
          id: string
          nome: string
          updated_at: string
          variaveis: Json
          workspace_id: string
        }
        Insert: {
          assunto: string
          created_at?: string
          html: string
          id?: string
          nome: string
          updated_at?: string
          variaveis?: Json
          workspace_id: string
        }
        Update: {
          assunto?: string
          created_at?: string
          html?: string
          id?: string
          nome?: string
          updated_at?: string
          variaveis?: Json
          workspace_id?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          token: string
          used_at: string | null
          workspace_id: string
        }
        Insert: {
          created_at?: string
          email: string
          token: string
          used_at?: string | null
          workspace_id: string
        }
        Update: {
          created_at?: string
          email?: string
          token?: string
          used_at?: string | null
          workspace_id?: string
        }
        Relationships: []
      }
      flows: {
        Row: {
          created_at: string
          descricao: string | null
          id: string
          nome: string
          passos: Json
          workspace_id: string
        }
        Insert: {
          created_at?: string
          descricao?: string | null
          id?: string
          nome: string
          passos?: Json
          workspace_id: string
        }
        Update: {
          created_at?: string
          descricao?: string | null
          id?: string
          nome?: string
          passos?: Json
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "flows_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      integrations: {
        Row: {
          apify_key: string | null
          cnpja_key: string | null
          created_at: string
          id: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          apify_key?: string | null
          cnpja_key?: string | null
          created_at?: string
          id?: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          apify_key?: string | null
          cnpja_key?: string | null
          created_at?: string
          id?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "integrations_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: true
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      intel_reports: {
        Row: {
          cidade: string | null
          cnae: string | null
          created_at: string
          dores: string[] | null
          estado: string | null
          id: string
          modo: Database["public"]["Enums"]["intel_mode"]
          porte: string | null
          resultado: Json | null
          segmento: string | null
          tempo_mercado: string | null
          workspace_id: string
        }
        Insert: {
          cidade?: string | null
          cnae?: string | null
          created_at?: string
          dores?: string[] | null
          estado?: string | null
          id?: string
          modo: Database["public"]["Enums"]["intel_mode"]
          porte?: string | null
          resultado?: Json | null
          segmento?: string | null
          tempo_mercado?: string | null
          workspace_id: string
        }
        Update: {
          cidade?: string | null
          cnae?: string | null
          created_at?: string
          dores?: string[] | null
          estado?: string | null
          id?: string
          modo?: Database["public"]["Enums"]["intel_mode"]
          porte?: string | null
          resultado?: Json | null
          segmento?: string | null
          tempo_mercado?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "intel_reports_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_activities: {
        Row: {
          created_at: string
          descricao: string | null
          id: string
          lead_id: string
          tipo: string
          user_id: string | null
          workspace_id: string
        }
        Insert: {
          created_at?: string
          descricao?: string | null
          id?: string
          lead_id: string
          tipo: string
          user_id?: string | null
          workspace_id: string
        }
        Update: {
          created_at?: string
          descricao?: string | null
          id?: string
          lead_id?: string
          tipo?: string
          user_id?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_activities_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_activities_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          cidade: string | null
          created_at: string
          email: string | null
          endereco: string | null
          estado: string | null
          id: string
          metadata: Json | null
          nome: string
          origem: Database["public"]["Enums"]["lead_origin"]
          rating: number | null
          reviews: number | null
          site: string | null
          status: Database["public"]["Enums"]["lead_status"]
          telefone: string | null
          updated_at: string
          valor_estimado: number | null
          workspace_id: string
        }
        Insert: {
          cidade?: string | null
          created_at?: string
          email?: string | null
          endereco?: string | null
          estado?: string | null
          id?: string
          metadata?: Json | null
          nome: string
          origem?: Database["public"]["Enums"]["lead_origin"]
          rating?: number | null
          reviews?: number | null
          site?: string | null
          status?: Database["public"]["Enums"]["lead_status"]
          telefone?: string | null
          updated_at?: string
          valor_estimado?: number | null
          workspace_id: string
        }
        Update: {
          cidade?: string | null
          created_at?: string
          email?: string | null
          endereco?: string | null
          estado?: string | null
          id?: string
          metadata?: Json | null
          nome?: string
          origem?: Database["public"]["Enums"]["lead_origin"]
          rating?: number | null
          reviews?: number | null
          site?: string | null
          status?: Database["public"]["Enums"]["lead_status"]
          telefone?: string | null
          updated_at?: string
          valor_estimado?: number | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "leads_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string | null
          id: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string | null
          id: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          conteudo: string | null
          created_at: string
          data_execucao: string | null
          flow_id: string | null
          id: string
          lead_id: string | null
          status: Database["public"]["Enums"]["task_status"]
          tipo: Database["public"]["Enums"]["task_type"]
          workspace_id: string
        }
        Insert: {
          conteudo?: string | null
          created_at?: string
          data_execucao?: string | null
          flow_id?: string | null
          id?: string
          lead_id?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          tipo: Database["public"]["Enums"]["task_type"]
          workspace_id: string
        }
        Update: {
          conteudo?: string | null
          created_at?: string
          data_execucao?: string | null
          flow_id?: string | null
          id?: string
          lead_id?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          tipo?: Database["public"]["Enums"]["task_type"]
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_flow_id_fkey"
            columns: ["flow_id"]
            isOneToOne: false
            referencedRelation: "flows"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_members: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_members_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspaces: {
        Row: {
          created_at: string
          id: string
          nome: string
          plano: Database["public"]["Enums"]["plan_type"]
          status: Database["public"]["Enums"]["workspace_status"]
          stripe_customer_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          nome: string
          plano?: Database["public"]["Enums"]["plan_type"]
          status?: Database["public"]["Enums"]["workspace_status"]
          stripe_customer_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          nome?: string
          plano?: Database["public"]["Enums"]["plan_type"]
          status?: Database["public"]["Enums"]["workspace_status"]
          stripe_customer_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      ensure_unsubscribe_token: {
        Args: { _email: string; _workspace_id: string }
        Returns: string
      }
      is_app_admin: { Args: { _user_id: string }; Returns: boolean }
      is_workspace_member: {
        Args: { _user_id: string; _workspace_id: string }
        Returns: boolean
      }
      is_workspace_owner: {
        Args: { _user_id: string; _workspace_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "owner" | "member"
      email_campaign_status:
        | "rascunho"
        | "agendada"
        | "enviando"
        | "enviada"
        | "pausada"
        | "cancelada"
      email_enrollment_status: "ativo" | "pausado" | "completo" | "unsubscribed"
      email_event_tipo:
        | "delivered"
        | "opened"
        | "clicked"
        | "bounced"
        | "complained"
        | "unsubscribed"
        | "soft_bounce"
      email_list_tipo: "manual" | "smart"
      email_send_status: "pendente" | "enviado" | "falhou" | "suprimido"
      email_sender_status: "pendente" | "verificado" | "falhou"
      email_sequence_gatilho:
        | "manual"
        | "novo_lead"
        | "mudou_status"
        | "tag_aplicada"
      email_suppression_motivo:
        | "bounce"
        | "complaint"
        | "unsubscribe"
        | "manual"
      intel_mode: "sdr" | "closer"
      lead_origin: "google_maps" | "cnae" | "linkedin" | "manual"
      lead_status:
        | "novo"
        | "contactado"
        | "negociando"
        | "convertido"
        | "perdido"
      plan_type: "essencial" | "pro" | "premium"
      task_status: "pendente" | "feita" | "adiada"
      task_type: "whatsapp" | "ligacao" | "email"
      workspace_status: "ativo" | "suspenso"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["owner", "member"],
      email_campaign_status: [
        "rascunho",
        "agendada",
        "enviando",
        "enviada",
        "pausada",
        "cancelada",
      ],
      email_enrollment_status: ["ativo", "pausado", "completo", "unsubscribed"],
      email_event_tipo: [
        "delivered",
        "opened",
        "clicked",
        "bounced",
        "complained",
        "unsubscribed",
        "soft_bounce",
      ],
      email_list_tipo: ["manual", "smart"],
      email_send_status: ["pendente", "enviado", "falhou", "suprimido"],
      email_sender_status: ["pendente", "verificado", "falhou"],
      email_sequence_gatilho: [
        "manual",
        "novo_lead",
        "mudou_status",
        "tag_aplicada",
      ],
      email_suppression_motivo: [
        "bounce",
        "complaint",
        "unsubscribe",
        "manual",
      ],
      intel_mode: ["sdr", "closer"],
      lead_origin: ["google_maps", "cnae", "linkedin", "manual"],
      lead_status: [
        "novo",
        "contactado",
        "negociando",
        "convertido",
        "perdido",
      ],
      plan_type: ["essencial", "pro", "premium"],
      task_status: ["pendente", "feita", "adiada"],
      task_type: ["whatsapp", "ligacao", "email"],
      workspace_status: ["ativo", "suspenso"],
    },
  },
} as const
