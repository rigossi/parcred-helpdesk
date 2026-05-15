import { useState } from "react";
import { Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, CheckCircle, Eye, EyeOff, KeyRound } from "lucide-react";

export default function ResetPassword() {
  const [, setLocation] = useLocation();
  const params = new URLSearchParams(window.location.search);
  const token = params.get("token") ?? "";

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const resetMutation = trpc.auth.resetPassword.useMutation({
    onSuccess: () => setDone(true),
    onError: (e) => setError(e.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!token) { setError("Token inválido. Solicite um novo link de recuperação."); return; }
    if (newPassword.length < 6) { setError("A senha deve ter ao menos 6 caracteres."); return; }
    if (newPassword !== confirmPassword) { setError("As senhas não conferem."); return; }
    resetMutation.mutate({ token, newPassword });
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8 gap-3">
          <img
            src="/manus-storage/parcred-logo_c55658d2.png"
            alt="Parcred"
            className="h-14 w-auto drop-shadow"
          />
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
            Parcred Help Desk
          </h1>
        </div>

        <div className="bg-white rounded-2xl shadow-md border border-border p-8">
          {done ? (
            <div className="flex flex-col items-center gap-4 text-center">
              <CheckCircle className="h-12 w-12 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">Senha redefinida!</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Sua senha foi alterada com sucesso. Acesse o sistema com as novas credenciais.
              </p>
              <Button className="mt-2 w-full" onClick={() => setLocation("/")}>
                Ir para o login
              </Button>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-foreground mb-1 flex items-center gap-2">
                  <KeyRound className="h-5 w-5 text-primary" />
                  Redefinir senha
                </h2>
                <p className="text-sm text-muted-foreground">
                  Escolha uma nova senha para o seu acesso ao sistema.
                </p>
              </div>

              {!token && (
                <div className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                  <p className="text-sm text-destructive">
                    Link inválido ou expirado. Solicite um novo link de recuperação.
                  </p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="new-password">Nova senha</Label>
                  <div className="relative">
                    <Input
                      id="new-password"
                      type={showNew ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Mínimo 6 caracteres"
                      className="pr-10"
                      disabled={!token}
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => setShowNew(!showNew)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      tabIndex={-1}
                    >
                      {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="confirm-password">Confirmar nova senha</Label>
                  <div className="relative">
                    <Input
                      id="confirm-password"
                      type={showConfirm ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repita a nova senha"
                      className="pr-10"
                      disabled={!token}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(!showConfirm)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      tabIndex={-1}
                    >
                      {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {error && (
                  <p className="text-sm text-destructive">{error}</p>
                )}

                <Button
                  type="submit"
                  className="w-full"
                  disabled={resetMutation.isPending || !token}
                >
                  {resetMutation.isPending ? "Salvando..." : "Salvar nova senha"}
                </Button>
              </form>

              <div className="mt-6 text-center">
                <Link href="/">
                  <button className="text-sm text-primary hover:underline inline-flex items-center gap-1">
                    <ArrowLeft className="h-3.5 w-3.5" />
                    Voltar ao login
                  </button>
                </Link>
              </div>
            </>
          )}
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          © {new Date().getFullYear()} Parcred Brasil · Todos os direitos reservados
        </p>
      </div>
    </div>
  );
}
