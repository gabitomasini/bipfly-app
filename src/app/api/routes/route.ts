import { NextResponse } from "next/server";
import { listRoutes, createRoute, getOrCreateUser, getUserRouteCount } from "@/lib/db";
import { getAuthUser, createAndSetSession, isUserAdmin, MAX_ROUTES_PER_USER } from "@/lib/auth";
import { sendRouteCreatedEmail } from "@/lib/email";
import { logger } from "@/lib/logger";
import { validateFullName, validateEmail } from "@/lib/validation";
import { scanRoute } from "@/lib/scanner";

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

    const isAdmin = isUserAdmin(user);
    const routes = await listRoutes({ userId: user.id, activeOnly });
    const totalUserRoutes = await getUserRouteCount(user.id);
    return NextResponse.json({
      success: true,
      data: routes,
      authenticated: true,
      user: { id: user.id, email: user.email, name: user.name, isAdmin },
      maxRoutes: isAdmin ? null : MAX_ROUTES_PER_USER,
      routeCount: totalUserRoutes,
      canCreateMore: isAdmin || totalUserRoutes < MAX_ROUTES_PER_USER,
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
      const locale = (body.locale === "en" ? "en" : "pt") as "pt" | "en";

      const nameVal = validateFullName(name, locale);
      if (!nameVal.isValid) {
        return NextResponse.json(
          {
            success: false,
            error: nameVal.error || "Informe seu nome e sobrenome completos.",
            requiresAuth: true,
          },
          { status: 400 }
        );
      }

      const emailVal = validateEmail(email, locale);
      if (!emailVal.isValid) {
        return NextResponse.json(
          {
            success: false,
            error: emailVal.error || "Informe um endereço de e-mail válido para receber os alertas.",
            suggestedEmail: emailVal.suggestedValue,
            requiresAuth: true,
          },
          { status: 400 }
        );
      }

      // Cria ou recupera o usuário e estabelece a sessão persistente
      user = await getOrCreateUser(email.trim().toLowerCase(), name.trim());
      await createAndSetSession(user.id);
      logger.info("SYSTEM", `Usuário cadastrado/reconhecido via Progressive Profiling: ${user.email}`);
    }

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Falha ao identificar usuário para a rota." },
        { status: 401 }
      );
    }

    // Validação de Limite de Rotas por E-mail (Máximo 3 rotas para usuários comuns)
    const isAdmin = isUserAdmin(user);
    if (!isAdmin) {
      const currentRouteCount = await getUserRouteCount(user.id);
      if (currentRouteCount >= MAX_ROUTES_PER_USER) {
        const detectedLocale = body.locale === "en" ? "en" : "pt";
        const limitError =
          detectedLocale === "en"
            ? `Limit of ${MAX_ROUTES_PER_USER} routes per email reached. Delete an existing route to add a new one.`
            : `Limite de ${MAX_ROUTES_PER_USER} rotas por e-mail atingido. Exclua uma rota existente para cadastrar uma nova.`;

        logger.info("API", `Limite de rotas atingido para usuário ${user.email} (${currentRouteCount}/${MAX_ROUTES_PER_USER})`);
        return NextResponse.json(
          {
            success: false,
            error: limitError,
            limitReached: true,
            maxRoutes: MAX_ROUTES_PER_USER,
            currentCount: currentRouteCount,
          },
          { status: 403 }
        );
      }
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

    const cookieHeader = request.headers.get("cookie") || "";
    const cookieLocaleMatch = cookieHeader.match(/radar_passagens_locale=([^;]+)/);
    const detectedLocale =
      body.locale ||
      request.headers.get("x-locale") ||
      (cookieLocaleMatch ? cookieLocaleMatch[1] : undefined) ||
      "en";

    // Envia e-mail de confirmação de monitoramento
    sendRouteCreatedEmail({
      email: user.email,
      name: user.name,
      origin: origin.trim().toUpperCase(),
      destination: destination.trim().toUpperCase(),
      flightDate,
      returnDate,
      targetPrice: Number(targetPrice),
      currency: body.currency || "BRL",
      passengers: Number(passengers) || 1,
      children: isNaN(children) ? 0 : children,
      infantsInLap: isNaN(infantsInLap) ? 0 : infantsInLap,
      locale: detectedLocale,
    }).catch((err) => {
      logger.error("NOTIFICATION", `Falha no disparo do e-mail de confirmação da rota #${id}: ${err.message}`);
    });

    // Dispara a busca inicial de preços em background imediatamente
    scanRoute(id).catch((err) => {
      logger.error("SCANNER", `Falha na busca inicial automática para a rota #${id}: ${err.message}`);
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
