import { useState } from "react";
import { Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export default function PortalRegister() {
  const [, navigate] = useLocation();
  const [step, setStep] = useState<"cpf" | "form">("cpf");
  const [cpf, setCpf] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [eligibleName, setEligibleName] = useState("");

  const checkEligibility = trpc.clientPortal.checkEligibility.useMutation();
  const register = trpc.clientPortal.register.useMutation();

  function formatCpf(value: string) {
    const digits = value.replace(/\D/g, "").slice(0, 11);
    return digits
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  }

  async function handleCheckCpf(e: React.FormEvent) {
    e.preventDefault();
    const raw = cpf.replace(/\D/g, "");
    if (raw.length !== 11) {
      toast.error("CPF inválido.");
      return;
    }
    try {
      const result = await checkEligibility.mutateAsync({ cpf: raw });
      if (!result.eligible) {
        toast.error("CPF não encontrado na base de clientes elegíveis.");
        return;
      }
      if (result.alreadyRegistered) {
        toast.error("Este CPF já possui uma conta. Faça login.");
        navigate("/");
        return;
      }
      setEligibleName(result.name ?? "");
      setName(result.name ?? "");
      setStep("form");
    } catch (err: any) {
      toast.error(err?.message ?? "Erro ao verificar CPF.");
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      toast.error("As senhas não coincidem.");
      return;
    }
    try {
      await register.mutateAsync({ cpf: cpf.replace(/\D/g, ""), email, password, name });
      navigate("/portal");
    } catch (err: any) {
      toast.error(err?.message ?? "Erro ao criar conta.");
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-white">
      <div className="flex flex-col items-center mb-8 select-none">
        <img src="/logo.png" alt="Parcred" className="w-20 h-auto mb-4 drop-shadow-md" />
        <h1 className="text-3xl font-bold tracking-tight text-gray-900" style={{ fontFamily: "var(--font-display)" }}>
          Parcred Help Desk
        </h1>
        <p className="mt-1 text-sm text-gray-500">Primeiro acesso · Portal do Cliente</p>
      </div>

      <Card className="w-full max-w-sm shadow-md border border-gray-200">
        <CardHeader className="pb-4">
          <CardTitle className="text-xl font-semibold text-gray-900">Criar sua conta</CardTitle>
          <CardDescription className="text-gray-500">
            {step === "cpf"
              ? "Informe seu CPF para verificar sua elegibilidade."
              : `Bem-vindo, ${eligibleName}! Complete seu cadastro.`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {step === "cpf" ? (
            <form onSubmit={handleCheckCpf} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="cpf">CPF</Label>
                <Input
                  id="cpf"
                  type="text"
                  placeholder="000.000.000-00"
                  value={cpf}
                  onChange={(e) => setCpf(formatCpf(e.target.value))}
                  disabled={checkEligibility.isPending}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={checkEligibility.isPending}>
                {checkEligibility.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Verificar CPF
              </Button>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="name">Nome completo</Label>
                <Input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={register.isPending}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={register.isPending}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Mínimo 6 caracteres"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={register.isPending}
                  required
                  minLength={6}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="confirm">Confirmar senha</Label>
                <Input
                  id="confirm"
                  type="password"
                  placeholder="Repita a senha"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  disabled={register.isPending}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={register.isPending}>
                {register.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Criar conta
              </Button>
            </form>
          )}

          <div className="text-center mt-4">
            <Link href="/">
              <button type="button" className="text-sm text-gray-500 hover:underline">
                Já tenho conta · Fazer login
              </button>
            </Link>
          </div>
        </CardContent>
      </Card>

      <p className="text-xs mt-8 text-gray-400">
        © {new Date().getFullYear()} Parcred Brasil · Todos os direitos reservados
      </p>
    </div>
  );
}
