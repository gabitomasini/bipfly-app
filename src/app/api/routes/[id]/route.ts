import { NextResponse } from "next/server";
import { findRouteById, updateRoute, deleteRoute, getHistoryByRoute } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const routeId = Number(id);
    const route = findRouteById(routeId);

    if (!route) {
      return NextResponse.json({ success: false, error: "Rota não encontrada." }, { status: 404 });
    }

    const history = getHistoryByRoute(routeId, 100);
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
    const { id } = await params;
    const routeId = Number(id);
    const body = await request.json();

    const origin = body.origin || body.origem;
    const destination = body.destination || body.destino;
    const flightDate = body.flightDate || body.data_voo || body.dataVoo;
    const targetPrice = body.targetPrice !== undefined ? body.targetPrice : (body.preco_limite || body.precoLimite);
    const passengers = body.passengers !== undefined ? body.passengers : body.passageiros;
    const intervalHours = body.intervalHours !== undefined ? body.intervalHours : body.intervalo_horas;
    const isActive = body.isActive !== undefined ? body.isActive : body.ativo;

    const ok = updateRoute(routeId, {
      origin,
      destination,
      flightDate,
      targetPrice: targetPrice !== undefined ? Number(targetPrice) : undefined,
      passengers: passengers !== undefined ? Number(passengers) : undefined,
      intervalHours: intervalHours !== undefined ? Number(intervalHours) : undefined,
      isActive,
    });

    if (!ok) {
      return NextResponse.json({ success: false, error: "Falha ao atualizar rota." }, { status: 400 });
    }

    const updatedRoute = findRouteById(routeId);
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
    const { id } = await params;
    const routeId = Number(id);
    const ok = deleteRoute(routeId);

    if (!ok) {
      return NextResponse.json({ success: false, error: "Rota não encontrada para exclusão." }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Rota excluída com sucesso." });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
