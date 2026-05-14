import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { ShieldCheck, Headphones, Clock, Users } from "lucide-react";
import { useEffect } from "react";
import { useLocation } from "wouter";

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
    <div className="min-h-screen bg-gradient-to-br from-[oklch(0.18_0.06_255)] via-[oklch(0.28_0.10_255)] to-[oklch(0.38_0.14_255)] flex flex-col">
      {/* Header */}
      <header className="px-6 py-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur flex items-center justify-center">
            <ShieldCheck className="w-6 h-6 text-white" />
          </div>
          <div>
            <span className="font-bold text-white text-lg" style={{ fontFamily: "var(--font-display)" }}>
              Parcred
            </span>
            <span className="text-white/50 text-sm ml-2">Help Desk</span>
          </div>
        </div>
        <span className="text-white/40 text-sm hidden sm:block">Grupo Angar</span>
      </header>

      {/* Hero */}
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="max-w-5xl w-full grid lg:grid-cols-2 gap-12 items-center">
          {/* Left: copy */}
          <div className="flex flex-col gap-6">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur rounded-full px-4 py-1.5 w-fit">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              <span className="text-white/80 text-xs font-medium">Sistema online</span>
            </div>

            <h1
              className="text-4xl lg:text-5xl font-bold text-white leading-tight"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Suporte ágil para correspondentes bancários
            </h1>

            <p className="text-white/70 text-lg leading-relaxed">
              Plataforma centralizada de atendimento técnico, comercial e financeiro para os correspondentes bancários da Parcred Brasil.
            </p>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => { window.location.href = getLoginUrl(); }}
                className="bg-white text-[oklch(0.28_0.10_255)] font-semibold px-8 py-3.5 rounded-xl hover:bg-white/90 transition-all shadow-lg hover:shadow-xl active:scale-[0.97] text-base"
              >
                Acessar o sistema
              </button>
            </div>
          </div>

          {/* Right: feature cards */}
          <div className="grid grid-cols-2 gap-4">
            {[
              {
                icon: Headphones,
                title: "Suporte Técnico",
                desc: "Resolução de problemas em sistemas e processos de crédito consignado",
              },
              {
                icon: Users,
                title: "Suporte Comercial",
                desc: "Atendimento para contratos, relacionamento e demandas comerciais",
              },
              {
                icon: Clock,
                title: "SLA Garantido",
                desc: "Prazos de resposta e resolução monitorados automaticamente",
              },
              {
                icon: ShieldCheck,
                title: "Suporte Financeiro",
                desc: "Acompanhamento de pagamentos, repasses e conciliações",
              },
            ].map((feat) => (
              <div
                key={feat.title}
                className="bg-white/10 backdrop-blur rounded-2xl p-5 flex flex-col gap-3 border border-white/10 hover:bg-white/15 transition-colors"
              >
                <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center">
                  <feat.icon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-white text-sm">{feat.title}</h3>
                  <p className="text-white/60 text-xs mt-1 leading-relaxed">{feat.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="px-6 py-4 border-t border-white/10">
        <p className="text-white/30 text-xs text-center">
          © {new Date().getFullYear()} Parcred Brasil · Grupo Angar · Todos os direitos reservados
        </p>
      </footer>
    </div>
  );
}
