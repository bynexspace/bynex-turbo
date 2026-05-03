import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Linkedin } from "lucide-react";
import { FeatureGate } from "@/components/FeatureGate";

function LinkedinPage() {
  return (
    <AppLayout title="LinkedIn" subtitle="Prospecção via LinkedIn">
      <Card className="p-12 text-center">
        <Linkedin className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
        <h3 className="font-semibold mb-1">Em breve</h3>
        <p className="text-sm text-muted-foreground">Integração com LinkedIn Sales Navigator está em desenvolvimento.</p>
      </Card>
    </AppLayout>
  );
}

export const Route = createFileRoute("/_app/linkedin")({
  component: () => (<FeatureGate feature="linkedin" label="LinkedIn"><LinkedinPage /></FeatureGate>),
});
