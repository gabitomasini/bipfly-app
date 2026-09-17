## Context

A aplicação é um Next.js 16 app (App Router, `"use client"` em todas as páginas) com React 19, TailwindCSS 4, Recharts 3, e Lucide React. Todos os componentes já usam um design system informal baseado em classes `.glass-panel`, variáveis CSS em `:root`, e paleta Slate/Sky/Emerald. Não há biblioteca de componentes UI externa (sem Radix, Headless UI, etc.) — tudo é implementado diretamente.

Ver proposal.md para a motivação completa e a lista de capabilities.

## Goals / Non-Goals

**Goals:**
- Implementar todas as melhorias P0 e P1 do diagnóstico UX sem introduzir dependências externas
- Criar componentes utilitários reutilizáveis (Toast, ConfirmDialog, Skeleton) que sigam o design system existente
- Manter total compatibilidade com o fluxo atual — nenhuma funcionalidade existente pode quebrar
- Código incrementalmente implementável: cada tarefa é independente e pode ser feita/testada isoladamente

**Non-Goals:**
- Dark mode (P2, escopo separado — requer mapeamento de todas as variáveis CSS)
- Onboarding wizard (P3, baixo impacto imediato)
- Feedback sonoro/háptico (P3, baixo impacto)
- Refatoração arquitetural do Dashboard vs Rotas (P1 item #7 — impacto alto mas escopo muito grande; será tratado como change separada)
- Acessibilidade completa WCAG 2.1 — apenas ARIA mínimo nos modais e menus contextuais

## Decisions

### 1. Toast system via React Context + Portal

**Decisão**: Implementar toasts com um `ToastProvider` (React Context) que renderiza os toasts via `createPortal` no body, e um hook `useToast()` que qualquer componente pode chamar.

**Alternativas consideradas**:
- **Biblioteca (react-hot-toast, sonner)**: Adicionaria dependência desnecessária. O projeto já tem zero bibliotecas de UI.
- **Event emitter global**: Mais desacoplado mas menos idiomático em React e dificulta SSR/hydration.
- **Context + Portal**: Zero deps, idiomático, permite stacking, position fixed, e não causa layout shift.

**Rationale**: O contexto é colocado no `layout.tsx` envolvendo `{children}` e `<BottomNav>`. O portal renderiza os toasts como `position: fixed; bottom: 24px; right: 24px; z-index: 60`. Cada toast tem ID único, auto-dismiss com timer, e animação de entrada/saída.

### 2. Skeleton loader como componente genérico com variantes

**Decisão**: Um único componente `<Skeleton variant="card|row|metric" />` que aceita `width`, `height`, `className` e renderiza um `div` com animação `animate-pulse` e `bg-slate-200 rounded-xl`.

**Alternativas consideradas**:
- **Skeletons específicos por componente** (SkeletonMetricCard, SkeletonRouteCard): Mais fiel ao layout final mas mais código para manter.
- **Componente genérico com variantes**: Equilibra fidelidade visual com manutenibilidade.

**Rationale**: Variantes predefinidas (`metric` = 4 cards em grid, `row` = linhas de tabela, `card` = card retangular) cobrem 90% dos casos de uso. Classes adicionais via `className` permitem ajustes pontuais.

### 3. Modal behavior como hook `useModalBehavior()`

**Decisão**: Extrair a lógica de ESC, overlay click, e focus trap num hook customizado `useModalBehavior(isOpen, onClose)` que retorna `{ overlayProps, containerRef }`. Cada modal existente consome o hook sem reescrever a lógica.

**Alternativas consideradas**:
- **Componente wrapper `<ModalBase>`**: Forçaria refatorar o JSX de todos os modais para encaixar no wrapper.
- **Hook + ref**: Menos invasivo — os modais mantêm sua estrutura JSX atual e apenas adicionam o ref e as props no overlay.

**Rationale**: Os 3 modais têm estruturas JSX distintas. Um hook é o approach menos disruptivo. O hook adiciona um `useEffect` para ESC listener, retorna `onClick` handler para overlay, e usa `ref` para focus trap com `MutationObserver` nos focusable elements.

### 4. Tabela responsiva via classes condicionais (não dois componentes)

**Decisão**: Na `page.tsx` do Dashboard, usar `hidden md:block` na tabela existente e `md:hidden` num bloco de cards mobile, dentro do mesmo componente. Não criar componente separado.

**Alternativas consideradas**:
- **Componente `<ResponsiveTable>`**: Over-engineering para um único uso.
- **CSS-only com `display: grid` em mobile**: Mais elegante mas menos previsível com 7 colunas de dados heterogêneos.
- **Dual render com `hidden`/`md:hidden`**: Simples, declarativo, e fácil de manter.

**Rationale**: A tabela do Dashboard é o único caso de tabela densa. Os dados já estão no mesmo `routes.map()`, então duplicar o JSX com classes condicionais é mais direto do que abstrair.

### 5. ConfirmDialog como componente stateless controlado

**Decisão**: `<ConfirmDialog isOpen onConfirm onCancel title message confirmLabel="Excluir" variant="danger" />`. O componente consome `useModalBehavior()` internamente.

**Rationale**: Pattern consistente com RouteModal e HistoryModal (stateless, controlado pelo pai). O `variant="danger"` aplica botão vermelho (bg-rose-600) automaticamente.

### 6. Timestamps relativos com `formatRelativeTime()` puro (sem Intl.RelativeTimeFormat)

**Decisão**: Implementar uma função `formatRelativeTime(dateString)` em `utils.ts` que calcula a diferença e retorna strings como "há 5 min", "há 2h", "ontem", "há 3 dias". Sem uso de `Intl.RelativeTimeFormat` para evitar variações entre browsers.

**Alternativas consideradas**:
- **`Intl.RelativeTimeFormat`**: API nativa mas output varia entre locales e browsers.
- **Biblioteca (date-fns, timeago.js)**: Dependência extra desnecessária.
- **Função manual**: ~30 linhas, determinístico, em português BR.

### 7. HistoryModal simplificado com navegação para `/historico`

**Decisão**: Reduzir o HistoryModal para exibir apenas: badge de status estatístico (deal level), gráfico sparkline compacto (h-32, sem eixos), e mini-tabela das últimas 5 cotações. Um botão "Ver análise completa →" navega para `/historico` com query param `?route=<id>` que a página de Histórico usa para pré-selecionar a rota.

**Rationale**: Elimina ~300 linhas de UI duplicada (tabela paginada, gráfico completo, StatisticalAnalysisCard) que já existem na página `/historico`. O modal passa a servir como "quick glance" com escape para deep dive.

## Risks / Trade-offs

**[Dual render na tabela mobile]** → Renderiza a tabela e os cards simultaneamente (apenas um visível via CSS). Pode impactar marginalmente o DOM size, mas com ~20-30 rotas max o impacto é desprezível. Mitigação: se a lista crescer muito, considerar condicionamento via `useMediaQuery` hook.

**[Toast z-index conflito com modais]** → Toasts usam `z-60`, modais usam `z-50`. Mitigação: toasts devem aparecer acima dos modais. Validar sobreposição visual manualmente.

**[HistoryModal simplificado pode frustrar users acostumados]** → Usuários que já usam o modal para análise completa precisarão de um clique extra (navegar para `/historico`). Mitigação: o link "Ver análise completa" é proeminente e a transição é rápida.

**[Focus trap pode interferir com dropdowns internos]** → O AirportCombobox dentro do RouteModal usa dropdown com foco. O focus trap precisa considerar portals de dropdown. Mitigação: o hook verifica se o `activeElement` está dentro do container do modal (incluindo portals) antes de redirecionar o foco.

**[Sticky save bar pode sobrepor BottomNav em mobile]** → Ambos são `fixed bottom-0`. Mitigação: a barra sticky na Configurações usa `bottom: 4rem` (acima do BottomNav) em mobile, com `md:bottom-0` em desktop.
