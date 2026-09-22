import { NextResponse } from "next/server";
import { getHistoryByRoute, getAllHistory, getHistoryByUser } from "@/lib/db";
import { getAuthUser, isUserAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ success: true, data: [], authenticated: false });
    }

    const { searchParams } = new URL(request.url);
    const routeIdParam = searchParams.get("route_id") || searchParams.get("routeId");
    const limit = Number(searchParams.get("limit")) || 100;
    const isAdmin = isUserAdmin(user);

    if (routeIdParam) {
      const history = await getHistoryByRoute(
        Number(routeIdParam),
        limit,
        isAdmin ? undefined : user.id
      );
      return NextResponse.json({ success: true, data: history, authenticated: true });
    } else {
      const history = isAdmin
        ? await getAllHistory(limit)
        : await getHistoryByUser(user.id, limit);
      return NextResponse.json({ success: true, data: history, authenticated: true });
    }
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

