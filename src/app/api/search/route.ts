import { NextResponse } from "next/server";
import { scanRoute, scanAllActiveRoutes } from "@/lib/scanner";
import { getAuthUser, isUserAdmin } from "@/lib/auth";
import { findRouteById } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Acesso não autorizado. Faça login para realizar buscas." },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const routeId = body.routeId || body.route_id;
    const isAdmin = isUserAdmin(user);

    if (routeId) {
      const route = await findRouteById(Number(routeId));
      if (!route) {
        return NextResponse.json({ success: false, error: "Rota não encontrada." }, { status: 404 });
      }

      if (route.userId !== user.id && !isAdmin) {
        return NextResponse.json(
          { success: false, error: "Você não tem permissão para pesquisar esta rota." },
          { status: 403 }
        );
      }

      const result = await scanRoute(Number(routeId));
      return NextResponse.json({
        success: result.success,
        data: result,
        error: result.error || (result.success ? undefined : "Nenhum voo encontrado"),
      });
    } else {
      // Se for admin, varre todas as rotas ativas do sistema; se for usuário comum, varre apenas as suas rotas
      const result = await scanAllActiveRoutes({ userId: isAdmin ? undefined : user.id });
      return NextResponse.json({ success: true, data: result });
    }
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
