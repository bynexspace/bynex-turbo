import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { GraduationCap, BookOpen, Video, FileText } from "lucide-react";

const TOPICS = [
  { icon: BookOpen, t: "Fundamentos de Prospecção", d: "Como construir uma máquina de vendas previsível" },
  { icon: Video, t: "Scripts que convertem", d: "Modelos prontos para WhatsApp e ligação" },
  { icon: FileText, t: "Negociando com clínicas e academias", d: "Estratégias específicas para serviços locais" },
];

export const Route = createFileRoute("/_app/educacao")({ component: () => (
  <AppLayout title="Educação" subtitle="Aprenda a vender melhor">
    <div className="grid md:grid-cols-3 gap-4">
      {TOPICS.map((t,i) => (
        <Card key={i} className="p-5 hover:shadow-md transition cursor-pointer">
          <t.icon className="h-8 w-8 text-brand mb-3" />
          <h3 className="font-semibold mb-1">{t.t}</h3>
          <p className="text-sm text-muted-foreground">{t.d}</p>
        </Card>
      ))}
    </div>
  </AppLayout>
)});
