// Helper para chamadas à API do Brevo via gateway Lovable.
// Use apenas em código server-side (createServerFn / server routes).

const GATEWAY_URL = "https://connector-gateway.lovable.dev/brevo";

function getAuthHeaders() {
  const lovableKey = process.env.LOVABLE_API_KEY;
  const brevoKey = process.env.BREVO_API_KEY;
  if (!lovableKey) throw new Error("LOVABLE_API_KEY ausente");
  if (!brevoKey) throw new Error("BREVO_API_KEY ausente — conecte Brevo");
  return {
    Authorization: `Bearer ${lovableKey}`,
    "X-Connection-Api-Key": brevoKey,
    "Content-Type": "application/json",
    Accept: "application/json",
  };
}

export async function brevoFetch<T = any>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const res = await fetch(`${GATEWAY_URL}${path}`, {
    ...init,
    headers: { ...getAuthHeaders(), ...(init.headers || {}) },
  });
  const text = await res.text();
  let json: any = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text };
  }
  if (!res.ok) {
    const msg = json?.message || json?.error || text || res.statusText;
    throw new Error(`Brevo ${res.status}: ${msg}`);
  }
  return json as T;
}

export interface BrevoSendParams {
  fromEmail: string;
  fromName: string;
  to: { email: string; name?: string }[];
  subject: string;
  html: string;
  headers?: Record<string, string>;
  tags?: string[];
}

export async function brevoSendEmail(params: BrevoSendParams) {
  return brevoFetch<{ messageId: string }>("/v3/smtp/email", {
    method: "POST",
    body: JSON.stringify({
      sender: { email: params.fromEmail, name: params.fromName },
      to: params.to,
      subject: params.subject,
      htmlContent: params.html,
      headers: params.headers,
      tags: params.tags,
    }),
  });
}

export async function brevoCreateSender(email: string, name: string) {
  return brevoFetch<{ id: number }>("/v3/senders", {
    method: "POST",
    body: JSON.stringify({ email, name }),
  });
}

export async function brevoListSenders() {
  return brevoFetch<{ senders: { id: number; email: string; active: boolean }[] }>(
    "/v3/senders",
    { method: "GET" },
  );
}
