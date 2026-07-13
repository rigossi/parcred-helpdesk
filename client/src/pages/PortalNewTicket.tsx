import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

export default function PortalNewTicket() {
  const [, navigate] = useLocation();
  const { user, loading } = useAuth({ redirectOnUnauthenticated: true, redirectPath: "/" });
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");

  const openTicket = trpc.clientPortal.openTicket.useMutation();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await openTicket.mutateAsync({ subject, description });
      toast.success("Chamado aberto com sucesso!");
      navigate("/portal");
    } catch (err: any) {
      toast.error(err?.message ?? "Erro ao abrir chamado.");
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate("/portal")} className="text-gray-500 hover:text-gray-700">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="Parcred" className="w-8 h-auto" />
          <p className="text-sm font-semibold text-gray-900">Novo Chamado</p>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">
        <Card>
          <CardHeader>
            <CardTitle>Abrir novo chamado</CardTitle>
            <CardDescription>Descreva sua solicitação com o máximo de detalhes possível.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="subject">Assunto</Label>
                <Input
                  id="subject"
                  placeholder="Resumo da sua solicitação"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  disabled={openTicket.isPending}
                  required
                  minLength={3}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  placeholder="Descreva em detalhes o que aconteceu ou o que você precisa..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={openTicket.isPending}
                  required
                  minLength={10}
                  rows={6}
                />
              </div>
              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => navigate("/portal")}
                  disabled={openTicket.isPending}
                >
                  Cancelar
                </Button>
                <Button type="submit" className="flex-1" disabled={openTicket.isPending}>
                  {openTicket.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Abrir chamado
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
