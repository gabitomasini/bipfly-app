import { NextResponse } from "next/server";
import { listRoutes, createRoute, getOrCreateUser } from "@/lib/db";
import { getAuthUser, createAndSetSession } from "@/lib/auth";
import { sendRouteCreatedEmail } from "@/lib/email";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const user = await getAuthUser();
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get("active") === "true" || searchParams.get("ativas") === "true";

    // Se o usuário não estiver autenticado, retorna lista vazia e authenticated: false
    if (!user) {
      return NextResponse.json({
        success: true,
        data: [],
        authenticated: false,
      });
    }

    const routes = await listRoutes({ userId: user.id, activeOnly });
    return NextResponse.json({
      success: true,
      data: routes,
      authenticated: true,
      user: { id: user.id, email: user.email, name: user.name },
    });
  } catch (err: any) {
    logger.error("API", `Erro em GET /api/routes: ${err.message}`);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    let user = await getAuthUser();

    // Se o usuário não tiver sessão ativa, verifica progressive profiling (nome e e-mail no payload)
    if (!user) {
      const email = body.email || body.userEmail;
      const name = body.name || body.userName;

      if (!email || typeof email !== "string" || !email.includes("@")) {
        return NextResponse.json(
          {
            success: false,
            error: "Para ativar o monitoramento, informe um e-mail válido para receber os alertas.",
            requiresAuth: true,
          },
          { status: 401 }
        );
      }

      // Cria ou recupera o usuário e estabelece a sessão persistente
      user = await getOrCreateUser(email, name);
      await createAndSetSession(user.id);
      logger.info("SYSTEM", `Usuário cadastrado/reconhecido via Progressive Profiling: ${user.email}`);
    }

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Falha ao identificar usuário para a rota." },
        { status: 401 }
      );
    }

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

    const id = await createRoute({
      userId: user.id,
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

    // Envia e-mail de confirmação de monitoramento
    sendRouteCreatedEmail({
      email: user.email,
      name: user.name,
      origin: origin.trim().toUpperCase(),
      destination: destination.trim().toUpperCase(),
      flightDate,
      returnDate,
      targetPrice: Number(targetPrice),
      passengers: Number(passengers) || 1,
      children: isNaN(children) ? 0 : children,
      infantsInLap: isNaN(infantsInLap) ? 0 : infantsInLap,
    }).catch((err) => {
      logger.error("NOTIFICATION", `Falha no disparo do e-mail de confirmação da rota #${id}: ${err.message}`);
    });

    return NextResponse.json(
      {
        success: true,
        data: { id, userId: user.id },
        user: { id: user.id, email: user.email, name: user.name },
      },
      { status: 201 }
    );
  } catch (err: any) {
    logger.error("API", `Erro em POST /api/routes: ${err.message}`);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
