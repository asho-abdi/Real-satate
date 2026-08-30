import nodemailer from 'nodemailer';
import env from '../config/env.js';

/** @type {import('nodemailer').Transporter | null} */
let transporter = null;

function getTransporter() {
  if (!env.hasSmtp) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE,
      auth: {
        user: env.SMTP_USER,
        pass: env.SMTP_PASS,
      },
    });
  }
  return transporter;
}

/**
 * Send an email. In development without SMTP, logs to console and resolves.
 * @param {{ to: string, subject: string, html?: string, text?: string }} options
 * @returns {Promise<{ messageId?: string, preview?: boolean }>}
 */
export async function sendMail({ to, subject, html, text }) {
  if (!to || !subject) {
    throw new Error('sendMail requires to and subject');
  }

  const transport = getTransporter();

  if (!transport) {
    console.info('[mailer:dev] Email not sent (SMTP not configured)');
    console.info(`  To: ${to}`);
    console.info(`  Subject: ${subject}`);
    if (text) console.info(`  Text: ${text}`);
    if (html) console.info(`  Html: ${html.slice(0, 500)}${html.length > 500 ? '…' : ''}`);
    return { preview: true };
  }

  const info = await transport.sendMail({
    from: env.SMTP_FROM,
    to,
    subject,
    text,
    html,
  });

  return { messageId: info.messageId };
}

export default { sendMail };
