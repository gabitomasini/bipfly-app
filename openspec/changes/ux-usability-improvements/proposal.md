## Why

A aplicação Radar de Passagens tem uma fundação visual sólida (nota 7.2/10), mas apresenta problemas críticos de usabilidade que comprometem a experiência do usuário: tabelas ilegíveis em mobile, modais sem fechar por ESC/overlay, uso de `confirm()`/`alert()` nativos do browser, ausência de skeleton loading, feedback que causa layout shift, ações importantes escondidas em menus contextuais, e duplicação de informação entre páginas. Essas falhas impactam diretamente a interação diária com a ferramenta e precisam ser corrigidas para atingir o nível de polish esperado.

## What Changes

### Interação e Responsividade (P0)
- Tabela de cotações do Dashboard transforma-se em cards empilhados em mobile (`< md:`), mantendo tabela em desktop
- Todos os modais (RouteModal, HistoryModal, FlightSearchResultsDrawer) ganham fechamento por ESC, clique no overlay, e focus trap
- `window.confirm()` substituído por componente `ConfirmDialog` customizado com glass-panel
- `window.alert()` na página de Configurações substituído por mensagens de erro inline
- Skeleton loaders implementados nos MetricCards, tabela do Dashboard e RouteCards

### Feedback e Notificações (P1)
- Sistema global de toast notifications (canto inferior direito) substitui feedback inline na Navbar que causa layout shift
- Botão "Buscar agora" movido para fora do menu `···` do RouteCard, ficando visível ao lado dos botões de ação
- Paginação adicionada à página de Logs com controles de itens por página

### Visualização de Dados e Navegação (P1/P2)
- MetricCards tornam-se clicáveis com navegação contextual (ex: "No Alvo" → `/rotas?filter=target`)
- HistoryModal simplificado para preview rápido (sparkline + 5 últimas cotações) com link para `/historico?route=<id>`
- Gráfico PriceHistoryChart evolui de LineChart para AreaChart com gradiente
- Timestamps recebem formato relativo ("há 2h") com tooltip absoluto ao hover
- Botão "Salvar" da página Configurações fixado em barra sticky quando há alterações não salvas
- Busca interna adicionada ao RouteMultiSelectDropdown no Histórico

### Acessibilidade (P2)
- Atributos ARIA adicionados: `role="dialog"` + `aria-modal` nos modais, `role="menu"` no menu contextual, `role="tablist"` nos filtros, `aria-label` em botões de ícone, `aria-live="polite"` nos banners de feedback

## Capabilities

### New Capabilities
- `ui/modal-interactions`: Comportamento de fechamento (ESC, overlay click, focus trap) e acessibilidade ARIA para todos os overlays e modais da aplicação
- `ui/feedback-system`: Sistema de toast notifications global e skeleton loading que substituem os padrões nativos e spinners centralizados
- `ui/responsive-layouts`: Layouts adaptativos mobile-first para tabelas e cards de dados, incluindo a tabela do Dashboard e ações visíveis no RouteCard
- `ui/data-visualization`: Melhorias em gráficos (AreaChart com gradiente), timestamps relativos, MetricCards clicáveis, e sticky save button na Configurações

### Modified Capabilities
_(nenhuma capability existente tem seus requisitos spec-level alterados — `retroactive-price-history` permanece inalterada)_

## Impact

### Componentes afetados
- `src/components/RouteModal.tsx` — ESC, overlay click, focus trap, ARIA
- `src/components/HistoryModal.tsx` — idem + simplificação para preview
- `src/components/FlightSearchResultsDrawer.tsx` — idem
- `src/components/RouteCard.tsx` — "Buscar agora" visível, reorganização de ações
- `src/components/MetricCards.tsx` — navegação clicável
- `src/components/Navbar.tsx` — remoção do feedback inline
- `src/components/PriceHistoryChart.tsx` — AreaChart com gradiente
- `src/components/RouteMultiSelectDropdown.tsx` — busca interna
- `src/app/page.tsx` — tabela responsiva mobile, skeleton loaders
- `src/app/rotas/page.tsx` — ConfirmDialog, skeleton loaders
- `src/app/historico/page.tsx` — integração com rota pré-selecionada via query param
- `src/app/logs/page.tsx` — paginação, timestamps relativos
- `src/app/configuracoes/page.tsx` — inline errors, sticky save bar
- `src/app/globals.css` — animações skeleton, estilos toast
- `src/lib/utils.ts` — função `formatRelativeTime()`

### Novos componentes
- `src/components/ConfirmDialog.tsx`
- `src/components/Toast.tsx` + `ToastProvider` (context)
- `src/components/SkeletonLoader.tsx`

### Dependências
- Nenhuma nova dependência externa necessária. Tudo implementável com React, CSS e as libs já instaladas (recharts, lucide-react).
