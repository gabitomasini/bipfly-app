import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const user = await getAuthUser();

    if (!user) {
      return NextResponse.json(
        { success: false, authenticated: false, message: "Não autenticado" },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      authenticated: true,
      userId: user.id,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro interno no heartbeat";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
