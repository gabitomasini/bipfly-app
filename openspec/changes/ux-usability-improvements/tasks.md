## 1. Infraestrutura — Hook useModalBehavior e utilitários base

- [x] 1.1 Criar `src/hooks/useModalBehavior.ts` com o hook `useModalBehavior(isOpen, onClose)` que retorna `{ overlayProps, containerRef }`. O hook deve: (a) adicionar listener de ESC via `useEffect` que chama `onClose` quando `isOpen=true`, (b) retornar `overlayProps.onClick` que fecha apenas quando `e.target === e.currentTarget`, (c) implementar focus trap via ref que cicla Tab/Shift+Tab entre elementos focáveis do container. Verificar: abrir qualquer modal no browser, pressionar ESC → modal fecha; clicar no overlay → fecha; clicar dentro → não fecha; Tab não escapa do modal.

- [x] 1.2 Criar `formatRelativeTime(dateString: string): string` em `src/lib/utils.ts` que retorna timestamps relativos em PT-BR ("agora", "há 5 min", "há 2h", "ontem", "há 3 dias", "há 2 semanas"). Verificar: chamar a função com datas de teste (agora, 15min atrás, 2h atrás, ontem, 5 dias atrás) e conferir que os outputs são corretos no console.

## 2. Componentes utilitários novos

- [x] 2.1 Criar `src/components/Toast.tsx` com o componente `Toast` (individual) e `ToastProvider` (context + portal). O provider deve: renderizar toasts via `createPortal` no body, posicionados `fixed bottom-6 right-6 z-[60]`, empilhados verticalmente, com auto-dismiss de 5s e botão X para fechar. Exportar hook `useToast()` que retorna `{ addToast(message, type) }` onde type é `success|error|info|warning`. Verificar: envolver o layout.tsx com `<ToastProvider>`, chamar `addToast("teste", "success")` de qualquer componente → toast aparece no canto inferior direito, desaparece em 5s, e não desloca o layout.

- [x] 2.2 Criar `src/components/SkeletonLoader.tsx` com variantes `metric`, `row` e `card`. Variante `metric` renderiza grid 2×2 (sm:4 colunas) de retângulos `h-24 rounded-xl animate-pulse bg-slate-200`. Variante `row` renderiza N linhas (prop `count`) com blocos internos simulando colunas. Variante `card` renderiza retângulo `h-40 rounded-2xl`. Verificar: renderizar `<SkeletonLoader variant="metric" />` numa página e confirmar visualmente que 4 blocos animados aparecem no grid correto.

- [x] 2.3 Criar `src/components/ConfirmDialog.tsx` como componente stateless controlado com props `isOpen, onConfirm, onCancel, title, message, confirmLabel, variant`. O componente deve usar `useModalBehavior()` internamente, aplicar `role="dialog"` e `aria-modal="true"`, e estilizar com `glass-panel`. Variante `danger` usa botão `bg-rose-600 hover:bg-rose-700` para confirmar. Verificar: abrir o ConfirmDialog, pressionar ESC → cancela; clicar "Excluir Permanentemente" → chama `onConfirm`; clicar overlay → cancela.

## 3. Integrar useModalBehavior nos modais existentes

- [x] 3.1 Integrar `useModalBehavior` no `src/components/RouteModal.tsx`: adicionar `containerRef` no div do conteúdo, `overlayProps` no div do overlay, `role="dialog"`, `aria-modal="true"`, e `aria-label` nos botões de ícone (X). Verificar: abrir RouteModal → ESC fecha, clique no overlay fecha, clique no formulário não fecha, Tab cicla dentro do modal.

- [x] 3.2 Integrar `useModalBehavior` no `src/components/HistoryModal.tsx`: mesmo pattern do 3.1 — overlay props, containerRef, ARIA attributes. Verificar: abrir HistoryModal → ESC fecha, overlay click fecha, foco preso dentro.

- [x] 3.3 Integrar `useModalBehavior` no `src/components/FlightSearchResultsDrawer.tsx`: mesmo pattern. Verificar: abrir drawer de resultados → ESC fecha, overlay click fecha, Tab cicla entre itens de voo e botão Fechar.

## 4. Integrar ToastProvider e migrar feedbacks

- [x] 4.1 Envolver o conteúdo do `src/app/layout.tsx` com `<ToastProvider>` (dentro do `<body>`, envolvendo `{children}`). Verificar: confirmar que o portal de toasts é renderizado no body e que nenhum erro de hydration ocorre.

