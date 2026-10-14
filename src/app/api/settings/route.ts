import { NextResponse } from "next/server";
import { getAppSettings, saveAppSettings } from "@/lib/db";
import { restartScheduler } from "@/lib/scheduler";
import { getAuthUser, isUserAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Autenticação necessária." },
        { status: 401 }
      );
    }

    if (!isUserAdmin(user)) {
      return NextResponse.json(
        { success: false, error: "Acesso não autorizado às configurações do sistema." },
        { status: 403 }
      );
    }

    const settings = await getAppSettings();
    return NextResponse.json({
      success: true,
      data: {
        ...settings,
        databaseProvider: process.env.TURSO_DATABASE_URL ? "turso_cloud" : "sqlite_local",
        tursoHost: process.env.TURSO_DATABASE_URL ? process.env.TURSO_DATABASE_URL.replace(/:\/\/.*@/, "://") : null,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Autenticação necessária." },
        { status: 401 }
      );
    }

    if (!isUserAdmin(user)) {
      return NextResponse.json(
        { success: false, error: "Apenas administradores podem alterar configurações do sistema." },
        { status: 403 }
      );
    }

    const body = await request.json();

    const scheduleHours = body.scheduleHours || body.schedule_hours;
    const searchProvider = body.searchProvider || body.search_provider;
    const serpApiKey = body.serpApiKey !== undefined ? body.serpApiKey : body.serpapi_api_key;
    const ntfyTopic = body.ntfyTopic !== undefined ? body.ntfyTopic : body.ntfy_topic;
    const autoNotify = body.autoNotify !== undefined ? body.autoNotify : body.auto_notify;

    await saveAppSettings({
      scheduleHours,
      searchProvider,
      serpApiKey,
      ntfyTopic,
      autoNotify,
    });

    if (scheduleHours !== undefined) {
      await restartScheduler();
    }

    const updated = await getAppSettings();
    return NextResponse.json({ success: true, data: updated });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
