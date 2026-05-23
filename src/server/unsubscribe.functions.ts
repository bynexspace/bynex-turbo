import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const lookupUnsubscribeToken = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ token: z.string().min(10).max(200) }).parse(d))
  .handler(async ({ data }) => {
    const { data: row } = await supabaseAdmin
      .from("email_unsubscribe_tokens")
      .select("token, email, workspace_id, used_at")
      .eq("token", data.token)
      .maybeSingle();
    if (!row) return { valid: false as const };
    return {
      valid: true as const,
      email: row.email,
      alreadyUsed: !!row.used_at,
    };
  });

export const confirmUnsubscribe = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ token: z.string().min(10).max(200) }).parse(d))
  .handler(async ({ data }) => {
    const { data: row } = await supabaseAdmin
      .from("email_unsubscribe_tokens")
      .select("token, email, workspace_id, used_at")
      .eq("token", data.token)
      .maybeSingle();
    if (!row) throw new Error("Token inválido");
    if (!row.used_at) {
      await supabaseAdmin
        .from("email_unsubscribe_tokens")
        .update({ used_at: new Date().toISOString() })
        .eq("token", data.token);
      await supabaseAdmin
        .from("email_suppressions")
        .upsert(
          { workspace_id: row.workspace_id, email: row.email, motivo: "unsubscribe" },
          { onConflict: "workspace_id,email" },
        );
    }
    return { ok: true, email: row.email };
  });
