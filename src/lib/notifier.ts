import { PriceAnalysisResult } from "./types";

export async function sendNtfyNotification(params: {
  topic: string;
  origin: string;
  destination: string;
  flightDate: string;
  price: number;
  targetPrice: number;
  currency?: string;
  passengers?: number;
  children?: number;
  infantsInLap?: number;
  airline?: string | null;
  flightNumber?: string | null;
  departureTime?: string | null;
  arrivalTime?: string | null;
  stops?: number | null;
  bookingLink?: string | null;
  anomalyAnalysis?: PriceAnalysisResult;
  recommendedAlternative?: {
    departureDate: string;
    returnDate?: string | null;
    price: number;
    savingsPercent: number;
    bookingLink?: string;
  };
}): Promise<boolean> {
  const { topic, origin, destination, flightDate, price, targetPrice, currency = "BRL" } = params;

  if (!topic || !topic.trim()) {
    console.warn("[NOTIFIER] Tópico ntfy.sh não configurado.");
    return false;
  }

  const totalPax = (params.passengers || 1) + (params.children || 0) + (params.infantsInLap || 0);

  const formattedPrice = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency,
  }).format(price);

  const formattedTarget = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency,
  }).format(targetPrice);

  let title = `🚨 Passagem em Alerta: ${origin} ✈️ ${destination} por ${formattedPrice}/pess.`;
  const tags = ["airplane", "moneybag", "rotating_light"];

  if (params.anomalyAnalysis?.isDeal) {
    if (params.anomalyAnalysis.dealLevel === "IMPERDIVEL") {
      title = `🔥 Preço Anômalo IMPERDÍVEL: ${origin} ✈️ ${destination} por ${formattedPrice}/pess.`;
      tags.unshift("fire");
    } else {
      title = `✨ Oportunidade Tarifária: ${origin} ✈️ ${destination} por ${formattedPrice}/pess.`;
      tags.unshift("sparkles");
    }
  }

  const lines = [
    `🎯 Meta por pessoa: ${formattedTarget}`,
    `📅 Data do Voo: ${flightDate}`,
    `💰 Menor Preço Encontrado: ${formattedPrice} / pessoa`,
  ];

  if (params.anomalyAnalysis?.isDeal) {
    const anom = params.anomalyAnalysis;
    const badge = anom.dealLevel === "IMPERDIVEL" ? "🔥 IMPERDÍVEL" : "✨ OPORTUNIDADE";
    lines.push(`📊 Análise Estatística: ${badge} (Z-Score: ${anom.zScore})`);
    if (anom.mean) {
      const formattedMean = new Intl.NumberFormat("pt-BR", { style: "currency", currency }).format(anom.mean);
      lines.push(`📉 Média histórica: ${formattedMean} (${anom.discountPercent}% abaixo da média)`);
    }
  }

  if (totalPax > 1) {
    const totalGroup = new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency,
    }).format(price * totalPax);
    lines.push(`👥 Total para ${totalPax} passageiros: ${totalGroup}`);
  }

  if (params.airline) {
    lines.push(`🏢 Companhia: ${params.airline}${params.flightNumber ? ` (${params.flightNumber})` : ""}`);
  }

  if (params.departureTime || params.arrivalTime) {
    lines.push(`🕒 Horários: Partida ${params.departureTime || "--:--"} | Chegada ${params.arrivalTime || "--:--"}`);
  }

  if (params.stops !== undefined && params.stops !== null) {
    lines.push(`🔄 Escalas: ${params.stops === 0 ? "Voo Direto" : `${params.stops} parada(s)`}`);
  }

  if (params.recommendedAlternative) {
    const alt = params.recommendedAlternative;
    const formattedAlt = new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency,
    }).format(alt.price);
    const dateDesc = alt.returnDate ? `${alt.departureDate} a ${alt.returnDate}` : alt.departureDate;
    lines.push(`💡 Dica de Data Flexível: Em ${dateDesc} a tarifa cai para ${formattedAlt} (-${alt.savingsPercent}%)!`);
  }

  lines.push(`\n⚡ Monitorado pelo BipFly. Clique para comprar ou conferir!`);

  const body = lines.join("\n");

  try {
    const payload: any = {
      topic: topic.trim(),
      title,
      message: body,
      priority: 4, // 4 = high
      tags,
    };

    if (params.bookingLink) {
      payload.click = params.bookingLink;
      payload.actions = [
        {
          action: "view",
          label: "✈️ Comprar no Google Flights",
          url: params.bookingLink,
        },
      ];
    }

    const res = await fetch("https://ntfy.sh", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error(`[NOTIFIER] ntfy.sh retornou HTTP ${res.status}:`, errText);
      return false;
    }

    return true;
  } catch (err: any) {
    console.error("[NOTIFIER] Falha ao disparar alerta ntfy:", err);
    return false;
  }
}

// Backward-compatibility alias
export const enviarNotificacaoNtfy = async (dados: any) => {
  return sendNtfyNotification({
    topic: dados.topico || dados.topic,
    origin: dados.origem || dados.origin,
    destination: dados.destino || dados.destination,
    flightDate: dados.dataVoo || dados.flightDate,
    price: dados.preco || dados.price,
    targetPrice: dados.precoLimite || dados.targetPrice,
    currency: dados.moeda || dados.currency,
    airline: dados.ciaAerea || dados.airline,
    flightNumber: dados.numeroVoo || dados.flightNumber,
    departureTime: dados.partidaHorario || dados.departureTime,
    arrivalTime: dados.chegadaHorario || dados.arrivalTime,
    stops: dados.escalas !== undefined ? dados.escalas : dados.stops,
    bookingLink: dados.linkCompra || dados.bookingLink,
  });
};
