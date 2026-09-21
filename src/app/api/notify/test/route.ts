import { NextResponse } from "next/server";
import { sendNtfyNotification } from "@/lib/notifier";
import { getAppSettings } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const settings = await getAppSettings();
    const topic = body.topic || body.topico || settings.ntfyTopic;

    if (!topic) {
      return NextResponse.json(
        { success: false, error: "Tópico ntfy não especificado." },
        { status: 400 }
      );
    }

    const ok = await sendNtfyNotification({
      topic,
      origin: "GRU",
      destination: "FCO",
      flightDate: "2027-05-15",
      price: 1850.0,
      targetPrice: 2200.0,
      currency: "BRL",
      airline: "LATAM Airlines (Teste)",
      flightNumber: "LA 8085",
      departureTime: "18:20",
      arrivalTime: "11:45",
      stops: 0,
    });

    if (ok) {
      return NextResponse.json({
        success: true,
        message: `Notificação de teste enviada com sucesso para o tópico '${topic}'!`,
      });
    } else {
      return NextResponse.json(
        { success: false, error: "Falha ao enviar notificação de teste via ntfy.sh." },
        { status: 500 }
      );
    }
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
