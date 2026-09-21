import { NextResponse } from "next/server";
import { getAppSettings, saveAppSettings } from "@/lib/db";
import { restartScheduler } from "@/lib/scheduler";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const settings = await getAppSettings();
    return NextResponse.json({ success: true, data: settings });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
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
