import { NextResponse } from "next/server";
import { getSchedulerStatus, restartScheduler, triggerImmediateScan } from "@/lib/scheduler";
import { getAuthUser, isUserAdmin } from "@/lib/auth";

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
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Autenticação necessária para gerenciar o scheduler." },
        { status: 401 }
      );
    }

    if (!isUserAdmin(user)) {
      return NextResponse.json(
        { success: false, error: "Apenas administradores podem executar ou reiniciar o agendador." },
        { status: 403 }
      );
    }

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
