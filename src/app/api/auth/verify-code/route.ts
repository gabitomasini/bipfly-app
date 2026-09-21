import { NextResponse } from "next/server";
import { findUserByEmail, findValidLoginCode, markLoginCodeUsed } from "@/lib/db";
import { createAndSetSession } from "@/lib/auth";
import { logger } from "@/lib/logger";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, code } = body;

    if (!email || !code) {
      return NextResponse.json(
        { error: "E-mail e código de 6 dígitos são obrigatórios." },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanCode = String(code).trim();

    const user = await findUserByEmail(cleanEmail);
    if (!user) {
      return NextResponse.json(
        { error: "Nenhuma conta vinculada a este endereço de e-mail." },
        { status: 404 }
      );
    }

    // Valida o código OTP ativo
    const validCode = await findValidLoginCode(user.id, cleanCode);
    if (!validCode) {
      return NextResponse.json(
        { error: "Código de verificação inválido ou expirado. Por favor, solicite um novo." },
        { status: 400 }
      );
    }

    // Marca como utilizado
    await markLoginCodeUsed(validCode.id);

    // Cria sessão persistente e define cookie HTTP-only
    await createAndSetSession(user.id);

    logger.info("SYSTEM", `Usuário autenticado via OTP com sucesso: ${user.email} (ID: ${user.id})`);

    return NextResponse.json({
      success: true,
      message: "Autenticado com sucesso!",
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    });
  } catch (error: any) {
    logger.error("API", `Erro em /api/auth/verify-code: ${error.message}`);
    return NextResponse.json(
      { error: "Erro interno ao validar o código de acesso." },
      { status: 500 }
    );
  }
}
