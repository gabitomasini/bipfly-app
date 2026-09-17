import { NextResponse } from "next/server";
import { scanRoute, scanAllActiveRoutes } from "@/lib/scanner";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const routeId = body.routeId || body.route_id;

    if (routeId) {
      const result = await scanRoute(Number(routeId));
      return NextResponse.json({ success: result.success, data: result });
    } else {
      const result = await scanAllActiveRoutes();
      return NextResponse.json({ success: true, data: result });
    }
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
