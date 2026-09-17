## Purpose

Define o comportamento de fechamento e acessibilidade para todos os overlays e modais da aplicação, incluindo RouteModal, HistoryModal e FlightSearchResultsDrawer, garantindo padrões de interação consistentes e inclusivos.

## ADDED Requirements

### Requirement: Modal fecha ao pressionar tecla ESC
O sistema DEVE fechar qualquer modal ou overlay aberto quando o usuário pressionar a tecla ESC no teclado, independente de qual elemento dentro do modal esteja focado.

#### Scenario: Usuário pressiona ESC com modal aberto
- **WHEN** um modal (RouteModal, HistoryModal ou FlightSearchResultsDrawer) está visível e o usuário pressiona a tecla ESC
- **THEN** o modal é fechado e o foco retorna ao elemento que o abriu

#### Scenario: ESC não afeta modais fechados
- **WHEN** nenhum modal está aberto e o usuário pressiona ESC
- **THEN** nenhuma ação é executada na página

### Requirement: Modal fecha ao clicar no overlay
O sistema DEVE fechar o modal quando o usuário clicar diretamente na área de overlay (fundo escuro), mas NÃO quando clicar dentro do conteúdo do modal.

#### Scenario: Clique no overlay fecha o modal
- **WHEN** o usuário clica na área escura (overlay) ao redor do conteúdo do modal
- **THEN** o modal é fechado

#### Scenario: Clique no conteúdo não fecha o modal
- **WHEN** o usuário clica dentro do conteúdo do modal (formulários, botões, texto)
- **THEN** o modal permanece aberto

### Requirement: Focus trap dentro do modal
O sistema DEVE prender o foco de teclado (Tab/Shift+Tab) dentro do modal enquanto ele estiver aberto, impedindo que o foco escape para elementos da página por trás do overlay.

#### Scenario: Tab não escapa do modal
- **WHEN** o modal está aberto e o usuário pressiona Tab repetidamente
- **THEN** o foco cicla entre os elementos interativos do modal sem alcançar elementos da página por trás

### Requirement: Atributos ARIA nos modais
O sistema DEVE incluir `role="dialog"` e `aria-modal="true"` em todos os containers de modal, e `aria-label` descritivo em botões de ícone (fechar, ações).

#### Scenario: Leitor de tela identifica o modal
- **WHEN** um modal está aberto e o usuário navega com screen reader
- **THEN** o modal é anunciado como diálogo com seu título e os botões de ícone têm descrições acessíveis

### Requirement: ConfirmDialog customizado substitui window.confirm()
O sistema DEVE exibir um diálogo de confirmação customizado estilizado (glass-panel) ao invés de `window.confirm()` nativo para ações destrutivas como exclusão de rota.

#### Scenario: Exclusão de rota mostra diálogo customizado
- **WHEN** o usuário clica em "Excluir" no menu contextual de uma rota
- **THEN** um diálogo customizado aparece com o trecho da rota, botão "Excluir Permanentemente" (vermelho) e "Cancelar" (neutro)

#### Scenario: Cancelar o diálogo não exclui a rota
- **WHEN** o usuário clica "Cancelar" ou pressiona ESC no ConfirmDialog
- **THEN** a rota não é excluída e o diálogo é fechado

### Requirement: Erros inline substituem window.alert()
O sistema DEVE exibir mensagens de erro inline abaixo dos campos de formulário ao invés de usar `window.alert()` nativo para validações na página de Configurações.

#### Scenario: Horário inválido mostra erro inline
- **WHEN** o usuário tenta adicionar um horário no formato inválido na Configurações
- **THEN** uma mensagem de erro aparece abaixo do campo de entrada (estilo rose/vermelho com ícone) sem usar `window.alert()`
