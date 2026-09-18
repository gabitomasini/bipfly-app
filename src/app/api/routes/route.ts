import { NextResponse } from "next/server";
import { listRoutes, createRoute } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get("active") === "true" || searchParams.get("ativas") === "true";
    const routes = listRoutes(activeOnly);
    return NextResponse.json({ success: true, data: routes });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const origin = body.origin || body.origem;
    const destination = body.destination || body.destino;
    const flightDate = body.flightDate || body.data_voo || body.dataVoo;
    const targetPrice = body.targetPrice !== undefined ? body.targetPrice : (body.preco_limite || body.precoLimite);
    const passengers = body.passengers !== undefined ? body.passengers : body.passageiros;
    const intervalHours = body.intervalHours !== undefined ? body.intervalHours : body.intervalo_horas;

    if (!origin || !destination || !flightDate || !targetPrice) {
      return NextResponse.json(
        { success: false, error: "Origem, destino, data do voo e preço alvo são obrigatórios." },
        { status: 400 }
      );
    }

    if (origin.trim().toUpperCase() === destination.trim().toUpperCase()) {
      return NextResponse.json(
        { success: false, error: "Origem e destino não podem ser o mesmo aeroporto." },
        { status: 400 }
      );
    }

    const onlyDirect = body.onlyDirect !== undefined ? Boolean(body.onlyDirect) : Boolean(body.apenas_diretos || body.apenasDiretos);
    const returnDate = body.returnDate || body.return_date || null;
    const tripType = body.tripType || body.trip_type || (returnDate ? "round_trip" : "one_way");
    const children = body.children !== undefined ? Number(body.children) : (body.criancas !== undefined ? Number(body.criancas) : 0);
    const infantsInLap = body.infantsInLap !== undefined ? Number(body.infantsInLap) : (body.infants_in_lap !== undefined ? Number(body.infants_in_lap) : (body.bebes !== undefined ? Number(body.bebes) : 0));

    const id = createRoute({
      origin,
      destination,
      flightDate,
      returnDate,
      tripType,
      passengers: Number(passengers) || 1,
      children: isNaN(children) ? 0 : children,
      infantsInLap: isNaN(infantsInLap) ? 0 : infantsInLap,
      targetPrice: Number(targetPrice),
      intervalHours: Number(intervalHours) || 12,
      onlyDirect,
    });

    return NextResponse.json({ success: true, data: { id } }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
