import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function Home() {
  const [, navigate] = useLocation();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const meQuery = trpc.auth.me.useQuery(undefined, { retry: false });
  const loginMutation = trpc.auth.login.useMutation();
  const clientLoginMutation = trpc.clientPortal.login.useMutation();

  // Se já autenticado, redireciona conforme o role
  useEffect(() => {
    if (meQuery.data) {
      if (meQuery.data.role === "client") {
        navigate("/portal");
      } else {
        navigate("/dashboard");
      }
    }
  }, [meQuery.data]);

  // Detecta se o identificador é CPF
  function isCpf(value: string) {
    return /^[\d.\-]+$/.test(value.trim()) && value.replace(/[^0-9]/g, "").length >= 11;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!identifier || !password) {
      toast.error("Preencha o identificador e a senha.");
      return;
    }

    try {
      if (isCpf(identifier)) {
        // Login de cliente por CPF
        await clientLoginMutation.mutateAsync({ identifier, password });
        await meQuery.refetch();
        navigate("/portal");
      } else {
        // Login de correspondente/admin por e-mail
        await loginMutation.mutateAsync({ email: identifier, password });
        await meQuery.refetch();
        navigate("/dashboard");
      }
    } catch (err: any) {
      toast.error(err?.message ?? "Credenciais inválidas.");
    }
  }

  const isPending = loginMutation.isPending || clientLoginMutation.isPending;

  if (meQuery.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-white">
      {/* Logo e título */}
      <div className="flex flex-col items-center mb-8 select-none">
        <img
          src="/logo.png"
          alt="Parcred"
          className="w-20 h-auto mb-4 drop-shadow-md"
        />
        <h1 className="text-3xl font-bold tracking-tight text-gray-900" style={{ fontFamily: "var(--font-display)" }}>
          Parcred Help Desk
        </h1>
        <p className="mt-1 text-sm text-gray-500">Central de Suporte · Grupo Angar</p>
      </div>

      {/* Card de login */}
      <Card className="w-full max-w-sm shadow-md border border-gray-200">
        <CardHeader className="pb-4">
          <CardTitle className="text-xl font-semibold text-gray-900">Acesse sua conta</CardTitle>
          <CardDescription className="text-gray-500">
            Parceiros: informe seu e-mail.<br />
            Clientes: informe seu CPF ou e-mail.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="identifier">E-mail ou CPF</Label>
              <Input
                id="identifier"
                type="text"
                placeholder="seu@email.com ou 000.000.000-00"
                autoComplete="username"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                disabled={isPending}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Senha</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isPending}
                  required
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button type="submit" className="w-full mt-2" disabled={isPending}>
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Entrando…
                </>
              ) : (
                "Entrar"
              )}
            </Button>

            <div className="flex flex-col items-center gap-2 mt-2">
              <Link href="/forgot-password">
                <button type="button" className="text-sm text-primary hover:underline">
                  Esqueci minha senha
                </button>
              </Link>
              <Link href="/portal/cadastro">
                <button type="button" className="text-sm text-gray-500 hover:underline">
                  Primeiro acesso? Cadastre-se aqui
                </button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>

      <p className="text-xs mt-8 text-gray-400">
        © {new Date().getFullYear()} Parcred Brasil · Todos os direitos reservados
      </p>
    </div>
  );
}