- [x] 4.2 Migrar feedback da Navbar em `src/components/Navbar.tsx`: substituir o banner inline de "Varredura concluída" / "Erro na varredura" por chamadas a `useToast().addToast()`. Remover o estado local `feedbackType`/`feedbackMsg` e o JSX do banner. Verificar: disparar busca via Navbar → toast aparece no canto inferior direito, conteúdo da página não se desloca.

- [x] 4.3 Migrar feedback na `src/app/configuracoes/page.tsx`: substituir banners de `saveSuccess` e `errorMsg` por toasts. Verificar: salvar configurações → toast de sucesso aparece; erro ao salvar → toast de erro.

## 5. Substituir confirm() e alert() nativos

- [x] 5.1 Na `src/app/rotas/page.tsx`: substituir `window.confirm()` na função `handleDeleteRoute` por estado local que controla `<ConfirmDialog>`. Adicionar estados `confirmDeleteOpen` e `routeToDelete`. Verificar: clicar "Excluir" no menu de um RouteCard → ConfirmDialog customizado aparece com nome da rota; clicar "Cancelar" → nada é excluído; clicar "Excluir Permanentemente" → rota é excluída.

- [x] 5.2 No `src/app/configuracoes/page.tsx`: substituir `alert()` na `handleAddHour` e `handleRemoveHour` por estado de erro inline (`hourError`). Renderizar mensagem de erro abaixo do campo de horário com estilo `text-rose-600 bg-rose-50 border-rose-200` e ícone AlertCircle. Verificar: digitar horário inválido → mensagem inline aparece abaixo do campo; nenhum `alert()` nativo é exibido.

## 6. Skeleton Loaders nas páginas

- [x] 6.1 No `src/app/page.tsx` (Dashboard): substituir o spinner centralizado de loading por `<SkeletonLoader variant="metric" />` para os MetricCards e `<SkeletonLoader variant="row" count={5} />` para a tabela. Verificar: recarregar Dashboard → skeletons animados aparecem no lugar dos cards e tabela durante o carregamento; ao carregar, dados reais substituem os skeletons sem layout shift.

- [x] 6.2 No `src/app/rotas/page.tsx`: substituir spinner de loading por `<SkeletonLoader variant="card" count={4} />` no grid de RouteCards. Verificar: recarregar Rotas → skeleton cards aparecem durante loading.

## 7. Tabela responsiva mobile no Dashboard

- [x] 7.1 No `src/app/page.tsx`: adicionar `className="hidden md:block"` na `<table>` existente. Adicionar bloco `<div className="md:hidden space-y-3">` com cards mobile mapeando as mesmas rotas. Cada card mobile exibe: trecho (origem→destino) como título, data do voo, preço atual com badge de status, e botões de ação compactos (ícones). Verificar: redimensionar janela para <768px → cards empilhados visíveis; >768px → tabela visível.

## 8. Ações visíveis no RouteCard

- [x] 8.1 No `src/components/RouteCard.tsx`: mover o botão "Buscar agora" do menu contextual (`···`) para a área de ações visíveis, ao lado de "Ver Voo" e "Histórico". Manter no menu apenas: "Importar histórico", "Pausar/Retomar", "Editar", "Excluir". O botão deve mostrar ícone `RefreshCw` com tooltip "Buscar agora" e texto compacto. Verificar: visualizar RouteCard → botão "Buscar agora" visível sem abrir menu; clicar → busca é disparada; menu `···` contém apenas ações secundárias.

## 9. MetricCards clicáveis

- [x] 9.1 No `src/components/MetricCards.tsx`: transformar cada card em elemento clicável usando `useRouter().push()`. Mapear: "Rotas Ativas" → `/rotas?filter=active`, "No Preço Alvo" → `/rotas?filter=target`, "Pausadas" → `/rotas?filter=paused`. Adicionar `cursor-pointer` e efeito hover (`hover:shadow-md hover:-translate-y-0.5 transition-all`). Verificar: clicar em "No Preço Alvo" → navega para `/rotas` com filtro "No Alvo" pré-selecionado.

- [x] 9.2 No `src/app/rotas/page.tsx`: ler `searchParams.filter` da URL e pré-selecionar o filtro correspondente no estado `statusFilter` ao montar o componente. Verificar: acessar `/rotas?filter=target` → filtro "No Alvo" está selecionado e apenas rotas no alvo são exibidas.

