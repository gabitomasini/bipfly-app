import { NextResponse } from "next/server";
import {
  findUserByEmail,
  findActiveLoginCode,
  incrementLoginCodeFailedAttempts,
  invalidateLoginCode,
  markLoginCodeUsed,
} from "@/lib/db";
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

    // Busca o código OTP ativo para o usuário
    const activeCode = await findActiveLoginCode(user.id);
    if (!activeCode) {
      return NextResponse.json(
        { error: "Código de verificação expirado ou inexistente. Por favor, solicite um novo." },
        { status: 400 }
      );
    }

    // Se já tiver atingido 5 tentativas incorretas, invalida o código
    if ((activeCode.failedAttempts ?? 0) >= 5) {
      await invalidateLoginCode(activeCode.id);
      logger.warn("SYSTEM", `Código OTP bloqueado por excesso de tentativas para usuário ${user.email} (ID: ${user.id})`);
      return NextResponse.json(
        { error: "Limite de tentativas excedido para este código. Por motivos de segurança, solicite um novo código." },
        { status: 429 }
      );
    }

    // Se o código digitado estiver incorreto, incrementa o contador de erros
    if (activeCode.code !== cleanCode) {
      const attempts = await incrementLoginCodeFailedAttempts(activeCode.id);
      const remainingAttempts = Math.max(0, 5 - attempts);

      if (remainingAttempts === 0) {
        await invalidateLoginCode(activeCode.id);
        logger.warn("SYSTEM", `Código OTP invalidado após 5 tentativas incorretas para ${user.email}`);
        return NextResponse.json(
          { error: "Código incorreto. Limite de 5 tentativas excedido. Solicite um novo código." },
          { status: 429 }
        );
      }

      logger.warn("SYSTEM", `Tentativa incorreta de OTP para ${user.email} (${attempts}/5)`);
      return NextResponse.json(
        { error: `Código de verificação incorreto. Você tem mais ${remainingAttempts} tentativa(s).` },
        { status: 400 }
      );
    }

    // Código correto: Marca como utilizado e cria a sessão
    await markLoginCodeUsed(activeCode.id);
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
