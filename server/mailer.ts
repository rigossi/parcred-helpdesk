/**
 * mailer.ts — Helper de envio de e-mail
 *
 * Prioridade:
 *   1. Resend API (RESEND_API_KEY)
 *   2. SMTP/nodemailer (SMTP_HOST + SMTP_USER + SMTP_PASS)
 *
 * Se nenhum estiver configurado, o envio é ignorado silenciosamente.
 */

import nodemailer from "nodemailer";

export interface SendMailOptions {
  to: string | string[];
  subject: string;
  html: string;
}

async function sendViaResend(options: SendMailOptions): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return false;

  const from = process.env.SMTP_FROM ?? "Parcred Suporte <onboarding@resend.dev>";
  const to = Array.isArray(options.to) ? options.to : [options.to];

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, to, subject: options.subject, html: options.html }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("[mailer] Resend erro:", response.status, error);
      return false;
    }

    console.info("[mailer] E-mail enviado via Resend para:", to, "| Assunto:", options.subject);
    return true;
  } catch (err) {
    console.error("[mailer] Resend erro:", err);
    return false;
  }
}

async function sendViaSMTP(options: SendMailOptions): Promise<boolean> {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT ?? "587", 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) return false;

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
    tls: { rejectUnauthorized: false },
  });

  const from = process.env.SMTP_FROM ?? user;

  try {
    await transporter.sendMail({
      from,
      to: Array.isArray(options.to) ? options.to.join(", ") : options.to,
      subject: options.subject,
      html: options.html,
    });
    console.info("[mailer] E-mail enviado via SMTP para:", options.to, "| Assunto:", options.subject);
    return true;
  } catch (err) {
    console.error("[mailer] SMTP erro:", err);
    return false;
  }
}

/**
 * Envia e-mail usando Resend (preferencial) ou SMTP como fallback.
 */
export async function sendMail(options: SendMailOptions): Promise<boolean> {
  if (process.env.RESEND_API_KEY) {
    return sendViaResend(options);
  }
  if (process.env.SMTP_HOST) {
    return sendViaSMTP(options);
  }
  console.warn("[mailer] Nenhum provedor configurado — e-mail não enviado:", options.subject);
  return false;
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
