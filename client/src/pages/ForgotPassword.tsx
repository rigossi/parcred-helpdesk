import { useState } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, CheckCircle, Mail } from "lucide-react";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const requestReset = trpc.auth.requestPasswordReset.useMutation({
    onSuccess: () => setSent(true),
    onError: (e) => setError(e.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email) { setError("Informe o e-mail cadastrado."); return; }
    requestReset.mutate({ email, origin: window.location.origin });
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8 gap-3">
          <img
            src="/logo.png"
            alt="Parcred"
            className="h-14 w-auto drop-shadow"
          />
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
            Parcred Help Desk
          </h1>
        </div>

        <div className="bg-white rounded-2xl shadow-md border border-border p-8">
          {sent ? (
            <div className="flex flex-col items-center gap-4 text-center">
              <CheckCircle className="h-12 w-12 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">Solicitação enviada</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Se o e-mail informado estiver cadastrado no sistema, você receberá um e-mail com o link para redefinição de senha em instantes.
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Verifique também a caixa de spam. Caso não receba, entre em contato com o suporte.
              </p>
              <Link href="/">
                <Button variant="outline" className="mt-2 w-full">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Voltar ao login
                </Button>
              </Link>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-foreground mb-1">Esqueci minha senha</h2>
                <p className="text-sm text-muted-foreground">
                  Informe o e-mail cadastrado e enviaremos um link para redefinição de senha diretamente para você.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email">E-mail</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="seu@email.com.br"
                      className="pl-9"
                      autoFocus
                    />
                  </div>
                </div>

                {error && (
                  <p className="text-sm text-destructive">{error}</p>
                )}

                <Button
                  type="submit"
                  className="w-full"
                  disabled={requestReset.isPending}
                >
                  {requestReset.isPending ? "Enviando..." : "Solicitar redefinição"}
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
