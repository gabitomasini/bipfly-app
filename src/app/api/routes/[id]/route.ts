import { NextResponse } from "next/server";
import { findRouteById, updateRoute, deleteRoute, getHistoryByRoute } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Acesso não autorizado." }, { status: 401 });
    }

    const { id } = await params;
    const routeId = Number(id);
    const route = await findRouteById(routeId, user.id);

    if (!route) {
      return NextResponse.json({ success: false, error: "Rota não encontrada." }, { status: 404 });
    }

    const history = await getHistoryByRoute(routeId, 100);
    return NextResponse.json({ success: true, data: { ...route, history, historico: history } });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Acesso não autorizado." }, { status: 401 });
    }

    const { id } = await params;
    const routeId = Number(id);
    const body = await request.json();

    const origin = body.origin || body.origem;
    const destination = body.destination || body.destino;
    const flightDate = body.flightDate || body.data_voo || body.dataVoo;
    const returnDate = body.returnDate !== undefined ? body.returnDate : (body.return_date !== undefined ? body.return_date : undefined);
    const tripType = body.tripType || body.trip_type;
    const targetPrice = body.targetPrice !== undefined ? body.targetPrice : (body.preco_limite || body.precoLimite);
    const passengers = body.passengers !== undefined ? body.passengers : body.passageiros;
    const children = body.children !== undefined ? Number(body.children) : (body.criancas !== undefined ? Number(body.criancas) : undefined);
    const infantsInLap = body.infantsInLap !== undefined ? Number(body.infantsInLap) : (body.infants_in_lap !== undefined ? Number(body.infants_in_lap) : (body.bebes !== undefined ? Number(body.bebes) : undefined));
    const intervalHours = body.intervalHours !== undefined ? body.intervalHours : body.intervalo_horas;
    const onlyDirect = body.onlyDirect !== undefined ? Boolean(body.onlyDirect) : (body.apenas_diretos !== undefined ? Boolean(body.apenas_diretos) : undefined);
    const isActive = body.isActive !== undefined ? body.isActive : body.ativo;

    const ok = await updateRoute(
      routeId,
      {
        origin,
        destination,
        flightDate,
        returnDate,
        tripType,
        targetPrice: targetPrice !== undefined ? Number(targetPrice) : undefined,
        passengers: passengers !== undefined ? Number(passengers) : undefined,
        children: children !== undefined && !isNaN(children) ? children : undefined,
        infantsInLap: infantsInLap !== undefined && !isNaN(infantsInLap) ? infantsInLap : undefined,
        intervalHours: intervalHours !== undefined ? Number(intervalHours) : undefined,
        onlyDirect,
        isActive,
      },
      user.id
    );

    if (!ok) {
      return NextResponse.json({ success: false, error: "Falha ao atualizar rota ou rota não encontrada." }, { status: 400 });
    }

    const updatedRoute = await findRouteById(routeId, user.id);
    return NextResponse.json({ success: true, data: updatedRoute });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Acesso não autorizado." }, { status: 401 });
    }

    const { id } = await params;
    const routeId = Number(id);
    const ok = await deleteRoute(routeId, user.id);

    if (!ok) {
      return NextResponse.json({ success: false, error: "Rota não encontrada para exclusão." }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Rota excluída com sucesso." });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
