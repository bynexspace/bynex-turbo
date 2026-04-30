import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { LeadDrawer } from "@/components/LeadDrawer";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/crm")({ component: CrmPage });

const COLS = [
  { id: "novo", label: "Novos", color: "bg-brand/10 text-brand" },
  { id: "contactado", label: "Em Contato", color: "bg-slate-200 text-slate-700" },
  { id: "negociando", label: "Negociação", color: "bg-warning/15 text-warning" },
  { id: "convertido", label: "Convertido", color: "bg-success/15 text-success" },
  { id: "perdido", label: "Perdido", color: "bg-destructive/10 text-destructive" },
] as const;

function CrmPage() {
  const { workspace } = useAuth();
  const [leads, setLeads] = useState<any[]>([]);
  const [openLead, setOpenLead] = useState<any | null>(null);

  const load = async () => {
    if (!workspace) return;
    const { data } = await supabase.from("leads").select("*").eq("workspace_id", workspace.id).order("created_at", { ascending: false });
    setLeads(data ?? []);
  };
  useEffect(() => { load(); }, [workspace]);

  const onDrag = async (r: DropResult) => {
    if (!r.destination) return;
    const id = r.draggableId;
    const newStatus = r.destination.droppableId as any;
    setLeads(prev => prev.map(l => l.id === id ? { ...l, status: newStatus } : l));
    const { error } = await supabase.from("leads").update({ status: newStatus }).eq("id", id);
    if (error) { toast.error("Erro ao mover lead"); load(); }
  };

  return (
    <AppLayout title="CRM" subtitle="Pipeline de vendas — arraste cards entre colunas">
      <DragDropContext onDragEnd={onDrag}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {COLS.map(col => {
            const items = leads.filter(l => l.status === col.id);
            return (
              <div key={col.id} className="flex flex-col">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">{col.label}</span>
                    <Badge variant="secondary" className={col.color}>{items.length}</Badge>
                  </div>
                </div>
                <Droppable droppableId={col.id}>
                  {(prov, snap) => (
                    <div ref={prov.innerRef} {...prov.droppableProps}
                      className={`flex-1 min-h-[60vh] p-2 rounded-lg space-y-2 transition-colors ${snap.isDraggingOver ? "bg-accent" : "bg-muted/40"}`}>
                      {items.map((lead, idx) => (
                        <Draggable key={lead.id} draggableId={lead.id} index={idx}>
                          {(p) => (
                            <Card ref={p.innerRef} {...p.draggableProps} {...p.dragHandleProps}
                              onClick={() => setOpenLead(lead)}
                              className="p-3 cursor-pointer hover:shadow-md transition-shadow">
                              <div className="font-medium text-sm">{lead.nome}</div>
                              <div className="flex items-center gap-2 mt-2">
                                <Badge variant="outline" className="text-[10px]">{lead.origem}</Badge>
                                {lead.valor_estimado && (
                                  <span className="text-xs text-muted-foreground">
                                    R$ {Number(lead.valor_estimado).toLocaleString("pt-BR")}
                                  </span>
                                )}
                              </div>
                            </Card>
                          )}
                        </Draggable>
                      ))}
                      {prov.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            );
          })}
        </div>
      </DragDropContext>
      <LeadDrawer lead={openLead} onClose={() => setOpenLead(null)} onUpdated={load} />
    </AppLayout>
  );
}
