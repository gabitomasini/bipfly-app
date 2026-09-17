# Proposal: Modernização Completa de UI e Experiência do Usuário (UI/UX Overhaul)

## Why

A aplicação possui um motor robusto de monitoramento e histórico de preços, porém a experiência do usuário (UX) e a interface (UI) apresentam sobreposições e fricções:
1. Redundância entre o Dashboard (`/`) e a página de Rotas (`/rotas`).
2. Cadastro de rotas baseado em digitação manual de código IATA sem autocomplete de cidades e aeroportos.
3. Ausência de filtros de período rápido (7D, 15D, 30D, Tudo) e linha visual da meta nos gráficos de histórico.
4. Navegação mobile com empilhamento excessivo no cabeçalho em vez de uma barra de navegação inferior (Bottom Navigation).
5. Feedback genérico de busca ("Buscando...") que não comunica as etapas do scraping ao usuário.

Essa modernização estabelece uma interface de nível profissional (*SaaS-ready*), intuitiva e agradável para uso diário.

## What Changes

- **Autocomplete Inteligente de Aeroportos (`AirportCombobox`)**: Busca preditiva por nome de cidade, país e aeroporto com códigos IATA pré-carregados (ex: digitar "Roma" sugere "FCO - Fiumicino" e "CIA - Ciampino").
- **Redefinição do Dashboard (`/`)**: Transformar o Dashboard no centro de inteligência e oportunidades (destaque para passagens no alvo, maiores quedas recentes, status ao vivo do radar), deixando a gestão operacional detalhada para `/rotas`.
- **Controles de Intervalo e Metas nos Gráficos (`PriceHistoryChart` / `MultiRoutePriceChart`)**: Seletores rápidos de período (7d, 15d, 30d, Tudo), linha horizontal de meta de preço e tooltips aprimorados.
- **Navegação Mobile Nativa (`BottomNav`)**: Barra de navegação inferior fixa em dispositivos móveis (`< 768px`) com ícones táteis e acesso rápido.
- **Progresso Visual de Varredura**: Indicador de etapas em tempo real no disparador de buscas.

## Capabilities

### New Capabilities
- `ui-ux-enhancements`: Novo conjunto de melhorias de interface, incluindo autocomplete preditivo de aeroportos, filtros temporais interativos para gráficos, reestruturação da jornada Dashboard vs Rotas e navegação mobile responsiva.

### Modified Capabilities
<!-- Nenhuma capacidade existente tem seus requisitos funcionais alterados -->

## Impact

- **Componentes**: `src/components/Navbar.tsx`, `src/components/RouteModal.tsx`, `src/components/PriceHistoryChart.tsx`, `src/components/MultiRoutePriceChart.tsx`, `src/components/RouteCard.tsx`, novos componentes `src/components/AirportCombobox.tsx` e `src/components/BottomNav.tsx`.
- **Páginas**: `src/app/page.tsx` (Dashboard), `src/app/rotas/page.tsx` (Rotas), `src/app/historico/page.tsx` (Histórico).
- **Dados/Bibliotecas**: Reutiliza Lucide Icons, Recharts e utilitários existentes em `src/lib/utils.ts`.
