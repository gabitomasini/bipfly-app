import { NextResponse } from "next/server";
import { getSchedulerStatus, restartScheduler, triggerImmediateScan } from "@/lib/scheduler";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const status = await getSchedulerStatus();
    return NextResponse.json({ success: true, data: status });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { action } = body;

    if (action === "restart") {
      const status = await restartScheduler();
      return NextResponse.json({ success: true, data: status });
    }

    if (action === "run_now") {
      const result = await triggerImmediateScan();
      return NextResponse.json({ success: true, data: result });
    }

    const status = await getSchedulerStatus();
    return NextResponse.json({ success: true, data: status });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
