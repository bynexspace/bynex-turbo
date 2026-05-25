import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { FeatureGate } from "@/components/FeatureGate";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { authedFetch } from "@/lib/api-auth";
import { toast } from "sonner";
import {
  Linkedin, Search, Loader2, Plus, AlertTriangle, ExternalLink,
  Building2, User, Handshake, MapPin, Mail, Phone, Globe,
} from "lucide-react";

type Mode = "profile" | "company" | "partnership";

type LinkedinResult = {
  name: string;
  headline: string | null;
  company: string | null;
  location: string | null;
  url: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  avatar: string | null;
  raw: any;
};

const MODE_LABELS: Record<Mode, { label: string; icon: any; placeholder: string; hint: string }> = {
  profile: {
    label: "Perfis",
    icon: User,
    placeholder: "Ex: CEO startup SaaS Brasil, diretor de marketing tecnologia…",
    hint: "Busca pessoas no LinkedIn por cargo, setor ou palavra-chave.",
  },
  company: {
    label: "Empresas",
    icon: Building2,
    placeholder: "Ex: agência de marketing SP, indústria têxtil RJ…",
    hint: "Busca páginas de empresa no LinkedIn.",
  },
  partnership: {
    label: "Parcerias B2B",
    icon: Handshake,
    placeholder: "Ex: distribuidores software RH, integradores cloud…",
    hint: "Busca perfis e empresas com potencial de parceria comercial.",
  },
};

