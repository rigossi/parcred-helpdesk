import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();

const DEFAULT_BODY_HTML = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Recuperação de senha</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f4;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f4;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
          <tr>
            <td style="background-color:#2d6a4f;padding:32px 40px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;">Parcred Help Desk</h1>
              <p style="margin:6px 0 0;color:#b7e4c7;font-size:13px;">Suporte aos Correspondentes Bancários</p>
            </td>
          </tr>
          <tr>
            <td style="padding:40px 40px 32px;">
              <p style="margin:0 0 16px;font-size:15px;color:#333333;">Olá, <strong>{{name}}</strong>!</p>
              <p style="margin:0 0 24px;font-size:15px;color:#555555;line-height:1.6;">
                Recebemos uma solicitação para redefinir a senha da sua conta no <strong>Parcred Help Desk</strong>.
                Clique no botão abaixo para criar uma nova senha. Este link é válido por <strong>2 horas</strong>.
              </p>
              <table cellpadding="0" cellspacing="0" style="margin:0 auto 24px;">
                <tr>
                  <td style="background-color:#2d6a4f;border-radius:6px;padding:14px 32px;">
                    <a href="{{reset_link}}" style="color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;display:block;">
                      Redefinir minha senha
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 8px;font-size:13px;color:#888888;">
                Se o botão não funcionar, copie e cole o link abaixo no seu navegador:
              </p>
              <p style="margin:0 0 24px;font-size:12px;color:#aaaaaa;word-break:break-all;">{{reset_link}}</p>
              <hr style="border:none;border-top:1px solid #eeeeee;margin:0 0 24px;" />
              <p style="margin:0;font-size:13px;color:#aaaaaa;line-height:1.5;">
                Se você não solicitou a recuperação de senha, ignore este e-mail. Sua senha permanece a mesma.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color:#f9f9f9;padding:20px 40px;text-align:center;border-top:1px solid #eeeeee;">
              <p style="margin:0;font-size:12px;color:#aaaaaa;">© 2026 Grupo Angar · Parcred Brasil · Todos os direitos reservados</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

const conn = await mysql.createConnection(process.env.DATABASE_URL);
await conn.execute(
  `INSERT INTO email_templates (template_key, subject, body_html, updated_at)
   VALUES (?, ?, ?, ?)
   ON DUPLICATE KEY UPDATE template_key = template_key`,
  ["password_reset", "Recuperação de senha - Parcred Help Desk", DEFAULT_BODY_HTML, Date.now()]
);
console.log("Template de e-mail inserido com sucesso.");
await conn.end();
