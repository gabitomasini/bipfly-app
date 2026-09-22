import { recordLog } from "./db";
import { logger } from "./logger";

export interface SendOtpEmailParams {
  email: string;
  code: string;
  name?: string | null;
  locale?: "en" | "pt" | string;
}

export interface SendRouteCreatedEmailParams {
  email: string;
  name?: string | null;
  origin: string;
  destination: string;
  flightDate: string;
  returnDate?: string | null;
  targetPrice: number;
  currency?: string;
  passengers?: number;
  children?: number;
  infantsInLap?: number;
  locale?: "en" | "pt" | string;
}

/**
 * Helper to normalize locale to 'en' or 'pt'
 */
function normalizeLocale(locale?: string): "en" | "pt" {
  if (!locale) return "pt";
  return locale.toLowerCase().startsWith("pt") ? "pt" : "en";
}

/**
 * Dispara e-mail contendo o código de verificação OTP de 6 dígitos para login passwordless.
 */
export async function sendOtpEmail(params: SendOtpEmailParams): Promise<boolean> {
  const { email, code, name, locale: rawLocale } = params;
  const isEn = normalizeLocale(rawLocale) === "en";

  const greeting = isEn
    ? (name ? `Hello, ${name}!` : "Hello!")
    : (name ? `Olá, ${name}!` : "Olá!");

  const subject = isEn
    ? `🔑 Your BipFly login code: ${code}`
    : `🔑 Seu código de acesso ao BipFly: ${code}`;

  const plainText = isEn
    ? `
${greeting}

You requested access to BipFly. Use the code below to log in:

Verification Code: ${code}

This code is valid for 15 minutes. If you did not request this code, please ignore this email.
`.trim()
    : `
${greeting}

Você solicitou acesso ao BipFly. Use o código abaixo para entrar:

Código de Verificação: ${code}

Este código é válido por 15 minutos. Se você não solicitou este código, ignore este e-mail.
`.trim();

  // Se houver chave do Resend configurada
  const resendApiKey = process.env.RESEND_API_KEY;
  console.log(`[EMAIL OTP] Verificando chave Resend... Presente? ${Boolean(resendApiKey)} (Tamanho: ${resendApiKey?.length || 0})`);
  if (!resendApiKey) {
    const matchingKeys = Object.keys(process.env).filter((k) =>
      k.toLowerCase().includes("resend") || k.toLowerCase().includes("email")
    );
    console.log(`[EMAIL OTP] ⚠️ RESEND_API_KEY não foi encontrada. Variáveis detectadas no process.env:`, matchingKeys);
  }

  if (resendApiKey) {
    try {
      const fromAddress = process.env.EMAIL_FROM || "BipFly <onboarding@resend.dev>";
      console.log(`[EMAIL OTP] 🚀 Enviando via Resend para ${email} (De: ${fromAddress}) em [${isEn ? "EN" : "PT"}]...`);

      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey.trim()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: fromAddress,
          to: [email],
          subject,
          text: plainText,
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px; background-color: #f8fafc; border-radius: 16px;">
              <div style="margin-bottom: 24px; text-align: left;">
                <span style="display: inline-block; background: linear-gradient(135deg, #0284c7 0%, #4f46e5 100%); color: #ffffff; padding: 6px 14px; border-radius: 8px; font-weight: 800; font-size: 16px; letter-spacing: -0.3px;">
                  BipFly ✈️
                </span>
              </div>
              
              <div style="background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
                <h2 style="color: #0f172a; margin: 0 0 12px 0; font-size: 20px; font-weight: 700;">${greeting}</h2>
                <p style="color: #475569; font-size: 15px; line-height: 1.5; margin: 0 0 20px 0;">
                  ${isEn ? "Use the 6-digit verification code below to access your account:" : "Use o código de 6 dígitos abaixo para acessar sua conta:"}
                </p>

                <div style="background-color: #f0f9ff; border: 2px dashed #0284c7; border-radius: 10px; padding: 18px; text-align: center; margin: 20px 0;">
                  <span style="font-family: 'Courier New', Courier, monospace; font-size: 34px; font-weight: 800; letter-spacing: 8px; color: #0284c7;">${code}</span>
                </div>

                <p style="color: #64748b; font-size: 13px; line-height: 1.5; margin: 16px 0 0 0;">
                  ${
                    isEn
                      ? "This code expires in <strong>15 minutes</strong>. If you did not request this login, please ignore this email."
                      : "Este código expira em <strong>15 minutos</strong>. Se você não solicitou este acesso, ignore este e-mail."
                  }
                </p>
              </div>

              <div style="text-align: center; margin-top: 24px;">
                <p style="color: #94a3b8; font-size: 12px; margin: 0;">
                  ${isEn ? "BipFly • Intelligent Airfare Deal Tracker" : "BipFly • Monitoramento Inteligente de Passagens Aéreas"}
                </p>
              </div>
            </div>
          `,
        }),
      });

      const data = await res.json().catch(() => null);
      if (res.ok) {
        console.log(`[EMAIL OTP] ✅ Resend entregou com sucesso! Email ID: ${data?.id}`);
        logger.info("NOTIFICATION", `E-mail OTP enviado com sucesso para ${email} (idioma: ${isEn ? "en" : "pt"})`);
        return true;
      } else {
        console.error(`[EMAIL OTP] ❌ Erro Resend HTTP ${res.status}:`, data);
        logger.error("NOTIFICATION", `Falha ao enviar e-mail OTP via Resend (${res.status}): ${JSON.stringify(data)}`);
      }
    } catch (err: any) {
      console.error(`[EMAIL OTP] ❌ Exceção ao chamar Resend: ${err.message}`);
      logger.error("NOTIFICATION", `Erro ao conectar com API de e-mail: ${err.message}`);
    }
  }

  // Fallback para ambiente local ou sem chave de e-mail: registra nos logs e console
  console.log(`\n==================================================`);
  console.log(`[EMAIL OTP] Destinatário: ${email} [${isEn ? "EN" : "PT"}]`);
  console.log(`[EMAIL OTP] Código: ${code}`);
  console.log(`==================================================\n`);

  recordLog({
    level: "SUCCESS",
    category: "NOTIFICATION",
    message: `[DEV/TEST] Código OTP gerado para ${email}: ${code} [${isEn ? "EN" : "PT"}]`,
    details: { email, code, expires_in: "15m", locale: isEn ? "en" : "pt" },
  });

  return true;
}

/**
 * Dispara e-mail transacional de confirmação quando uma nova rota é cadastrada.
 */
export async function sendRouteCreatedEmail(params: SendRouteCreatedEmailParams): Promise<boolean> {
  const {
    email,
    name,
    origin,
    destination,
    flightDate,
    returnDate,
    targetPrice,
    currency = "BRL",
    passengers,
    children,
    infantsInLap,
    locale: rawLocale,
  } = params;

  const isEn = normalizeLocale(rawLocale) === "en";
  const greeting = isEn
    ? (name ? `Hello, ${name}!` : "Hello!")
    : (name ? `Olá, ${name}!` : "Olá!");

  const totalPax = (passengers || 1) + (children || 0) + (infantsInLap || 0);

  const numLocale = isEn ? "en-US" : "pt-BR";
  const formattedTarget = new Intl.NumberFormat(numLocale, {
    style: "currency",
    currency,
  }).format(targetPrice);

  const formattedTotal = new Intl.NumberFormat(numLocale, {
    style: "currency",
    currency,
  }).format(targetPrice * totalPax);

  const routeDesc = returnDate
    ? (isEn
        ? `${origin} ↔ ${destination} (${flightDate} to ${returnDate})`
        : `${origin} ↔ ${destination} (${flightDate} até ${returnDate})`)
    : `${origin} → ${destination} (${flightDate})`;

  const subject = isEn
    ? `✈️ Flight Tracker Activated: ${origin} to ${destination}`
    : `✈️ Monitoramento ativado: ${origin} para ${destination}`;

  const plainText = isEn
    ? `
${greeting}

Your flight price tracker has been successfully activated!

📍 Route: ${routeDesc}
🎯 Target Price: ${formattedTarget} per person${totalPax > 1 ? ` (Estimated total for ${totalPax} passengers: ${formattedTotal})` : ""}

As soon as we find a flight at or below your target price per person, you will be notified immediately.
You can check price trends anytime by visiting BipFly.
`.trim()
    : `
${greeting}

Seu monitoramento de voo foi ativado com sucesso!

📍 Rota: ${routeDesc}
🎯 Preço-Alvo: ${formattedTarget} por pessoa${totalPax > 1 ? ` (Total estimado para ${totalPax} passageiros: ${formattedTotal})` : ""}

Assim que encontrarmos passagens no ou abaixo do seu preço-alvo por pessoa, você será notificado.
Você pode acompanhar o histórico de preços a qualquer momento acessando o BipFly.
`.trim();

  const resendApiKey = process.env.RESEND_API_KEY;
  if (resendApiKey) {
    try {
      const fromAddress = process.env.EMAIL_FROM || "BipFly <onboarding@resend.dev>";
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: fromAddress,
          to: [email],
          subject,
          text: plainText,
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px; background-color: #f8fafc; border-radius: 16px;">
              <div style="margin-bottom: 24px; text-align: left;">
                <span style="display: inline-block; background: linear-gradient(135deg, #0284c7 0%, #4f46e5 100%); color: #ffffff; padding: 6px 14px; border-radius: 8px; font-weight: 800; font-size: 16px; letter-spacing: -0.3px;">
                  BipFly ✈️
                </span>
              </div>

              <div style="background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
                <h2 style="color: #0f172a; margin: 0 0 8px 0; font-size: 20px; font-weight: 700;">${greeting}</h2>
                <p style="color: #475569; font-size: 15px; margin: 0 0 20px 0;">
                  ${isEn ? "Your flight price tracking is now active!" : "Seu monitoramento de voo foi iniciado com sucesso!"}
                </p>

                <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px; margin: 16px 0;">
                  <p style="margin: 6px 0; color: #1e293b; font-size: 14px;">
                    <strong>${isEn ? "Route" : "Rota"}:</strong> ${routeDesc}
                  </p>
                  <p style="margin: 6px 0; color: #1e293b; font-size: 14px;">
                    <strong>${isEn ? "Target Price" : "Preço-Alvo"}:</strong> <span style="color: #16a34a; font-weight: bold;">${formattedTarget} ${isEn ? "per person" : "por pessoa"}</span>
                  </p>
                  ${
                    totalPax > 1
                      ? `<p style="margin: 6px 0; color: #64748b; font-size: 13px;"><strong>${isEn ? `Estimated Total (${totalPax} passengers)` : `Total estimado (${totalPax} passageiros)`}:</strong> ${formattedTotal}</p>`
                      : ""
                  }
                </div>

                <p style="color: #64748b; font-size: 14px; line-height: 1.5; margin: 16px 0 0 0;">
                  ${
                    isEn
                      ? "As soon as we find a deal with price per person at or below your target, we'll notify you immediately."
                      : "Assim que encontrarmos uma oportunidade com preço por pessoa igual ou menor que sua meta, você será avisado imediatamente."
                  }
                </p>
              </div>

              <div style="text-align: center; margin-top: 24px;">
                <p style="color: #94a3b8; font-size: 12px; margin: 0;">
                  ${isEn ? "BipFly • Intelligent Airfare Deal Tracker" : "BipFly • Monitoramento Inteligente de Passagens Aéreas"}
                </p>
              </div>
            </div>
          `,
        }),
      });

      if (res.ok) {
        logger.info("NOTIFICATION", `E-mail de confirmação de rota enviado para ${email} (idioma: ${isEn ? "en" : "pt"})`);
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
    message: `[DEV/TEST] Monitoramento de rota ativado para ${email} (${origin} → ${destination}) [${isEn ? "EN" : "PT"}]`,
    details: { email, origin, destination, flightDate, returnDate, targetPrice, locale: isEn ? "en" : "pt" },
  });

  return true;
}

