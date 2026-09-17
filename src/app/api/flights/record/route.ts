import { NextRequest, NextResponse } from "next/server";
import { insertFlightPrice, getRecentPriceHistory } from "@/lib/db";
import { analyzeFlightPrice } from "@/lib/stats/flight-anomaly-detector";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json(
        { success: false, error: "Corpo da requisição inválido ou JSON malformatado." },
        { status: 400 }
      );
    }

    const origin = (body.origin || body.origem || "").trim().toUpperCase();
    const destination = (body.destination || body.destino || "").trim().toUpperCase();
    const departureDate = (body.departureDate || body.departure_date || body.data_voo || "").trim();
    const rawPrice = body.price ?? body.preco;
    const price = typeof rawPrice === "number" ? rawPrice : parseFloat(rawPrice);
    const recordedAt = body.recordedAt || body.recorded_at || new Date().toISOString();

    if (!origin || !destination) {
      return NextResponse.json(
        { success: false, error: "Campos 'origin' e 'destination' são obrigatórios (ex: 'GRU', 'LIS')." },
        { status: 400 }
      );
    }

    if (!departureDate || !/^\d{4}-\d{2}-\d{2}$/.test(departureDate)) {
      return NextResponse.json(
        { success: false, error: "Campo 'departureDate' inválido. Use o formato ISO YYYY-MM-DD (ex: '2026-11-20')." },
        { status: 400 }
      );
    }

    if (isNaN(price) || price <= 0) {
      return NextResponse.json(
        { success: false, error: "Campo 'price' deve ser um número positivo maior que zero." },
        { status: 400 }
      );
    }

    const recentRecords = getRecentPriceHistory(origin, destination, departureDate, 30);
    const analysis = analyzeFlightPrice(origin, destination, departureDate, price, recentRecords);

    const recordedId = insertFlightPrice({
      origin,
      destination,
      departureDate,
      price,
      recordedAt,
    });

    return NextResponse.json({
      success: true,
      data: {
        recordedId,
        origin,
        destination,
        departureDate,
        price,
        recordedAt,
        analysis,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: `Erro interno ao processar cotação: ${error.message}` },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const origin = (searchParams.get("origin") || searchParams.get("origem") || "").trim().toUpperCase();
    const destination = (searchParams.get("destination") || searchParams.get("destino") || "").trim().toUpperCase();
    const departureDate = (searchParams.get("departureDate") || searchParams.get("departure_date") || searchParams.get("data_voo") || "").trim();
    const testPriceStr = searchParams.get("price");

    if (!origin || !destination || !departureDate) {
      return NextResponse.json(
        {
          success: false,
          error: "Parâmetros obrigatórios na query: 'origin', 'destination', 'departureDate'.",
        },
        { status: 400 }
      );
    }

    const records = getRecentPriceHistory(origin, destination, departureDate, 30);

    let testAnalysis = null;
    if (testPriceStr && !isNaN(parseFloat(testPriceStr))) {
      testAnalysis = analyzeFlightPrice(origin, destination, departureDate, parseFloat(testPriceStr), records);
    }

    return NextResponse.json({
      success: true,
      data: {
        origin,
        destination,
        departureDate,
        totalRecordsLast30Days: records.length,
        records,
        testAnalysis,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: `Erro ao consultar histórico: ${error.message}` },
      { status: 500 }
    );
  }
}