## 10. Paginação na página de Logs

- [x] 10.1 No `src/app/logs/page.tsx`: adicionar estados `currentPage` e `itemsPerPage` (default 10). Computar `paginatedLogs = logs.slice(start, end)`. Renderizar controles de paginação abaixo da lista: botões Anterior/Próxima, seletor de itens por página (10, 50, 100), indicador "Página X de Y". Novos logs SSE incrementam `totalCount` e, se o usuário está na página 1, inserem no topo. Verificar: carregar Logs com >10 registros → apenas 10 visíveis; clicar "Próxima" → próxima página; trocar para 50/página → 50 visíveis.

## 11. Melhorias de visualização de dados

- [x] 11.1 No `src/components/PriceHistoryChart.tsx`: trocar `LineChart` + `Line` por `AreaChart` + `Area` do Recharts. Adicionar `<defs>` com `<linearGradient id="priceGradient">` de `#0284c7` (opacity 0.3) para transparente (opacity 0). Usar `fill="url(#priceGradient)"` na Area. Manter as `ReferenceLine` de meta e média. Verificar: abrir gráfico de uma rota com histórico → área preenchida com gradiente abaixo da linha; linhas de referência visíveis; tooltip funcional.

- [x] 11.2 No `src/app/logs/page.tsx`: substituir `formatDateTimeBR(log.timestamp)` por `<span title={formatDateTimeBR(log.timestamp)}>{formatRelativeTime(log.timestamp)}</span>`. Verificar: log recente mostra "há X min"; hover mostra data/hora completa no tooltip.

- [x] 11.3 No `src/components/HistoryModal.tsx`: simplificar para preview — remover gráfico completo, tabela paginada e StatisticalAnalysisCard. Substituir por: (a) badge de deal level (reutilizar lógica do StatisticalAnalysisCard), (b) gráfico sparkline compacto (h-32, sem eixos, apenas a linha + área), (c) mini-tabela das últimas 5 cotações (sem paginação). Adicionar botão "Ver análise completa →" com `router.push(\`/historico?route=${routeId}\`)`. Verificar: abrir modal de histórico → preview compacto exibido; clicar "Ver análise completa" → navega para `/historico` com rota pré-selecionada.

- [x] 11.4 No `src/app/historico/page.tsx`: ler `searchParams.route` e pré-selecionar a rota correspondente no dropdown ao montar. Verificar: acessar `/historico?route=5` → rota com id=5 pré-selecionada e seu gráfico/tabela carregados.

## 12. RouteMultiSelectDropdown com busca interna

- [x] 12.1 No `src/components/RouteMultiSelectDropdown.tsx`: adicionar estado `searchTerm` e campo `<input>` no topo do dropdown aberto. Filtrar a lista de rotas exibidas pelo termo de busca (match em `origin`, `destination`, ou label). Verificar: abrir dropdown, digitar "MIA" → apenas rotas com MIA (origem ou destino) são exibidas.

## 13. Sticky save bar na Configurações

- [x] 13.1 No `src/app/configuracoes/page.tsx`: adicionar estado `isDirty` que compara `settings` com `initialSettings` (capturado ao carregar). Quando `isDirty=true`, renderizar barra `fixed bottom-0 left-0 right-0 z-40 md:bottom-0 bottom-16` (acima do BottomNav em mobile) com o botão "Salvar" e indicação "Alterações não salvas". Após salvar com sucesso, resetar `isDirty` e disparar toast. Remover botão de salvar fixo do final do form. Verificar: editar qualquer configuração → barra sticky aparece; salvar → barra desaparece e toast confirma; sem edição → barra não visível.

## 14. Verificação final

- [x] 14.1 Executar `npm run build` e verificar que não há erros de compilação TypeScript ou de build do Next.js. Corrigir quaisquer erros encontrados.

- [x] 14.2 Testar manualmente os fluxos completos no browser: (a) Dashboard com skeleton + tabela responsiva + MetricCards clicáveis; (b) Rotas com ConfirmDialog + RouteCard com "Buscar agora" visível; (c) Modais com ESC/overlay/focus trap; (d) Configurações com inline errors + sticky save; (e) Logs com paginação + timestamps relativos; (f) Histórico com modal simplificado e navegação com query param.

