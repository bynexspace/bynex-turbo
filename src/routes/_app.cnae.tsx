import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, X, Search, Loader2 } from "lucide-react";

export const Route = createFileRoute("/_app/cnae")({ component: CnaePage });

const CNAES_SUG = [
  { codigo: "4711301", desc: "Comércio varejista hipermercados" },
  { codigo: "4711302", desc: "Supermercados" },
  { codigo: "5611201", desc: "Restaurantes e similares" },
  { codigo: "5611203", desc: "Lanchonetes" },
  { codigo: "4781400", desc: "Vestuário" },
];

function CnaePage() {
  const { workspace } = useAuth();
  const [selectedCnaes, setSelected] = useState<string[]>([]);
  const [terms, setTerms] = useState<string[]>([]);
  const [termInput, setTermInput] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);

  const toggle = (c: string) => setSelected(s => s.includes(c) ? s.filter(x => x !== c) : [...s, c]);

  const buscar = async () => {
    setBusy(true);
    // BrasilAPI: protótipo simplificado — em produção, integrar com fonte CNPJ paga
    setResults([
      { razao: "Empresa Exemplo LTDA", cnpj: "00.000.000/0001-00", capital: "100.000", email: "contato@exemplo.com", telefone: "(11) 99999-0000", abertura: "2018-05-10" },
    ]);
    setBusy(false);
    toast.info("Busca de demonstração (conecte uma fonte CNPJ para resultados reais)");
  };

  const adicionar = async (r: any) => {
    await supabase.from("leads").insert({
      workspace_id: workspace!.id, nome: r.razao, telefone: r.telefone,
      email: r.email, origem: "cnae", metadata: { cnpj: r.cnpj, capital: r.capital },
    });
    toast.success("Adicionado");
  };

  return (
    <AppLayout title="Busca CNAE" subtitle="Encontre empresas por atividade econômica">
      <div className="grid lg:grid-cols-2 gap-4">
        <Card className="p-5">
          <h3 className="font-semibold mb-3">Ramos de Atividade</h3>
          <Input placeholder="Buscar por código ou descrição…" className="mb-3" />
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {CNAES_SUG.map(c => (
              <label key={c.codigo} className="flex items-start gap-2 cursor-pointer hover:bg-muted/50 p-2 rounded">
                <Checkbox checked={selectedCnaes.includes(c.codigo)} onCheckedChange={() => toggle(c.codigo)} />
                <div className="text-sm"><span className="font-mono text-xs text-muted-foreground">{c.codigo}</span> {c.desc}</div>
              </label>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="font-semibold mb-3">Palavras Chave</h3>
          <div className="flex gap-3 mb-2 text-sm">
            <label className="flex items-center gap-2"><Checkbox defaultChecked /> Razão Social</label>
            <label className="flex items-center gap-2"><Checkbox defaultChecked /> Nome Fantasia</label>
          </div>
          <div className="flex gap-2 mb-2">
            <Input value={termInput} onChange={e => setTermInput(e.target.value)} placeholder="Adicionar termo…"
              onKeyDown={e => { if (e.key==="Enter" && termInput) { setTerms([...terms, termInput]); setTermInput(""); } }} />
            <Button onClick={() => { if (termInput) { setTerms([...terms, termInput]); setTermInput(""); } }}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex flex-wrap gap-1">
            {terms.map((t, i) => (
              <Badge key={i} variant="secondary" className="gap-1">
                {t}<button onClick={() => setTerms(terms.filter((_,j) => j!==i))}><X className="h-3 w-3" /></button>
              </Badge>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="font-semibold mb-3">Filtros</h3>
          <div className="space-y-3 text-sm">
            <RadioGroup defaultValue="ignorar">
              <Label className="text-xs">Outros</Label>
              <div className="space-y-1">
                {["Incluir CNAEs secundários","Somente com Telefone","Somente com E-mail","Somente Matriz"].map((o,i)=>(
                  <label key={i} className="flex items-center gap-2"><RadioGroupItem value={`o${i}`} />{o}</label>
                ))}
              </div>
            </RadioGroup>
            <div>
              <Label className="text-xs">Capital Social (R$)</Label>
              <div className="flex gap-2"><Input placeholder="Mínimo" /><Input placeholder="Máximo" /></div>
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="font-semibold mb-3">Localização</h3>
          <RadioGroup defaultValue="brasil">
            <label className="flex items-center gap-2 text-sm"><RadioGroupItem value="brasil" />Todo o Brasil</label>
            <label className="flex items-center gap-2 text-sm"><RadioGroupItem value="estados" />Selecionar Estados/Municípios</label>
          </RadioGroup>
        </Card>
      </div>

      <div className="mt-4">
        <Button size="lg" onClick={buscar} disabled={busy}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Search className="h-4 w-4 mr-2" />}
          Buscar Empresas
        </Button>
      </div>

      <div className="mt-4 space-y-2">
        {results.map((r, i) => (
          <Card key={i} className="p-4 flex items-start justify-between">
            <div>
              <div className="font-semibold">{r.razao}</div>
              <div className="text-xs text-muted-foreground">CNPJ: {r.cnpj} · Capital: R$ {r.capital} · Aberta: {r.abertura}</div>
              <div className="text-sm mt-1">{r.telefone} · {r.email}</div>
            </div>
            <Button size="sm" onClick={() => adicionar(r)}><Plus className="h-3 w-3 mr-1" />CRM</Button>
          </Card>
        ))}
      </div>
    </AppLayout>
  );
}
