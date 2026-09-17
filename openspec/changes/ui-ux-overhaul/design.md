## Context

Ver `proposal.md` para motivação. A aplicação possui Next.js 15 (App Router), Tailwind CSS e Lucide Icons. Os gráficos utilizam Recharts. As rotas atuais possuem componentes reutilizáveis que serão aprimorados e desacoplados para elevar a usabilidade e a ergonomia da interface.

## Goals / Non-Goals

**Goals:**
- Criar o componente `AirportCombobox` com busca tolerante a acentos e dados pré-carregados das principais capitais e aeroportos globais.
- Refatorar `PriceHistoryChart` e `MultiRoutePriceChart` para suportar filtros temporais (`7D`, `15D`, `30D`, `Tudo`) com `ReferenceLine` do Recharts para a meta.
- Redesenhar `src/app/page.tsx` para focar em cards de oportunidades imediatas, comparativo rápido e resumo de status do radar.
- Criar `src/components/BottomNav.tsx` para ergonomia mobile nativa e desobstruir a navbar superior.

**Non-Goals:**
- Não alterar a estrutura do banco de dados SQLite nem as rotas de backend existentes (mudança focada 100% na camada de apresentação e experiência).

## Decisions

### 1. Combobox de Aeroportos Embutido
- **Decisão**: Criar um dataset local e leve com ~200+ dos principais aeroportos internacionais e nacionais em `src/lib/airports-data.ts`, com busca instantânea por IATA, nome da cidade, país ou nome do aeroporto sem depender de chamadas externas de rede.
- **Alternativa considerada**: Chamar uma API de busca de aeroportos externa a cada tecla digitada — descartado por adicionar latência e risco de limite de requisições.

### 2. Filtro de Intervalo nos Gráficos
- **Decisão**: Implementar state `timeRange` nos componentes de gráfico com opções `7d` | `15d` | `30d` | `all`, recalculando o array de pontos em tempo de renderização no cliente.

### 3. Bottom Nav no Mobile
- **Decisão**: Componente fixado na base da tela com `fixed bottom-0 left-0 right-0 z-50 md:hidden bg-white/95 backdrop-blur border-t border-slate-200`.

## Risks / Trade-offs

- **[Risco] Aeroporto exótico fora da lista de autocomplete** → *Mitigação*: Permitir que o usuário digite qualquer código IATA de 3 letras arbitrário caso não esteja no dataset padrão.
