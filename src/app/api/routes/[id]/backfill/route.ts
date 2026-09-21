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

    logger.info(
      "SCRAPER",
      `Iniciando importação de histórico retroativo para rota #${route.id} (${route.origin} → ${route.destination}, ${route.flightDate})`,
      { routeId: route.id, origin: route.origin, destination: route.destination, flightDate: route.flightDate },
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
      route.infantsInLap || 0
    );

    if (points.length === 0) {
      return NextResponse.json({
        success: true,
        routeId: route.id,
        origin: route.origin,
        destination: route.destination,
        flightDate: route.flightDate,
        importedCount: 0,
        skippedCount: 0,
        message: "O Google Flights não possui histórico de preços acumulado para esta rota específica.",
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
