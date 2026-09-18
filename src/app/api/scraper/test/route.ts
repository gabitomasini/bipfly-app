import { NextResponse } from "next/server";
import { scrapeGoogleFlights } from "@/lib/scrapers/google-flights-scraper";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const origin = body.origin || body.origem || "GRU";
    const destination = body.destination || body.destino || "MIA";

    const defaultDate = new Date();
    defaultDate.setDate(defaultDate.getDate() + 30);
    const flightDate = body.flightDate || body.date || body.data_voo || defaultDate.toISOString().split("T")[0];
    const returnDate = body.returnDate || body.return_date || null;
    const tripType = body.tripType || body.trip_type || (returnDate ? "round_trip" : "one_way");
    const passengers = Number(body.passengers || body.passageiros) || 1;

    const options = await scrapeGoogleFlights(origin, destination, flightDate, passengers, 5, returnDate, tripType);

    return NextResponse.json({
      success: true,
      data: {
        origin,
        destination,
        flightDate,
        returnDate,
        tripType,
        totalFound: options.length,
        options,
      },
      options,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Falha ao executar Web Scraping." },
      { status: 500 }
    );
  }
}
