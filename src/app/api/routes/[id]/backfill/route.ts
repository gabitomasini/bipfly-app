import { NextResponse } from "next/server";
import { findRouteById, bulkInsertHistoricalFlightPrices } from "@/lib/db";
import { scrapeGoogleFlightsPriceHistory } from "@/lib/scrapers/google-flights-scraper";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const routeId = Number(id);
    const route = await findRouteById(routeId);

    if (!route) {
      return NextResponse.json(
        { success: false, error: `Rota #${routeId} não encontrada.` },
        { status: 404 }
      );
    }

    let days = 60;
    try {
      const url = new URL(request.url);
      const queryDays = url.searchParams.get("days");
      if (queryDays) days = Number(queryDays) || 60;
      else {
        const body = await request.json().catch(() => ({}));
        if (body?.days) days = Number(body.days) || 60;
      }
    } catch {}

    logger.info(
      "SCRAPER",
      `Iniciando importação de histórico retroativo (${days} dias) para rota #${route.id} (${route.origin} → ${route.destination}, ${route.flightDate})`,
      { routeId: route.id, origin: route.origin, destination: route.destination, flightDate: route.flightDate, days },
      route.id
    );

    const points = await scrapeGoogleFlightsPriceHistory(
      route.origin,
      route.destination,
      route.flightDate,
      route.returnDate,
      route.tripType,
      route.passengers || 1,
      route.children || 0,
      route.infantsInLap || 0,
      days
    );

    if (points.length === 0) {
      return NextResponse.json({
        success: false,
        routeId: route.id,
        origin: route.origin,
        destination: route.destination,
        flightDate: route.flightDate,
        importedCount: 0,
        skippedCount: 0,
        message: `O Google Flights não retornou histórico de preços para o período de ${days} dias. Tente um período menor (ex: 30 dias).`,
      });
    }

    const { inserted, skipped } = await bulkInsertHistoricalFlightPrices(route.id, points);

    logger.success(
      "SCRAPER",
      `Histórico retroativo importado com sucesso para rota #${route.id}: ${inserted} dias inseridos, ${skipped} dias já existentes.`,
      { routeId: route.id, inserted, skipped, totalPoints: points.length },
      route.id
    );

    return NextResponse.json({
      success: true,
      routeId: route.id,
      origin: route.origin,
      destination: route.destination,
      flightDate: route.flightDate,
      importedCount: inserted,
      skippedCount: skipped,
      totalPoints: points.length,
      firstDate: points[0]?.date,
      lastDate: points[points.length - 1]?.date,
      message: `Importados ${inserted} dias de histórico de preços com sucesso!`,
    });
  } catch (err: any) {
    logger.error("SCRAPER", `Erro na importação retroativa: ${err.message}`, { error: err.stack });
    return NextResponse.json(
      { success: false, error: `Falha ao importar histórico: ${err.message}` },
      { status: 500 }
    );
  }
}
