import { NextResponse } from "next/server";
import { countRecentLoginCodesByEmail, createLoginCode, getOrCreateUser } from "@/lib/db";
import { generateOtpCode } from "@/lib/auth";
import { sendOtpEmail } from "@/lib/email";
import { logger } from "@/lib/logger";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, name } = body;

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json(
        { error: "Informe um endereço de e-mail válido." },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();

    // 1. Rate Limiting: relaxado para testes locais
    const isDev = process.env.NODE_ENV !== "production";
    const recentAttempts = await countRecentLoginCodesByEmail(cleanEmail, 15);
    if (!isDev && recentAttempts >= 20) {
      logger.warn("NOTIFICATION", `Rate limit excedido para solicitação de código OTP: ${cleanEmail}`);
      return NextResponse.json(
        {
          error: "Você atingiu o limite de envios. Por favor, aguarde alguns instantes antes de solicitar um novo código.",
        },
        { status: 429 }
      );
    }

    // 2. Localiza ou cria o usuário
    const user = await getOrCreateUser(cleanEmail, name);

    // 3. Gera código OTP de 6 dígitos
    const code = generateOtpCode();

    // 4. Salva no banco de dados com validade de 15 minutos
    const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || null;
    await createLoginCode({
      userId: user.id,
      code,
      ipAddress: ip,
      expiresInMinutes: 15,
    });

    const cookieHeader = request.headers.get("cookie") || "";
    const cookieLocaleMatch = cookieHeader.match(/radar_passagens_locale=([^;]+)/);
    const detectedLocale =
      body.locale ||
      request.headers.get("x-locale") ||
      (cookieLocaleMatch ? cookieLocaleMatch[1] : undefined) ||
      "en";

    // 5. Dispara e-mail com o código
    await sendOtpEmail({
      email: user.email,
      code,
      name: user.name,
      locale: detectedLocale,
    });

    return NextResponse.json({
      success: true,
      message: "Código de verificação enviado para o seu e-mail.",
      email: user.email,
    });
  } catch (error: any) {
    logger.error("API", `Erro em /api/auth/send-code: ${error.message}`);
    return NextResponse.json(
      { error: "Erro interno ao enviar código de acesso." },
      { status: 500 }
    );
  }
}
