## Purpose

Permite que os usuários configurem margens de flexibilidade de datas (intervalo de ±1 a ±3 dias ou voos em finais de semana) para rotas monitoradas, identificando automaticamente tarifas mais baratas em dias adjacentes e emitindo alertas acionáveis.

## ADDED Requirements

### Requirement: Configuração de flexibilidade de datas na rota
O sistema SHALL permitir que o usuário defina uma tolerância de datas de 0 (data exata), ±1 dia, ±2 dias ou ±3 dias, ou ative a opção exclusiva de finais de semana ao criar ou editar uma rota monitorada.

#### Scenario: Criação de rota com flexibilidade de ±2 dias
- **WHEN** o usuário cria uma nova rota informando origem, destino, data de partida e seleciona a opção de flexibilidade de ±2 dias
- **THEN** o sistema salva a rota com a tolerância de 2 dias e agenda o monitoramento considerando a janela de datas resultante

#### Scenario: Configuração de modo somente finais de semana
- **WHEN** o usuário ativa a opção de flexibilidade focada em finais de semana para uma rota com ida e volta
- **THEN** o sistema restringe as combinações monitoradas prioritariamente para partidas entre quinta e sexta-feira e retornos entre domingo e segunda-feira

#### Scenario: Manutenção de data exata padrão
- **WHEN** o usuário cria uma rota sem alterar a opção de flexibilidade de datas
- **THEN** o sistema define a tolerância como 0 dias e monitora estritamente a data exata informada, preservando o comportamento padrão

### Requirement: Varredura periódica de datas adjacentes
O sistema SHALL verificar periodicamente as tarifas das datas contidas na janela de flexibilidade configurada durante as rotinas agendadas de varredura.

#### Scenario: Detecção de tarifa menor em data alternativa
- **WHEN** o scanner periódico executa a varredura de uma rota configurada com flexibilidade de ±2 dias e encontra uma tarifa 35% mais barata 1 dia antes da data planejada
- **THEN** o sistema armazena a menor tarifa encontrada para a data adjacente e associa a informação de desvio de data ao registro da rota

#### Scenario: Tarifa da data original permanece a mais vantajosa
- **WHEN** as tarifas cotadas nas datas adjacentes forem superiores ou iguais à tarifa da data original
- **THEN** o sistema mantém a data original como a melhor oferta corrente e não sugere alteração de data

### Requirement: Notificação inteligente com recomendação de melhor data
O sistema SHALL enriquecer os alertas disparados (notificações push e e-mails) com a recomendação explícita da melhor data alternativa quando esta oferecer uma economia superior à data original ou atingir a meta estipulada pelo usuário.

#### Scenario: Disparo de alerta com recomendação de antecipação ou adiamento
- **WHEN** uma data flexível atingir o preço-alvo ou apresentar queda tarifária significativa em relação à data base
- **THEN** o alerta enviado ao usuário exibe a data alternativa recomendada, o valor da tarifa, o percentual de economia em relação à data original e o link direto para a nova data

#### Scenario: Alerta quando ambas as datas atingem a meta
- **WHEN** tanto a data original quanto uma data flexível atingirem o preço-alvo configurado
- **THEN** o sistema prioriza no cabeçalho do alerta a opção de menor custo absoluto e menciona a disponibilidade de tarifa na data original
