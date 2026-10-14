## Purpose

Provê um serviço de agregação tarifária e um componente interativo de mapa de calor (heatmap de preços) bidimensional correlacionando datas de partida e retorno com as menores tarifas encontradas.

## ADDED Requirements

### Requirement: Consulta de matriz de preços via API
O sistema SHALL disponibilizar uma rota de API capaz de retornar uma grade de preços mínimos calculados para combinações de datas de partida e retorno em uma janela temporal solicitada.

#### Scenario: Consulta de matriz para viagem de ida e volta
- **WHEN** o cliente requisita a matriz informando origem, destino, data de partida base, data de retorno base e janela de flexibilidade
- **THEN** o sistema retorna uma grade bidimensional com as datas de ida no eixo vertical, datas de volta no eixo horizontal e a menor tarifa identificada para cada intersecção válida

#### Scenario: Consulta de matriz para viagem só de ida
- **WHEN** o cliente requisita a matriz para uma viagem sem retorno (one-way)
- **THEN** o sistema retorna uma régua linear unidimensional de datas de partida com suas respectivas menores tarifas no intervalo especificado

#### Scenario: Tratamento de células sem dados tarifários
- **WHEN** não existirem cotações coletadas para uma data específica da grade
- **THEN** o sistema indica o estado de dado indisponível para aquela célula sem interromper a renderização das demais datas da matriz

### Requirement: Exibição visual de heatmap de tarifas
O sistema SHALL renderizar um componente visual interativo com gradiente cromático destacando as tarifas mais econômicas em tons de verde, tarifas medianas em âmbar e tarifas elevadas em tons neutros ou vermelhos, marcando claramente a data original e a célula de menor preço global.

#### Scenario: Visualização do gradiente térmico de preços
- **WHEN** a matriz de preços é carregada na tela
- **THEN** o componente calcula os percentis de preço da grade e colore cada célula de acordo com sua atratividade relativa, destacando visualmente a célula campeã de economia

#### Scenario: Seleção de célula alternativa na matriz
- **WHEN** o usuário clica ou toca em uma célula de preço diferente da data original
- **THEN** o componente exibe um resumo com a diferença de preço em relação à data base (economia em R$ e %) e os detalhes da melhor opção encontrada para aquele dia

### Requirement: Aplicação rápida de nova data a partir da matriz
O sistema SHALL permitir que o usuário atualize as datas da rota monitorada ou do painel de busca ativa diretamente ao clicar em uma data mais barata na matriz.

#### Scenario: Atualização das datas da rota com um clique
- **WHEN** o usuário visualiza uma data mais econômica na matriz e confirma a alteração
- **THEN** o sistema atualiza a rota monitorada com as novas datas de partida/retorno selecionadas e exibe confirmação visual de sucesso
