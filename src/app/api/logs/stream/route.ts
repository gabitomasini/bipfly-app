import { NextRequest } from "next/server";
import { logEmitter } from "@/lib/logger";
import { AppLog } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // Envia confirmação de handshake de conexão
      const initPayload = JSON.stringify({
        type: "connected",
        message: "Conexão SSE estabelecida com sucesso.",
        timestamp: new Date().toISOString(),
      });
      controller.enqueue(encoder.encode(`event: connected\ndata: ${initPayload}\n\n`));

      const onLog = (log: AppLog) => {
        try {
          const data = `event: log\ndata: ${JSON.stringify(log)}\n\n`;
          controller.enqueue(encoder.encode(data));
        } catch {
          // Stream foi fechado
        }
      };

      logEmitter.on("app_log", onLog);

      // Heartbeat periódico (a cada 15 segundos) para manter conexão viva
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`event: ping\ndata: {}\n\n`));
        } catch {
          clearInterval(heartbeat);
        }
      }, 15000);

      req.signal.addEventListener("abort", () => {
        logEmitter.off("app_log", onLog);
        clearInterval(heartbeat);
        try {
          controller.close();
        } catch {}
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
