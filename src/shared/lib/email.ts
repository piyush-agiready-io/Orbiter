import nodemailer from 'nodemailer';
import { env } from '@/config/env';

let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter | null {
  if (!env.SMTP_USER || !env.SMTP_PASS) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: env.SMTP_USER,
        pass: env.SMTP_PASS,
      },
    });
  }
  return transporter;
}

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
}

async function sendEmail(options: SendEmailOptions): Promise<boolean> {
  const transport = getTransporter();
  if (!transport) {
    console.warn('Email not configured — SMTP_USER/SMTP_PASS missing');
    return false;
  }

  try {
    const result = await transport.sendMail({
      from: `Orbiter <${env.SMTP_USER}>`,
      to: options.to,
      subject: options.subject,
      html: options.html,
    });
    console.log('Email sent:', result.messageId, 'to:', options.to);
    return true;
  } catch (err) {
    console.error('Email send failed:', err);
    return false;
  }
}

function baseTemplate(content: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#f4f4f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f7;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;">
          <tr>
            <td style="padding:32px 40px 0;">
              <h1 style="margin:0;font-size:20px;font-weight:600;color:#5B5FC7;">Orbiter</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 40px 40px;">
              ${content}
            </td>
          </tr>
          <tr>
            <td style="padding:20px 40px;border-top:1px solid #eee;">
              <p style="margin:0;font-size:12px;color:#8b8b9a;">
                This email was sent by Orbiter. If you didn't expect this, you can safely ignore it.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function buttonHtml(text: string, url: string): string {
  return `<a href="${url}" style="display:inline-block;padding:10px 24px;background:#5B5FC7;color:#ffffff;text-decoration:none;border-radius:6px;font-size:14px;font-weight:500;">${text}</a>`;
}

export async function sendInviteEmail(
  to: string,
  inviteUrl: string,
  role: string,
): Promise<boolean> {
  const roleLabel = role === 'admin' ? 'an admin' : role === 'client' ? 'a client' : 'a team member';
  const html = baseTemplate(`
    <h2 style="margin:0 0 8px;font-size:18px;font-weight:600;color:#1a1a2e;">You're invited to Orbiter</h2>
    <p style="margin:0 0 24px;font-size:14px;color:#4a4a68;line-height:1.6;">
      You've been invited to join Orbiter as ${roleLabel}. Click the button below to set up your account.
    </p>
    ${buttonHtml('Accept Invitation', inviteUrl)}
    <p style="margin:24px 0 0;font-size:12px;color:#8b8b9a;">
      This invitation expires in 7 days. If the button doesn't work, copy and paste this link:<br>
      <a href="${inviteUrl}" style="color:#5B5FC7;word-break:break-all;">${inviteUrl}</a>
    </p>
  `);

  return sendEmail({ to, subject: "You're invited to Orbiter", html });
}

export async function sendPasswordResetEmail(
  to: string,
  resetUrl: string,
): Promise<boolean> {
  const html = baseTemplate(`
    <h2 style="margin:0 0 8px;font-size:18px;font-weight:600;color:#1a1a2e;">Reset your password</h2>
    <p style="margin:0 0 24px;font-size:14px;color:#4a4a68;line-height:1.6;">
      We received a request to reset your password. Click the button below to choose a new one.
    </p>
    ${buttonHtml('Reset Password', resetUrl)}
    <p style="margin:24px 0 0;font-size:12px;color:#8b8b9a;">
      This link expires in 1 hour. If you didn't request this, you can safely ignore this email.<br>
      <a href="${resetUrl}" style="color:#5B5FC7;word-break:break-all;">${resetUrl}</a>
    </p>
  `);

  return sendEmail({ to, subject: 'Reset your Orbiter password', html });
}

export async function sendBugAlertEmail(
  to: string,
  bugTitle: string,
  projectName: string,
  bugUrl: string,
): Promise<boolean> {
  const html = baseTemplate(`
    <h2 style="margin:0 0 8px;font-size:18px;font-weight:600;color:#C93B3B;">P0 Bug Alert</h2>
    <p style="margin:0 0 16px;font-size:14px;color:#4a4a68;line-height:1.6;">
      A critical bug has been reported in <strong>${projectName}</strong>:
    </p>
    <div style="padding:12px 16px;background:#fef2f2;border-left:3px solid #C93B3B;border-radius:4px;margin:0 0 24px;">
      <p style="margin:0;font-size:14px;font-weight:500;color:#1a1a2e;">${bugTitle}</p>
    </div>
    ${buttonHtml('View Bug', bugUrl)}
  `);

  return sendEmail({ to, subject: `[P0] ${bugTitle} — ${projectName}`, html });
}