function LinkedinPage() {
  const { workspace } = useAuth();
  const [hasKey, setHasKey] = useState<boolean | null>(null);
  const [mode, setMode] = useState<Mode>("profile");
  const [query, setQuery] = useState("");
  const [searchUrl, setSearchUrl] = useState("");
  const [location, setLocation] = useState("");
  const [qty, setQty] = useState("25");
  const [results, setResults] = useState<LinkedinResult[]>([]);
  const [busy, setBusy] = useState(false);
  const [added, setAdded] = useState<Set<number>>(new Set());
  const [actorId, setActorId] = useState<string>(() => localStorage.getItem("linkedin_actor_id") || "");

  useEffect(() => {
    if (!workspace) return;
    supabase.from("integrations").select("apify_key").eq("workspace_id", workspace.id).maybeSingle()
      .then(({ data }) => setHasKey(!!data?.apify_key));
  }, [workspace]);

  useEffect(() => {
    localStorage.setItem("linkedin_actor_id", actorId);
  }, [actorId]);

  const buscar = async () => {
    if (!query.trim() && !searchUrl.trim()) {
      return toast.error("Informe um termo de busca ou URL do LinkedIn");
    }
    setBusy(true);
    setResults([]);
    setAdded(new Set());
    try {
      const res = await authedFetch("/api/linkedin-search", {
        method: "POST",
        body: JSON.stringify({
          workspaceId: workspace!.id,
          mode,
          query: query.trim() || undefined,
          searchUrl: searchUrl.trim() || undefined,
          location: location.trim() || undefined,
          qty: Number(qty),
          actorId: actorId.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Falha na busca");
      setResults(data.results || []);
      toast.success(`${data.results?.length ?? 0} resultados encontrados`);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  const adicionar = async (r: LinkedinResult, idx: number) => {
    if (!workspace) return;
    const { error } = await supabase.from("leads").insert({
      workspace_id: workspace.id,
      nome: r.name,
      email: r.email,
      telefone: r.phone,
      site: r.website || r.url,
      cidade: r.location,
      origem: "linkedin",
      metadata: {
        linkedin_url: r.url,
        headline: r.headline,
        company: r.company,
        mode,
      } as any,
    });
    if (error) toast.error("Erro ao adicionar"); else {
      toast.success("Adicionado ao CRM");
      setAdded(prev => new Set(prev).add(idx));
    }
  };

  const addAll = async () => {
    let ok = 0;
    for (let i = 0; i < results.length; i++) {
      if (added.has(i)) continue;
      await adicionar(results[i], i);
      ok++;
    }
    toast.success(`${ok} leads importados`);
  };

  const cost = (Number(qty) * 0.01).toFixed(2);
  const ModeIcon = MODE_LABELS[mode].icon;

  return (
    <AppLayout title="LinkedIn" subtitle="Prospecção de perfis, empresas e parcerias via LinkedIn">
      {hasKey === false && (
        <Card className="p-4 mb-4 border-warning bg-warning/5 flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-warning" />
          <div className="flex-1 text-sm">API key do Apify não configurada.</div>
          <Button asChild size="sm"><Link to="/integracoes">Configurar</Link></Button>
        </Card>
      )}

      <Card className="p-5 mb-4">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-9 h-9 rounded-lg bg-[#0A66C2]/10 text-[#0A66C2] flex items-center justify-center">
            <Linkedin className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-semibold">Pesquisar no LinkedIn</h3>
            <p className="text-xs text-muted-foreground">{MODE_LABELS[mode].hint}</p>
          </div>
        </div>

        <Tabs value={mode} onValueChange={(v) => setMode(v as Mode)} className="mb-4">
          <TabsList className="grid grid-cols-3 w-full max-w-md">
            {(Object.keys(MODE_LABELS) as Mode[]).map((m) => {
              const Icon = MODE_LABELS[m].icon;
              return (
                <TabsTrigger key={m} value={m} className="gap-1.5">
                  <Icon className="h-3.5 w-3.5" />{MODE_LABELS[m].label}
                </TabsTrigger>
              );
            })}
          </TabsList>
        </Tabs>

        <div className="space-y-3">
          <div className="flex gap-2">
            <Input
              className="flex-1"
              placeholder={MODE_LABELS[mode].placeholder}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && buscar()}
            />
            <Select value={qty} onValueChange={setQty}>
              <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={buscar} disabled={busy || hasKey === false}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4 mr-2" />}
              Buscar
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Input
              placeholder="Localização (opcional, ex: São Paulo)"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
            <Input
              placeholder="Ou cole uma URL de busca do LinkedIn"
              value={searchUrl}
              onChange={(e) => setSearchUrl(e.target.value)}
            />
          </div>

          <p className="text-xs text-muted-foreground">
            Custo estimado: ${cost} ({qty} × $0.01) · via Apify
          </p>
        </div>
      </Card>

      {results.length > 0 && (
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm text-muted-foreground">{results.length} resultado(s)</p>
          <Button size="sm" variant="outline" onClick={addAll}>
            <Plus className="h-3 w-3 mr-1" />Adicionar todos ao CRM
          </Button>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-3">
        {results.map((r, i) => (
          <Card key={i} className="p-4">
            <div className="flex items-start gap-3">
              <Avatar className="h-12 w-12">
                {r.avatar && <AvatarImage src={r.avatar} alt={r.name} />}
                <AvatarFallback><ModeIcon className="h-5 w-5" /></AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h4 className="font-semibold truncate">{r.name}</h4>
                    {r.headline && (
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{r.headline}</p>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant={added.has(i) ? "secondary" : "default"}
                    disabled={added.has(i)}
                    onClick={() => adicionar(r, i)}
                  >
                    <Plus className="h-3 w-3 mr-1" />{added.has(i) ? "Adicionado" : "CRM"}
                  </Button>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {r.company && <Badge variant="secondary" className="text-[10px]"><Building2 className="h-2.5 w-2.5 mr-1" />{r.company}</Badge>}
                  {r.location && <Badge variant="secondary" className="text-[10px]"><MapPin className="h-2.5 w-2.5 mr-1" />{r.location}</Badge>}
                </div>
                <div className="flex flex-wrap gap-3 mt-2 text-xs text-muted-foreground">
                  {r.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{r.email}</span>}
                  {r.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{r.phone}</span>}
                  {r.website && <a href={r.website} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-brand hover:underline truncate"><Globe className="h-3 w-3" />site</a>}
                  {r.url && <a href={r.url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-brand hover:underline"><ExternalLink className="h-3 w-3" />LinkedIn</a>}
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {results.length === 0 && !busy && (
        <Card className="p-10 text-center mt-2">
          <Linkedin className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">Faça uma busca para encontrar perfis, empresas ou parcerias.</p>
          <p className="text-xs text-muted-foreground mt-3">
            Próximas fases: enriquecimento de leads, mensagens automáticas e publicação de posts.
          </p>
        </Card>
      )}
    </AppLayout>
  );
}

export const Route = createFileRoute("/_app/linkedin")({
  component: () => (<FeatureGate feature="linkedin" label="LinkedIn"><LinkedinPage /></FeatureGate>),
});
