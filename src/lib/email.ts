import { recordLog } from "./db";
import { logger } from "./logger";

export interface SendOtpEmailParams {
  email: string;
  code: string;
  name?: string | null;
}

export interface SendRouteCreatedEmailParams {
  email: string;
  name?: string | null;
  origin: string;
  destination: string;
  flightDate: string;
  returnDate?: string | null;
  targetPrice: number;
  passengers?: number;
  children?: number;
  infantsInLap?: number;
}

/**
 * Dispara e-mail contendo o código de verificação OTP de 6 dígitos para login passwordless.
 */
export async function sendOtpEmail(params: SendOtpEmailParams): Promise<boolean> {
  const { email, code, name } = params;
  const greeting = name ? `Olá, ${name}!` : "Olá!";
  const subject = `🔑 Seu código de acesso ao Radar de Passagens: ${code}`;

  const plainText = `
${greeting}

Você solicitou acesso ao Radar de Passagens. Use o código abaixo para entrar:

Código de Verificação: ${code}

Este código é válido por 15 minutos. Se você não solicitou este código, ignore este e-mail.
`.trim();

  // Se houver chave do Resend configurada
  const resendApiKey = process.env.RESEND_API_KEY;
  if (resendApiKey) {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: process.env.EMAIL_FROM || "Radar de Passagens <alertas@resend.dev>",
          to: [email],
          subject,
          text: plainText,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; background-color: #f8fafc; border-radius: 8px;">
              <h2 style="color: #0f172a; margin-bottom: 16px;">Radar de Passagens ✈️</h2>
              <p style="color: #334155; font-size: 16px;">${greeting}</p>
              <p style="color: #334155; font-size: 15px;">Use o código de 6 dígitos abaixo para acessar sua conta:</p>
              <div style="background-color: #ffffff; border: 2px dashed #0284c7; border-radius: 8px; padding: 16px; text-align: center; margin: 24px 0;">
                <span style="font-family: monospace; font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #0284c7;">${code}</span>
              </div>
              <p style="color: #64748b; font-size: 13px;">Este código expira em <strong>15 minutos</strong>. Se você não solicitou este acesso, ignore este e-mail.</p>
            </div>
          `,
        }),
      });

      if (res.ok) {
        logger.info("NOTIFICATION", `E-mail OTP enviado com sucesso para ${email}`);
        return true;
      } else {
        const errorText = await res.text();
        logger.error("NOTIFICATION", `Falha ao enviar e-mail OTP via Resend (${res.status}): ${errorText}`);
      }
    } catch (err: any) {
      logger.error("NOTIFICATION", `Erro ao conectar com API de e-mail: ${err.message}`);
    }
  }

  // Fallback para ambiente local ou sem chave de e-mail: registra nos logs e console
  console.log(`\n==================================================`);
  console.log(`[EMAIL OTP] Destinatário: ${email}`);
  console.log(`[EMAIL OTP] Código: ${code}`);
  console.log(`==================================================\n`);

  recordLog({
    level: "SUCCESS",
    category: "NOTIFICATION",
    message: `[DEV/TEST] Código OTP gerado para ${email}: ${code}`,
    details: { email, code, expires_in: "15m" },
  });

  return true;
}

/**
 * Dispara e-mail transacional de boas-vindas/confirmação quando uma nova rota é cadastrada.
 */
export async function sendRouteCreatedEmail(params: SendRouteCreatedEmailParams): Promise<boolean> {
  const { email, name, origin, destination, flightDate, returnDate, targetPrice, passengers, children, infantsInLap } = params;
  const greeting = name ? `Olá, ${name}!` : "Olá!";
  const totalPax = (passengers || 1) + (children || 0) + (infantsInLap || 0);

  const formattedTarget = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(targetPrice);

  const formattedTotal = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(targetPrice * totalPax);

  const routeDesc = returnDate
    ? `${origin} ↔ ${destination} (${flightDate} até ${returnDate})`
    : `${origin} → ${destination} (${flightDate})`;

  const subject = `✈️ Monitoramento ativado: ${origin} para ${destination}`;

  const plainText = `
${greeting}

Seu monitoramento de voo foi ativado com sucesso!

📍 Rota: ${routeDesc}
🎯 Preço-Alvo: ${formattedTarget} por pessoa${totalPax > 1 ? ` (Total estimado para ${totalPax} passageiros: ${formattedTotal})` : ""}

Assim que encontrarmos passagens no ou abaixo do seu preço-alvo por pessoa, você será notificado.
Você pode acompanhar o histórico de preços a qualquer momento acessando o Radar de Passagens.
`.trim();

  const resendApiKey = process.env.RESEND_API_KEY;
  if (resendApiKey) {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: process.env.EMAIL_FROM || "Radar de Passagens <alertas@resend.dev>",
          to: [email],
          subject,
          text: plainText,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; background-color: #f8fafc; border-radius: 8px;">
              <h2 style="color: #0f172a; margin-bottom: 16px;">Radar de Passagens ✈️</h2>
              <p style="color: #334155; font-size: 16px;">${greeting}</p>
              <p style="color: #334155; font-size: 15px;">Seu monitoramento de voo foi iniciado com sucesso!</p>
              <div style="background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 20px 0;">
                <p style="margin: 6px 0; color: #1e293b;"><strong>Rota:</strong> ${routeDesc}</p>
                <p style="margin: 6px 0; color: #1e293b;"><strong>Preço-Alvo:</strong> <span style="color: #16a34a; font-weight: bold;">${formattedTarget} por pessoa</span></p>
                ${totalPax > 1 ? `<p style="margin: 6px 0; color: #64748b; font-size: 13px;"><strong>Total estimado (${totalPax} passageiros):</strong> ${formattedTotal}</p>` : ""}
              </div>
              <p style="color: #64748b; font-size: 14px;">Assim que encontrarmos uma oportunidade com preço por pessoa igual ou menor que sua meta, você será avisado imediatamente.</p>
            </div>
          `,
        }),
      });

      if (res.ok) {
        logger.info("NOTIFICATION", `E-mail de confirmação de rota enviado para ${email}`);
        return true;
      }
    } catch (err: any) {
      logger.error("NOTIFICATION", `Erro ao enviar e-mail de rota criada: ${err.message}`);
    }
  }

  // Fallback local
  recordLog({
    level: "SUCCESS",
    category: "NOTIFICATION",
    message: `[DEV/TEST] Monitoramento de rota ativado para ${email} (${origin} → ${destination})`,
    details: { email, origin, destination, flightDate, returnDate, targetPrice },
  });

  return true;
}
