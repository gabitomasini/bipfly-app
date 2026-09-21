import { NextRequest, NextResponse } from "next/server";
import { getLogs, getLogStats, clearLogs } from "@/lib/db";
import { LogCategory, LogLevel } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const levelParam = searchParams.get("level");
    const categoryParam = searchParams.get("category");
    const search = searchParams.get("search") || "";
    const routeIdParam = searchParams.get("route_id") || searchParams.get("routeId");
    const limitParam = searchParams.get("limit");
    const offsetParam = searchParams.get("offset");

    const level = (levelParam as LogLevel | "ALL") || "ALL";
    const category = (categoryParam as LogCategory | "ALL") || "ALL";
    const routeId = routeIdParam ? Number(routeIdParam) : undefined;
    const limit = limitParam ? Math.min(Number(limitParam), 500) : 100;
    const offset = offsetParam ? Number(offsetParam) : 0;

    const { logs, total } = await getLogs({
      level,
      category,
      search,
      routeId,
      limit,
      offset,
    });

    const stats = await getLogStats();

    return NextResponse.json({
      success: true,
      data: {
        logs,
        total,
        stats,
        page: Math.floor(offset / limit) + 1,
        limit,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: `Erro ao obter logs: ${err.message}` },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const daysParam = searchParams.get("days") || searchParams.get("dias");
    const days = daysParam ? Number(daysParam) : undefined;

    const removed = await clearLogs(days);

    return NextResponse.json({
      success: true,
      data: {
        removed,
        message: days
          ? `Logs com mais de ${days} dias foram excluídos (${removed} registros).`
          : `Todos os logs foram excluídos (${removed} registros).`,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: `Erro ao limpar logs: ${err.message}` },
      { status: 500 }
    );
  }
}
