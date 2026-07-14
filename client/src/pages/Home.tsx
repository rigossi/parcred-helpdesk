import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Input } from "@/components/ui/input";
import { Loader2, Eye, EyeOff, ShieldCheck, Headphones, FileText } from "lucide-react";
import { toast } from "sonner";

export default function Home() {
  const [, navigate] = useLocation();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const meQuery = trpc.auth.me.useQuery(undefined, { retry: false });
  const loginMutation = trpc.auth.login.useMutation();
  const clientLoginMutation = trpc.clientPortal.login.useMutation();

  useEffect(() => {
    if (meQuery.data) {
      if (meQuery.data.role === "client") navigate("/portal");
      else navigate("/dashboard");
    }
  }, [meQuery.data]);

  function isCpf(value: string) {
    return /^[\d.\-\s]+$/.test(value.trim()) && value.replace(/[^0-9]/g, "").length >= 11;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!identifier || !password) { toast.error("Preencha todos os campos."); return; }
    try {
      if (isCpf(identifier)) {
        await clientLoginMutation.mutateAsync({ identifier, password });
        await meQuery.refetch();
        navigate("/portal");
      } else {
        await loginMutation.mutateAsync({ email: identifier, password });
        await meQuery.refetch();
        navigate("/dashboard");
      }
    } catch (err: any) {
      toast.error(err?.message ?? "Credenciais inválidas. Verifique e tente novamente.");
    }
  }

  const isPending = loginMutation.isPending || clientLoginMutation.isPending;

  if (meQuery.isLoading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f8f9fa" }}>
        <Loader2 style={{ width: 32, height: 32, color: "#1A6B4A" }} className="animate-spin" />
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", fontFamily: "'Inter', sans-serif" }}>

      {/* ── Painel esquerdo — identidade ── */}
      <div style={{
        width: "45%",
        background: "linear-gradient(160deg, #0D3B2E 0%, #1A6B4A 100%)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "48px 52px",
        position: "relative",
        overflow: "hidden",
      }} className="hidden md:flex">

        {/* Textura sutil */}
        <div style={{
          position: "absolute", inset: 0, opacity: 0.04,
          backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
          backgroundSize: "28px 28px",
        }} />

        {/* Logo + marca */}
        <div style={{ position: "relative", zIndex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 48 }}>
            <img src="/logo.png" alt="Parcred" style={{ width: 44, height: "auto", filter: "brightness(0) invert(1)" }} />
            <div>
              <p style={{ color: "white", fontWeight: 700, fontSize: 20, lineHeight: 1, letterSpacing: "-0.3px" }}>Parcred</p>
              <p style={{ color: "rgba(255,255,255,0.55)", fontSize: 11, letterSpacing: "2px", textTransform: "uppercase", marginTop: 2 }}>Suporte</p>
            </div>
          </div>

          <h1 style={{ color: "white", fontSize: 38, fontWeight: 800, lineHeight: 1.15, letterSpacing: "-1px", maxWidth: 340 }}>
            Seu suporte financeiro, sempre disponível.
          </h1>
          <p style={{ color: "rgba(255,255,255,0.65)", fontSize: 15, lineHeight: 1.65, marginTop: 20, maxWidth: 320 }}>
            Atendimento especializado para clientes e parceiros do Grupo Angar.
          </p>
        </div>

        {/* Pilares */}
        <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", gap: 20 }}>
          {[
            { icon: ShieldCheck, title: "Segurança garantida", desc: "Seus dados protegidos em cada interação." },
            { icon: Headphones, title: "Atendimento ágil", desc: "Equipe especializada pronta para te ajudar." },
            { icon: FileText, title: "Acompanhe tudo", desc: "Histórico completo das suas solicitações." },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(255,255,255,0.12)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Icon style={{ width: 18, height: 18, color: "rgba(255,255,255,0.85)" }} />
              </div>
              <div>
                <p style={{ color: "white", fontWeight: 600, fontSize: 14, marginBottom: 2 }}>{title}</p>
                <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 13, lineHeight: 1.5 }}>{desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Rodapé */}
        <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 12, position: "relative", zIndex: 1 }}>
          © {new Date().getFullYear()} Grupo Angar · Todos os direitos reservados
        </p>
      </div>

      {/* ── Painel direito — formulário ── */}
      <div style={{
        flex: 1,
        background: "#f8faf9",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "48px 32px",
        overflowY: "auto",
      }}>

        {/* Logo mobile */}
        <div className="flex md:hidden" style={{ flexDirection: "column", alignItems: "center", marginBottom: 32 }}>
          <img src="/logo.png" alt="Parcred" style={{ width: 48, height: "auto", marginBottom: 10 }} />
          <p style={{ fontWeight: 700, fontSize: 20, color: "#0D3B2E" }}>Parcred Suporte</p>
        </div>

        <div style={{ width: "100%", maxWidth: 380 }}>

          {/* Cabeçalho do form */}
          <div style={{ marginBottom: 32 }}>
            <h2 style={{ fontSize: 26, fontWeight: 800, color: "#0D3B2E", letterSpacing: "-0.5px", marginBottom: 6 }}>
              Acesse sua conta
            </h2>
            <p style={{ color: "#6b7280", fontSize: 14, lineHeight: 1.6 }}>
              Parceiros entram com e-mail · Clientes com CPF ou e-mail
            </p>
          </div>

          {/* Formulário */}
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>
                E-mail ou CPF
              </label>
              <Input
                type="text"
                placeholder="seu@email.com ou 000.000.000-00"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                disabled={isPending}
                required
                style={{ height: 46, fontSize: 15, borderColor: "#d1d5db", borderRadius: 10 }}
              />
            </div>

            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>
                Senha
              </label>
              <div style={{ position: "relative" }}>
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isPending}
                  required
                  style={{ height: 46, fontSize: 15, borderColor: "#d1d5db", borderRadius: 10, paddingRight: 44 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  tabIndex={-1}
                  style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", color: "#9ca3af", background: "none", border: "none", cursor: "pointer", padding: 0 }}
                >
                  {showPassword ? <EyeOff style={{ width: 18, height: 18 }} /> : <Eye style={{ width: 18, height: 18 }} />}
                </button>
              </div>
              <div style={{ textAlign: "right", marginTop: 6 }}>
                <Link href="/forgot-password">
                  <span style={{ fontSize: 13, color: "#1A6B4A", cursor: "pointer", fontWeight: 500 }}>
                    Esqueci minha senha
                  </span>
                </Link>
              </div>
            </div>

            <button
              type="submit"
              disabled={isPending}
              style={{
                height: 48,
                background: isPending ? "#6b9e89" : "linear-gradient(135deg, #1A6B4A, #0D3B2E)",
                color: "white",
                border: "none",
                borderRadius: 10,
                fontSize: 15,
                fontWeight: 700,
                cursor: isPending ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                transition: "opacity 0.2s",
                marginTop: 4,
              }}
            >
              {isPending && <Loader2 style={{ width: 18, height: 18 }} className="animate-spin" />}
              {isPending ? "Entrando…" : "Entrar"}
            </button>
          </form>

          {/* Divisor */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "28px 0" }}>
            <div style={{ flex: 1, height: 1, background: "#e5e7eb" }} />
            <span style={{ fontSize: 12, color: "#9ca3af", fontWeight: 500 }}>OU</span>
            <div style={{ flex: 1, height: 1, background: "#e5e7eb" }} />
          </div>

          {/* CTA Primeiro Acesso — destaque dourado */}
          <Link href="/portal/cadastro">
            <div style={{
              background: "linear-gradient(135deg, #C9A84C, #a87d2a)",
              borderRadius: 12,
              padding: "18px 20px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              boxShadow: "0 4px 16px rgba(201,168,76,0.3)",
              transition: "transform 0.15s, box-shadow 0.15s",
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)"; (e.currentTarget as HTMLElement).style.boxShadow = "0 8px 24px rgba(201,168,76,0.4)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = ""; (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 16px rgba(201,168,76,0.3)"; }}
            >
              <div>
                <p style={{ color: "white", fontWeight: 700, fontSize: 15, marginBottom: 3 }}>
                  Primeiro acesso?
                </p>
                <p style={{ color: "rgba(255,255,255,0.8)", fontSize: 13 }}>
                  Crie sua conta de cliente agora
                </p>
              </div>
              <div style={{ width: 36, height: 36, borderRadius: "50%", background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <span style={{ color: "white", fontSize: 18, fontWeight: 700 }}>→</span>
              </div>
            </div>
          </Link>

          <p style={{ textAlign: "center", color: "#9ca3af", fontSize: 12, marginTop: 32 }}>
            © {new Date().getFullYear()} Grupo Angar · Parcred Brasil
          </p>
        </div>
      </div>
    </div>
  );
}
