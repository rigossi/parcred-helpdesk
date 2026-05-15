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
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const meQuery = trpc.auth.me.useQuery(undefined, { retry: false });
  const loginMutation = trpc.auth.login.useMutation();

  // Se já estiver autenticado, redirecionar para o dashboard
  useEffect(() => {
    if (meQuery.data) {
      navigate("/dashboard");
    }
  }, [meQuery.data]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Preencha e-mail e senha.");
      return;
    }
    try {
      await loginMutation.mutateAsync({ email, password });
      await meQuery.refetch();
      navigate("/dashboard");
    } catch (err: any) {
      toast.error(err?.message ?? "E-mail ou senha inválidos.");
    }
  }

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
          src="/manus-storage/parcred-logo_c55658d2.png"
          alt="Parcred"
          className="h-20 w-auto mb-4 drop-shadow-md"
        />
        <h1 className="text-3xl font-bold tracking-tight text-gray-900" style={{ fontFamily: "var(--font-display)" }}>Parcred Help Desk</h1>
        <p className="mt-1 text-sm text-gray-500">Grupo Angar · Suporte aos Correspondentes</p>
      </div>

      {/* Card de login */}
      <Card className="w-full max-w-sm shadow-md border border-gray-200">
        <CardHeader className="pb-4">
          <CardTitle className="text-xl font-semibold text-gray-900">Acesse sua conta</CardTitle>
          <CardDescription className="text-gray-500">Informe seu e-mail e senha para entrar</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loginMutation.isPending}
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
                  disabled={loginMutation.isPending}
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

            <Button
              type="submit"
              className="w-full mt-2"
              disabled={loginMutation.isPending}
            >
              {loginMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Entrando…
                </>
              ) : (
                "Entrar no sistema"
              )}
            </Button>

            <div className="text-center mt-2">
              <Link href="/forgot-password">
                <button type="button" className="text-sm text-primary hover:underline">
                  Esqueci minha senha
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