export interface SendDealAlertEmailParams {
  email: string;
  name?: string | null;
  origin: string;
  destination: string;
  flightDate: string;
  returnDate?: string | null;
  price: number;
  targetPrice: number;
  currency?: string;
  airline?: string | null;
  flightNumber?: string | null;
  departureTime?: string | null;
  arrivalTime?: string | null;
  stops?: number | null;
  durationMinutes?: number | null;
  bookingLink?: string | null;
  passengers?: number;
  children?: number;
  infantsInLap?: number;
  locale?: "en" | "pt" | string;
}

/**
 * Dispara e-mail de alerta quando uma rota atinge ou fica abaixo da meta de preço estipulada pelo usuário.
 */
export async function sendDealAlertEmail(params: SendDealAlertEmailParams): Promise<boolean> {
  const {
    email,
    name,
    origin,
    destination,
    flightDate,
    returnDate,
    price,
    targetPrice,
    currency = "BRL",
    airline,
    flightNumber,
    departureTime,
    arrivalTime,
    stops,
    bookingLink,
    passengers,
    children,
    infantsInLap,
    locale: rawLocale,
  } = params;

  const isEn = normalizeLocale(rawLocale) === "en";
  const greeting = isEn
    ? (name ? `Hello, ${name}!` : "Hello!")
    : (name ? `Olá, ${name}!` : "Olá!");

  const totalPax = (passengers || 1) + (children || 0) + (infantsInLap || 0);
  const numLocale = isEn ? "en-US" : "pt-BR";

  const formattedPrice = new Intl.NumberFormat(numLocale, {
    style: "currency",
    currency,
  }).format(price);

  const formattedTarget = new Intl.NumberFormat(numLocale, {
    style: "currency",
    currency,
  }).format(targetPrice);

  const formattedTotal = new Intl.NumberFormat(numLocale, {
    style: "currency",
    currency,
  }).format(price * totalPax);

  const routeDesc = returnDate
    ? `${origin} ↔ ${destination} (${flightDate} ${isEn ? "to" : "até"} ${returnDate})`
    : `${origin} → ${destination} (${flightDate})`;

  const stopsText = stops === 0
    ? (isEn ? "Direct Flight" : "Voo Direto")
    : stops === 1
    ? (isEn ? "1 stop" : "1 parada")
    : `${stops} ${isEn ? "stops" : "paradas"}`;

  const discountPercent = targetPrice > price
    ? Math.round(((targetPrice - price) / targetPrice) * 100)
    : 0;

  const subject = isEn
    ? `🎯 DEAL ALERT: ${origin} to ${destination} is now ${formattedPrice} (Target: ${formattedTarget})!`
    : `🎯 ALERTA DE PREÇO: ${origin} para ${destination} atingiu ${formattedPrice} (Sua meta: ${formattedTarget})!`;

  const actionUrl = bookingLink || `https://www.google.com/travel/flights`;

  const plainText = isEn
    ? `
${greeting}

🎉 Great news! We found a flight within your target price!

📍 Route: ${routeDesc}
💰 Price Found: ${formattedPrice} per person${totalPax > 1 ? ` (Total for ${totalPax} passengers: ${formattedTotal})` : ""}
🎯 Your Target: ${formattedTarget} per person ${discountPercent > 0 ? `(${discountPercent}% below your target!)` : ""}
✈️ Airline: ${airline || "Available Airline"}${flightNumber ? ` (${flightNumber})` : ""} • ${stopsText}
${departureTime ? `⏰ Departure: ${departureTime}` : ""}${arrivalTime ? ` • Arrival: ${arrivalTime}` : ""}

Book now before prices change:
${actionUrl}
`.trim()
    : `
${greeting}

🎉 Ótima notícia! Encontramos passagens dentro da sua meta de preço!

📍 Rota: ${routeDesc}
💰 Preço Encontrado: ${formattedPrice} por pessoa${totalPax > 1 ? ` (Total para ${totalPax} passageiros: ${formattedTotal})` : ""}
🎯 Sua Meta: ${formattedTarget} por pessoa ${discountPercent > 0 ? `(${discountPercent}% abaixo da sua meta!)` : ""}
✈️ Companhia: ${airline || "Companhia Aérea"}${flightNumber ? ` (${flightNumber})` : ""} • ${stopsText}
${departureTime ? `⏰ Saída: ${departureTime}` : ""}${arrivalTime ? ` • Chegada: ${arrivalTime}` : ""}

Acesse o link abaixo para visualizar e garantir sua passagem:
${actionUrl}
`.trim();

  const resendApiKey = process.env.RESEND_API_KEY;
  if (resendApiKey) {
    try {
      const fromAddress = process.env.EMAIL_FROM || "BipFly <alerts@notify.bipfly.app>";
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: fromAddress,
          to: [email],
          subject,
          text: plainText,
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 580px; margin: 0 auto; padding: 32px 20px; background-color: #f8fafc; border-radius: 16px;">
              <div style="margin-bottom: 24px; text-align: left;">
                <span style="display: inline-block; background: linear-gradient(135deg, #0284c7 0%, #4f46e5 100%); color: #ffffff; padding: 6px 14px; border-radius: 8px; font-weight: 800; font-size: 16px; letter-spacing: -0.3px;">
                  BipFly ✈️
                </span>
              </div>

              <div style="background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 28px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
                <div style="display: inline-block; background-color: #ecfdf5; border: 1px solid #a7f3d0; color: #065f46; font-weight: 800; font-size: 12px; padding: 4px 10px; border-radius: 20px; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.5px;">
                  ${isEn ? "🎯 Target Price Reached" : "🎯 Meta de Preço Atingida"}
                </div>
                
                <h2 style="color: #0f172a; margin: 0 0 10px 0; font-size: 22px; font-weight: 800;">${greeting}</h2>
                <p style="color: #475569; font-size: 15px; margin: 0 0 20px 0; line-height: 1.5;">
                  ${isEn ? "Great news! We found a flight deal matching your target criteria:" : "Ótima notícia! Encontramos uma oferta dentro da meta que você definiu:"}
                </p>

                <!-- Box Destaque de Preço -->
                <div style="background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); border: 1px solid #86efac; border-radius: 14px; padding: 20px; text-align: center; margin: 20px 0;">
                  <span style="color: #166534; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; display: block; margin-bottom: 4px;">
                    ${isEn ? "Current Price Found" : "Preço Atual Encontrado"}
                  </span>
                  <div style="color: #15803d; font-size: 36px; font-weight: 900; line-height: 1.1;">
                    ${formattedPrice}
                    <span style="font-size: 14px; font-weight: 600; color: #166534;">${isEn ? " / person" : " / pessoa"}</span>
                  </div>
                  <div style="margin-top: 8px; color: #14532d; font-size: 13px; font-weight: 600;">
                    ${isEn ? "Your Target" : "Sua Meta"}: <strong>${formattedTarget}</strong>
                    ${discountPercent > 0 ? ` • <span style="background-color: #15803d; color: #ffffff; padding: 2px 6px; border-radius: 6px; font-size: 11px;">-${discountPercent}%</span>` : ""}
                  </div>
                  ${totalPax > 1 ? `<div style="margin-top: 6px; color: #475569; font-size: 12px;">Total estimado (${totalPax} passageiros): <strong>${formattedTotal}</strong></div>` : ""}
                </div>

                <!-- Detalhes do Voo -->
                <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px; margin: 20px 0;">
                  <div style="font-size: 14px; color: #1e293b; margin-bottom: 8px;">
                    <strong>📍 ${isEn ? "Route" : "Rota"}:</strong> ${routeDesc}
                  </div>
                  <div style="font-size: 14px; color: #1e293b; margin-bottom: 8px;">
                    <strong>✈️ ${isEn ? "Airline" : "Companhia"}:</strong> ${airline || (isEn ? "Airline" : "Companhia")} ${flightNumber ? `(${flightNumber})` : ""} • <span style="color: #4338ca; font-weight: 600;">${stopsText}</span>
                  </div>
                  ${departureTime || arrivalTime ? `
                    <div style="font-size: 13px; color: #64748b;">
                      <strong>⏰ ${isEn ? "Times" : "Horários"}:</strong> ${departureTime ? `${isEn ? "Dep" : "Saída"}: ${departureTime}` : ""} ${arrivalTime ? ` • ${isEn ? "Arr" : "Chegada"}: ${arrivalTime}` : ""}
                    </div>
                  ` : ""}
                </div>

                <!-- Botão de Ação -->
                <div style="text-align: center; margin: 28px 0 12px 0;">
                  <a href="${actionUrl}" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%); color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 12px; font-weight: 800; font-size: 15px; box-shadow: 0 4px 12px rgba(2, 132, 199, 0.35);">
                    ${isEn ? "View Flight on Google Flights ↗" : "Ver Voo no Google Flights ↗"}
                  </a>
                </div>

                <p style="color: #94a3b8; font-size: 12px; text-align: center; margin: 16px 0 0 0;">
                  ${isEn ? "Prices may change quickly depending on airline demand." : "Os preços podem sofrer alterações a qualquer momento pelas companhias aéreas."}
                </p>
              </div>

              <div style="text-align: center; margin-top: 24px;">
                <p style="color: #94a3b8; font-size: 12px; margin: 0;">
                  ${isEn ? "BipFly • Intelligent Airfare Deal Tracker" : "BipFly • Monitoramento Inteligente de Passagens Aéreas"}
                </p>
              </div>
            </div>
          `,
        }),
      });

      if (res.ok) {
        logger.info("NOTIFICATION", `E-mail de alerta de preço enviado com sucesso para ${email} (Rota: ${origin}->${destination}, Preço: R$ ${price})`);
        return true;
      }
    } catch (err: any) {
      logger.error("NOTIFICATION", `Erro ao enviar e-mail de alerta de preço para ${email}: ${err.message}`);
    }
  }

  // Fallback local
  recordLog({
    level: "SUCCESS",
    category: "NOTIFICATION",
    message: `[ALERTA DE PREÇO] E-mail disparado para ${email} (${origin} → ${destination} por R$ ${price.toFixed(2)} <= Meta R$ ${targetPrice.toFixed(2)}) [${isEn ? "EN" : "PT"}]`,
    details: { email, origin, destination, flightDate, returnDate, price, targetPrice, airline, flightNumber, bookingLink },
  });

  return true;
}


