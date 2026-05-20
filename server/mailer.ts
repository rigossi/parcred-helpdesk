/**
 * mailer.ts — Helper de envio de e-mail via SMTP (nodemailer)
 *
 * Credenciais lidas das variáveis de ambiente:
 *   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM
 *
 * Se as variáveis não estiverem configuradas, o envio é ignorado
 * silenciosamente (não quebra o fluxo da aplicação).
 */

import nodemailer from "nodemailer";

function getTransporter() {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT ?? "587", 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) return null;

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
    tls: { rejectUnauthorized: false },
  });
}

export interface SendMailOptions {
  to: string | string[];
  subject: string;
  html: string;
}

/**
 * Envia um e-mail via SMTP.
 * Retorna `true` em caso de sucesso, `false` se SMTP não configurado ou erro.
 */
export async function sendMail(options: SendMailOptions): Promise<boolean> {
  const transporter = getTransporter();
  if (!transporter) {
    console.warn("[mailer] SMTP não configurado — e-mail não enviado:", options.subject);
    return false;
  }

  const from = process.env.SMTP_FROM ?? process.env.SMTP_USER ?? "noreply@parcredbrasil.com.br";

  try {
    await transporter.sendMail({
      from,
      to: Array.isArray(options.to) ? options.to.join(", ") : options.to,
      subject: options.subject,
      html: options.html,
    });
    console.info("[mailer] E-mail enviado para:", options.to, "| Assunto:", options.subject);
    return true;
  } catch (err) {
    console.error("[mailer] Erro ao enviar e-mail:", err);
    return false;
  }
}

/**
 * Substitui variáveis no template HTML.
 * Ex: replaceVars(html, { name: "João", reset_link: "https://..." })
 */
export function replaceVars(template: string, vars: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replaceAll(`{{${key}}}`, value);
  }
  return result;
}
