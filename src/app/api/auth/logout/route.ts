import { NextResponse } from "next/server";
import { clearAuthSession } from "@/lib/auth";

export async function POST() {
  try {
    await clearAuthSession();
    return NextResponse.json({
      success: true,
      message: "Sessão encerrada com sucesso.",
    });
  } catch {
    return NextResponse.json(
      { error: "Erro ao encerrar sessão." },
      { status: 500 }
    );
  }
}
