import { NextResponse } from "next/server";
import { ensureInitialized, findRouteById } from "@/lib/db";
import { fetchMonthMatrixPrices, fetchCheapPrices } from "@/services/aviasalesDataService";
import { PriceMatrixCell, PriceMatrixResponse } from "@/lib/types";
import { getGoogleFlightsUrl } from "@/lib/utils";

export const dynamic = "force-dynamic";

function addDays(dateStr: string, days: number): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function getDayOfWeek(dateStr: string): number {
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCDay(); // 0 = Domingo, 5 = Sexta, 6 = Sábado
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const routeIdParam = searchParams.get("routeId");

    let origin = searchParams.get("origin")?.trim().toUpperCase() || "";
    let destination = searchParams.get("destination")?.trim().toUpperCase() || "";
    let baseDepartureDate = searchParams.get("departureDate")?.trim() || "";
    let baseReturnDate = searchParams.get("returnDate")?.trim() || null;
    let flexibilityDays = Number(searchParams.get("flexibilityDays") ?? 2);
    let flexibleWeekends = searchParams.get("flexibleWeekends") === "true";
    const currency = searchParams.get("currency") || "BRL";

    // Se fornecido routeId, busca parâmetros padrão da rota salva
    if (routeIdParam) {
      const routeId = Number(routeIdParam);
      if (!isNaN(routeId)) {
        const route = await findRouteById(routeId);
        if (route) {
          if (!origin) origin = route.origin;
          if (!destination) destination = route.destination;
          if (!baseDepartureDate) baseDepartureDate = route.flightDate;
          if (baseReturnDate === null && route.returnDate) baseReturnDate = route.returnDate;
          if (searchParams.get("flexibilityDays") === null && route.flexibilityDays !== undefined) {
            flexibilityDays = route.flexibilityDays;
          }
          if (searchParams.get("flexibleWeekends") === null && route.flexibleWeekends !== undefined) {
            flexibleWeekends = route.flexibleWeekends;
          }
        }
      }
    }

    if (!origin || !destination || !baseDepartureDate) {
      return NextResponse.json(
        {
          success: false,
          error: "Parâmetros obrigatórios ausentes: origin, destination e departureDate são necessários.",
        },
        { status: 400 }
      );
    }

    // Normaliza tolerância de dias entre 0 e 3
    if (isNaN(flexibilityDays) || flexibilityDays < 0) flexibilityDays = 0;
    if (flexibilityDays > 3) flexibilityDays = 3;

    // Constrói lista de datas de partida
    let departureDates: string[] = [];
    if (flexibleWeekends) {
      // Procura finais de semana (quinta, sexta, sábado) em uma janela de 10 dias
      const candidates: string[] = [];
      for (let offset = -7; offset <= 7; offset++) {
        const d = addDays(baseDepartureDate, offset);
        const dow = getDayOfWeek(d);
        if (dow === 4 || dow === 5 || dow === 6) {
          candidates.push(d);
        }
      }
      departureDates = Array.from(new Set(candidates)).sort().slice(0, 5);
      if (departureDates.length === 0) {
        departureDates = [baseDepartureDate];
      }
    } else if (flexibilityDays === 0) {
      departureDates = [baseDepartureDate];
    } else {
      for (let offset = -flexibilityDays; offset <= flexibilityDays; offset++) {
        departureDates.push(addDays(baseDepartureDate, offset));
      }
    }

    // Constrói lista de datas de retorno se for viagem de ida e volta
    let returnDates: string[] = [];
    const isRoundTrip = Boolean(baseReturnDate);

    if (isRoundTrip && baseReturnDate) {
      if (flexibleWeekends) {
        const candidates: string[] = [];
        for (let offset = -7; offset <= 7; offset++) {
          const d = addDays(baseReturnDate, offset);
          const dow = getDayOfWeek(d);
          if (dow === 0 || dow === 1) { // Domingo ou segunda-feira
            candidates.push(d);
          }
        }
        returnDates = Array.from(new Set(candidates)).sort().slice(0, 5);
        if (returnDates.length === 0) {
          returnDates = [baseReturnDate];
        }
      } else if (flexibilityDays === 0) {
        returnDates = [baseReturnDate];
      } else {
        for (let offset = -flexibilityDays; offset <= flexibilityDays; offset++) {
          returnDates.push(addDays(baseReturnDate, offset));
        }
      }
    }

    // Busca cotações do banco de dados local (flight_history)
    const db = await ensureInitialized();
    const historyMap = new Map<string, { price: number; airline?: string; flightNumber?: string; stops?: number; bookingLink?: string }>();

    try {
      const histPlaceholders = departureDates.map(() => "?").join(",");
      const histRes = await db.execute({
        sql: `
          SELECT flight_date, return_date, lowest_price, airline, flight_number, stops, booking_link
          FROM flight_history
          WHERE origin = ? AND destination = ?
            AND flight_date IN (${histPlaceholders})
          ORDER BY searched_at DESC
        `,
        args: [origin, destination, ...departureDates],
      });

      for (const row of histRes.rows) {
        const key = `${row.flight_date}_${row.return_date || ""}`;
        if (!historyMap.has(key)) {
          historyMap.set(key, {
            price: Number(row.lowest_price),
            airline: row.airline ? String(row.airline) : undefined,
            flightNumber: row.flight_number ? String(row.flight_number) : undefined,
            stops: row.stops !== null ? Number(row.stops) : undefined,
            bookingLink: row.booking_link ? String(row.booking_link) : undefined,
          });
        }
      }
    } catch (err: any) {
      console.warn("[MATRIX_API] Erro ao consultar histórico local:", err.message);
    }

    // Busca cotações da API Aviasales/Travelpayouts para os meses envolvidos
    const monthsToQuery = Array.from(new Set(departureDates.map((d) => d.slice(0, 7))));
    const aviasalesMap = new Map<string, { price: number; airline?: string; flightNumber?: string; stops?: number }>();

    try {
      const apiPromises = monthsToQuery.map((m) =>
        fetchMonthMatrixPrices({ origin, destination, month: m, currency })
      );
      const apiResults = await Promise.all(apiPromises);
      for (const list of apiResults) {
        for (const item of list) {
          const key = `${item.departureDate}_${item.returnDate || ""}`;
          if (!aviasalesMap.has(key) || (item.price && item.price < (aviasalesMap.get(key)?.price || Infinity))) {
            aviasalesMap.set(key, {
              price: item.price,
              airline: item.airline,
              flightNumber: item.flightNumber,
              stops: item.stops,
            });
          }
        }
      }
    } catch (err: any) {
      console.warn("[MATRIX_API] Falha ao consultar Aviasales API:", err.message);
    }

    // Monta todas as células da matriz
    const cells: PriceMatrixCell[] = [];
    const validPrices: number[] = [];
    let basePrice: number | null = null;

    if (isRoundTrip && returnDates.length > 0) {
      for (const dep of departureDates) {
        for (const ret of returnDates) {
          // Ignora combinações inválidas (retorno anterior à partida)
          if (ret < dep) continue;

          const key = `${dep}_${ret}`;
          const localEntry = historyMap.get(key);
          const apiEntry = aviasalesMap.get(key);

          // Prioriza o menor preço confiável conhecido
          let price: number | null = null;
          let airline: string | null = null;
          let flightNumber: string | null = null;
          let stops: number | null = null;
          let bookingLink: string | null = null;

          if (localEntry && localEntry.price > 0) {
            price = localEntry.price;
            airline = localEntry.airline || null;
            flightNumber = localEntry.flightNumber || null;
            stops = localEntry.stops ?? null;
            bookingLink = localEntry.bookingLink || null;
          } else if (apiEntry && apiEntry.price > 0) {
            price = apiEntry.price;
            airline = apiEntry.airline || null;
            flightNumber = apiEntry.flightNumber || null;
            stops = apiEntry.stops ?? null;
          }

          if (price !== null) {
            validPrices.push(price);
          }

          const isBase = dep === baseDepartureDate && ret === baseReturnDate;
          if (isBase && price !== null) {
            basePrice = price;
          }

          cells.push({
            departureDate: dep,
            returnDate: ret,
            price,
            currency,
            isBaseDate: isBase,
            percentile: 0.5, // será recalculado abaixo
            airline,
            flightNumber,
            stops,
            isCheapest: false,
            bookingLink: bookingLink || getGoogleFlightsUrl(origin, destination, dep, 1, ret, "round_trip"),
          });
        }
      }
    } else {
      // Viagem só de ida (one-way)
      for (const dep of departureDates) {
        const key = `${dep}_`;
        const localEntry = historyMap.get(key);
        const apiEntry = aviasalesMap.get(key);

        let price: number | null = null;
        let airline: string | null = null;
        let flightNumber: string | null = null;
        let stops: number | null = null;
        let bookingLink: string | null = null;

        if (localEntry && localEntry.price > 0) {
          price = localEntry.price;
          airline = localEntry.airline || null;
          flightNumber = localEntry.flightNumber || null;
          stops = localEntry.stops ?? null;
          bookingLink = localEntry.bookingLink || null;
        } else if (apiEntry && apiEntry.price > 0) {
          price = apiEntry.price;
          airline = apiEntry.airline || null;
          flightNumber = apiEntry.flightNumber || null;
          stops = apiEntry.stops ?? null;
        }

        if (price !== null) {
          validPrices.push(price);
        }

        const isBase = dep === baseDepartureDate;
        if (isBase && price !== null) {
          basePrice = price;
        }

        cells.push({
          departureDate: dep,
          returnDate: null,
          price,
          currency,
          isBaseDate: isBase,
          percentile: 0.5,
          airline,
          flightNumber,
          stops,
          isCheapest: false,
          bookingLink: bookingLink || getGoogleFlightsUrl(origin, destination, dep, 1, null, "one_way"),
        });
      }
    }

    // Calcula estatísticas globais da matriz
    const minPrice = validPrices.length > 0 ? Math.min(...validPrices) : null;
    const maxPrice = validPrices.length > 0 ? Math.max(...validPrices) : null;
    let cheapestCell: PriceMatrixCell | null = null;

    for (const cell of cells) {
      if (cell.price !== null && minPrice !== null && maxPrice !== null) {
        if (minPrice === maxPrice) {
          cell.percentile = 0.5;
        } else {
          cell.percentile = Math.max(0, Math.min(1, (cell.price - minPrice) / (maxPrice - minPrice)));
        }

        if (cell.price === minPrice) {
          cell.isCheapest = true;
          if (!cheapestCell) {
            cheapestCell = cell;
          }
        }
      }
    }

    const responseData: PriceMatrixResponse = {
      success: true,
      origin,
      destination,
      baseDepartureDate,
      baseReturnDate,
      flexibilityDays,
      flexibleWeekends,
      departureDates,
      returnDates,
      cells,
      minPrice,
      maxPrice,
      cheapestCell,
      basePrice,
      currency,
    };

    return NextResponse.json(responseData);
  } catch (err: any) {
    console.error("[MATRIX_API] Erro ao gerar matriz de preços:", err);
    return NextResponse.json(
      {
        success: false,
        error: err.message || "Erro interno ao gerar matriz de tarifas.",
      },
      { status: 500 }
    );
  }
}
