import { describe, it, expect, vi } from "vitest";

// Mock nodemailer para não fazer chamadas reais durante testes
vi.mock("nodemailer", () => ({
  default: {
    createTransport: vi.fn(() => ({
      sendMail: vi.fn().mockResolvedValue({ messageId: "test-id" }),
    })),
  },
}));

describe("mailer", () => {
  it("retorna false quando SMTP não está configurado", async () => {
    // Salvar e limpar variáveis de ambiente
    const savedHost = process.env.SMTP_HOST;
    const savedUser = process.env.SMTP_USER;
    const savedPass = process.env.SMTP_PASS;
    delete process.env.SMTP_HOST;
    delete process.env.SMTP_USER;
    delete process.env.SMTP_PASS;

    // Re-importar para pegar o estado sem as variáveis
    vi.resetModules();
    const { sendMail } = await import("./mailer");
    const result = await sendMail({ to: "test@example.com", subject: "Test", html: "<p>Test</p>" });
    expect(result).toBe(false);

    // Restaurar variáveis
    if (savedHost) process.env.SMTP_HOST = savedHost;
    if (savedUser) process.env.SMTP_USER = savedUser;
    if (savedPass) process.env.SMTP_PASS = savedPass;
  });

  it("replaceVars substitui variáveis no template", async () => {
    const { replaceVars } = await import("./mailer");
    const template = "Olá {{name}}, clique em {{reset_link}} para redefinir.";
    const result = replaceVars(template, {
      name: "João",
      reset_link: "https://example.com/reset?token=abc",
    });
    expect(result).toBe("Olá João, clique em https://example.com/reset?token=abc para redefinir.");
  });

  it("replaceVars não altera template sem variáveis", async () => {
    const { replaceVars } = await import("./mailer");
    const template = "<p>Sem variáveis aqui.</p>";
    expect(replaceVars(template, {})).toBe(template);
  });
});
