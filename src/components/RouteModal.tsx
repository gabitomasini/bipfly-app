"use client";

import { useState, useEffect } from "react";
import { X, Plane, Calendar, DollarSign, AlertCircle, Sparkles, Users } from "lucide-react";
import { MonitoredRoute } from "@/lib/types";
import AirportCombobox from "./AirportCombobox";
import CustomSelect from "./CustomSelect";
import { useModalBehavior } from "@/hooks/useModalBehavior";

interface RouteModalProps {
  isOpen: boolean;
  routeToEdit?: MonitoredRoute | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function RouteModal({
  isOpen,
  routeToEdit,
  onClose,
  onSuccess,
}: RouteModalProps) {
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [flightDate, setFlightDate] = useState("");
  const [passengers, setPassengers] = useState(1);
  const [targetPrice, setTargetPrice] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { overlayProps, containerRef } = useModalBehavior({ isOpen, onClose });

  useEffect(() => {
    if (routeToEdit) {
      setOrigin(routeToEdit.origin);
      setDestination(routeToEdit.destination);
      setFlightDate(routeToEdit.flightDate);
      setPassengers(routeToEdit.passengers || 1);
      setTargetPrice(String(routeToEdit.targetPrice));
      setIsActive(routeToEdit.isActive);
    } else {
      const defaultDate = new Date();
      defaultDate.setDate(defaultDate.getDate() + 45);
      const isoDate = defaultDate.toISOString().split("T")[0];

      setOrigin("GRU");
      setDestination("FCO");
      setFlightDate(isoDate);
      setPassengers(1);
      setTargetPrice("2500");
      setIsActive(true);
    }
    setError(null);
  }, [routeToEdit, isOpen]);

  if (!isOpen) return null;

  const setDateOffsetDays = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    setFlightDate(d.toISOString().split("T")[0]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const normOrigin = origin.trim().toUpperCase();
    const normDestination = destination.trim().toUpperCase();
    const parsedPrice = parseFloat(targetPrice.replace(",", "."));

    if (!normOrigin || normOrigin.length !== 3) {
      setError("Selecione um aeroporto de origem válido (sigla de 3 letras).");
      return;
    }
    if (!normDestination || normDestination.length !== 3) {
      setError("Selecione um aeroporto de destino válido (sigla de 3 letras).");
      return;
    }
    if (normOrigin === normDestination) {
      setError("Origem e destino não podem ser o mesmo aeroporto.");
      return;
    }
    if (!flightDate) {
      setError("Selecione a data prevista para o voo.");
      return;
    }
    if (isNaN(parsedPrice) || parsedPrice <= 0) {
      setError("Informe um preço alvo válido maior que zero.");
      return;
    }

    setLoading(true);
    try {
      if (routeToEdit) {
        const res = await fetch(`/api/routes/${routeToEdit.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            origin: normOrigin,
            destination: normDestination,
            flightDate,
            passengers: Number(passengers),
            targetPrice: parsedPrice,
            isActive,
          }),
        });
        const json = await res.json();
        if (!json.success) throw new Error(json.error || "Falha ao atualizar rota.");
      } else {
        const res = await fetch("/api/routes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            origin: normOrigin,
            destination: normDestination,
            flightDate,
            passengers: Number(passengers),
            targetPrice: parsedPrice,
            isActive: true,
          }),
        });
        const json = await res.json();
        if (!json.success) throw new Error(json.error || "Falha ao criar rota.");
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn" {...overlayProps} role="dialog" aria-modal="true" aria-labelledby="route-modal-title">
      <div ref={containerRef} className="glass-panel w-full max-w-xl p-6 bg-white border border-slate-200 shadow-2xl rounded-2xl relative max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-sky-50 border border-sky-100 text-sky-600">
              <Plane className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900">
                {routeToEdit ? "Editar Rota Monitorada" : "Nova Rota de Monitoramento"}
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Configure os parâmetros de pesquisa contínua e a meta de preço.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Fechar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Erro */}
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center gap-2 font-medium">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Origem e Destino com Autocomplete */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <AirportCombobox
              label="Aeroporto de Origem"
              value={origin}
              onChange={setOrigin}
              placeholder="Origem (ex: São Paulo, GRU)"
            />

            <AirportCombobox
              label="Aeroporto de Destino"
              value={destination}
              onChange={setDestination}
              placeholder="Destino (ex: Roma, MIA, FCO)"
            />
          </div>

          {/* Data do Voo & Atalhos */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-sky-600" />
                <span>Data Prevista do Voo</span>
              </span>
              <span className="text-[11px] text-slate-400 font-normal">
                Atalhos rápidos:
              </span>
            </label>

            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="date"
                value={flightDate}
                onChange={(e) => setFlightDate(e.target.value)}
                required
                className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 text-xs font-semibold focus:outline-none focus:border-sky-500 focus:bg-white transition-colors"
              />

              <div className="flex items-center gap-1.5 shrink-0">
                {[
                  { label: "+30d", days: 30 },
                  { label: "+60d", days: 60 },
                  { label: "+90d", days: 90 },
                  { label: "+180d", days: 180 },
                ].map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => setDateOffsetDays(preset.days)}
                    className="px-2.5 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-sky-100 hover:text-sky-800 text-slate-600 border border-slate-200 transition-colors cursor-pointer"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Preço Limite (Meta) e Passageiros */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                <span>Preço Alvo por Pessoa (R$)</span>
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                  R$
                </span>
                <input
                  type="number"
                  step="0.01"
                  min={1}
                  value={targetPrice}
                  onChange={(e) => setTargetPrice(e.target.value)}
                  placeholder="Ex: 2500.00"
                  required
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 text-sm font-black focus:outline-none focus:border-emerald-500 focus:bg-white transition-colors font-mono"
                />
              </div>
              <span className="text-[11px] text-slate-400 mt-1 block">
                Você receberá um alerta quando o preço for igual ou menor.
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-indigo-600" />
                <span>Passageiros (Adultos)</span>
              </label>
              <CustomSelect
                value={String(passengers)}
                onChange={(val) => setPassengers(Number(val))}
                options={[1, 2, 3, 4, 5, 6].map((num) => ({
                  value: String(num),
                  label: `${num} ${num === 1 ? "Adulto" : "Adultos"}`,
                }))}
                size="md"
              />
            </div>
          </div>

          {/* Ativo Checkbox (se edição) */}
          {routeToEdit && (
            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="ativo-chk"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500 border-slate-300 cursor-pointer"
              />
              <label htmlFor="ativo-chk" className="text-xs text-slate-700 font-semibold cursor-pointer">
                Manter monitoramento ativo no agendador automático
              </label>
            </div>
          )}

          {/* Botões */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 rounded-xl text-xs font-bold bg-sky-600 hover:bg-sky-700 active:bg-sky-800 text-white shadow-xs transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-2"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{loading ? "Salvando..." : routeToEdit ? "Salvar Alterações" : "Cadastrar Rota"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
