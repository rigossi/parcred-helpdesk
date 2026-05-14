import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { ShieldCheck } from "lucide-react";
import { useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";

export default function Home() {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!loading && user) {
      setLocation("/dashboard");
    }
  }, [user, loading, setLocation]);

  if (loading) return null;

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo / marca */}
        <div className="flex flex-col items-center gap-3 mb-8">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-md"
            style={{ background: "oklch(0.21 0.07 150)" }}
          >
            <ShieldCheck className="w-8 h-8 text-white" />
          </div>
          <div className="text-center">
            <h1
              className="text-2xl font-bold text-foreground tracking-tight"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Parcred Help Desk
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Grupo Angar · Suporte aos Correspondentes
            </p>
          </div>
        </div>

        {/* Card de login */}
        <div className="bg-white border border-border rounded-2xl shadow-sm p-8 flex flex-col gap-5">
          <div className="text-center">
            <h2
              className="text-base font-semibold text-foreground"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Acesse sua conta
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Use suas credenciais para entrar no sistema
            </p>
          </div>

          <Button
            size="lg"
            className="w-full font-semibold shadow-sm"
            style={{ background: "oklch(0.40 0.16 150)" }}
            onClick={() => { window.location.href = getLoginUrl(); }}
          >
            Entrar no sistema
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            Ao acessar, você concorda com os termos de uso da plataforma.
          </p>
        </div>

        <p className="text-xs text-muted-foreground text-center mt-6">
          © {new Date().getFullYear()} Parcred Brasil · Todos os direitos reservados
        </p>
      </div>
    </div>
  );
}
