/**
 * Envoi d'e-mails par relais SMTP (Brevo en production, comme holyspoon) :
 * SMTP_HOST, SMTP_PORT (587 = STARTTLS, 465 = TLS), SMTP_USER, SMTP_PASSWORD, MAIL_FROM.
 * Sans SMTP_HOST, le message est écrit dans les logs du serveur (pratique en local).
 */
let transport

export const mailConfigured = () => Boolean(process.env.SMTP_HOST)

export async function sendMail({ to, subject, text }) {
  if (!mailConfigured()) {
    console.log(`[mail] (SMTP_HOST non défini, non envoyé) à ${to} — ${subject}\n${text}`)
    return
  }
  if (!transport) {
    const { default: nodemailer } = await import('nodemailer')
    const port = Number(process.env.SMTP_PORT || 587)
    transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: port === 465,
      requireTLS: port !== 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD },
    })
  }
  await transport.sendMail({ from: process.env.MAIL_FROM || 'Cyber Gym <no-reply@localhost>', to, subject, text })
}
