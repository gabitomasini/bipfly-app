import { NextResponse } from "next/server";
import { getOnlineUserStats } from "@/lib/db";
import { getAuthUser, isUserAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await getAuthUser();
    if (!isUserAdmin(user)) {
      return NextResponse.json(
        { success: false, error: "Acesso não autorizado às métricas de usuários." },
        { status: 403 }
      );
    }

    const onlineStats = await getOnlineUserStats();

    return NextResponse.json({
      success: true,
      data: onlineStats,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro desconhecido";
    return NextResponse.json(
      { success: false, error: `Erro ao obter estatísticas de usuários online: ${message}` },
      { status: 500 }
    );
  }
}
