## Purpose

Define a experiência visual e interativa da aplicação, garantindo usabilidade intuitiva na criação de rotas, navegação responsiva mobile e visualização analítica avançada de preços.

## ADDED Requirements

### Requirement: Autocomplete de Aeroportos no Cadastro de Rotas
The system SHALL / O sistema DEVE fornecer um componente de seleção com busca preditiva para os campos de origem e destino, permitindo ao usuário buscar por cidade, nome do aeroporto ou código IATA.

#### Scenario: Busca de aeroporto por nome da cidade
- **WHEN** o usuário digita "Roma" no campo de destino
- **THEN** o sistema exibe opções filtradas contendo "FCO - Roma Fiumicino" e "CIA - Roma Ciampino" com seleção em um clique.

#### Scenario: Seleção com código IATA direto
- **WHEN** o usuário digita "GRU"
- **THEN** o sistema seleciona e formata "GRU - São Paulo Guarulhos".

### Requirement: Controles de Período e Metas nos Gráficos de Preço
The system SHALL / O sistema DEVE permitir ao usuário filtrar a janela temporal dos gráficos de histórico (7 dias, 15 dias, 30 dias, Tudo) e exibir a linha horizontal de referência do preço-alvo (meta).

#### Scenario: Filtrar histórico para os últimos 7 dias
- **WHEN** o usuário clica no seletor de período "7D"
- **THEN** o gráfico ajusta os eixos e plota apenas as cotações dos últimos 7 dias.

#### Scenario: Visualização da Linha de Meta
- **WHEN** um gráfico individual de rota com meta definida é renderizado
- **THEN** uma linha tracejada horizontal de referência é exibida com o valor exato da meta.

### Requirement: Diferenciação entre Dashboard e Gestão de Rotas
The system SHALL / O sistema DEVE estruturar a página inicial (`/`) como um painel de inteligência de oportunidades (voos no alvo, variações recentes, atividade do radar) e a página `/rotas` como a central de listagem, criação e edição detalhada de rotas.

#### Scenario: Visualização de Oportunidades no Dashboard
- **WHEN** existem passagens com preço igual ou inferior à meta
- **THEN** o Dashboard destaca uma seção prioritária "Oportunidades em Destaque (No Alvo)" com acesso direto à compra.

### Requirement: Navegação Mobile Otimizada (Bottom Navigation)
The system SHALL / O sistema DEVE exibir uma barra de navegação inferior fixa em telas móveis (`< 768px`) contendo os destinos principais da aplicação.

#### Scenario: Acesso em dispositivo móvel
- **WHEN** a aplicação é carregada em uma tela com largura inferior a 768px
- **THEN** a barra inferior fixa é exibida permitindo navegação ergonômica com polegar.
