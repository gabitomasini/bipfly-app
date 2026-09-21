import { NextResponse } from "next/server";
import { getHistoryByRoute, getAllHistory } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const routeIdParam = searchParams.get("route_id") || searchParams.get("routeId");
    const limit = Number(searchParams.get("limit")) || 100;

    if (routeIdParam) {
      const history = await getHistoryByRoute(Number(routeIdParam), limit);
      return NextResponse.json({ success: true, data: history });
    } else {
      const history = await getAllHistory(limit);
      return NextResponse.json({ success: true, data: history });
    }
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
