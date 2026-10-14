## Why

O BipFly possui uma arquitetura moderna para monitoramento autônomo de passagens aéreas, combinando Next.js 16, Playwright, Turso/SQLite e detecção de anomalias estatísticas com correção de Bessel ($N-1$). Contudo, uma análise aprofundada do código revelou discrepâncias e vulnerabilidades que comprometem a precisão das cotações, a segurança das configurações e a efetividade dos alertas:

1. **Bugs de parsing no Scraper do Google Flights:**
   - Quando o texto do cartão de voo não contém os padrões literais de paradas ("sem escalas", "1 parada", etc.), a variável cai silenciosamente em `stops = 0` (voo direto), gerando falsos positivos graves para usuários que configuraram "Apenas voos diretos".
   - A limitação aos 5 mais baratos (`uniqueOptions.slice(0, 5)`) ocorre dentro do scraper antes de classificar voos diretos vs. com conexões. Se os 5 menores preços forem voos com conexão, voos diretos existentes são descartados do retorno, fazendo com que rotas marcadas como `onlyDirect` informem erroneamente que não há voos diretos.
   - O extrator de duração utiliza regex genérico que pode capturar a duração de uma escala intermediária (ex: "3 h de escala") em vez da duração total da viagem.

2. **Vulnerabilidades de Segurança em Rotas de API:**
   - Rotas administrativas e intensivas em computação (`/api/settings`, `/api/scheduler`, `/api/scraper/test`, `/api/notify/test`) operam sem autenticação de sessão ou checagem de privilégios de administrador.
   - `GET /api/settings` expõe publicamente credenciais sensíveis (chave SerpApi e tópico ntfy) para qualquer visitante anônimo.
   - `POST /api/scraper/test` e `POST /api/scheduler` permitem que clientes não autenticados disparem execuções de instâncias headless do Playwright e varreduras completas no servidor, abrindo vetor para negação de serviço (DoS) e exaustão de recursos.

3. **Desacoplamento do Motor de Anomalia Z-Score/Bessel no Fluxo de Alertas:**
   - Embora a documentação (README/ARCHITECTURE) prometa disparo imediato de alertas multi-canal via detecção de anomalias estatísticas ($Z \le -1.5$ e $Z \le -2.0$), a função `analyzeFlightPrice` está conectada exclusivamente aos componentes visuais da UI. O scanner de produção (`src/lib/scanner.ts`) avalia apenas a meta fixa de preço (`lowestPrice <= route.targetPrice`), ignorando anomalias estatísticas reais.

4. **Alinhamento Documental do Pipeline Híbrido:**
   - O README descreve uma pipeline concorrente via `Promise.allSettled` com Travelpayouts/Aviasales na varredura principal de rotas, enquanto no código a Travelpayouts é utilizada para calendários/matrizes de datas flexíveis (`/api/flights/matrix`) e monetização de afiliados. A documentação precisa refletir com precisão a arquitetura implementada.

## What Changes

- **Correção da Identificação de Paradas no Scraper:** Substituir o fallback silencioso `stops = 0` por classificação defensiva: inspeção multilíngue mais abrangente (PT/EN), regex numérico para conexões (`/(\d+)\s*(?:parada|escala|stop)/i`) e marcação explícita de `stops: null` (ou `unknown`) caso não seja possível determinar, evitando falso positivo de voo direto.
- **Segregação Inteligente de Voo Direto vs. Conexão:** Modificar `scrapeGoogleFlights` e `scanner.ts` para que o scraper retorne opções preservando os melhores voos diretos E os melhores voos com conexão (ou retorne o conjunto completo qualificado para ordenação e seleção no scanner), garantindo que voos diretos nunca sejam omitidos por corte antecipado de menor preço geral.
- **Parsing Preciso da Duração Total do Voo:** Refinar o regex de duração para priorizar seletores e expressões explícitas de tempo total de voo (ex: `Duração total:\s*...`, durações associadas ao cartão principal ou filtradas para ignorar textos precedidos por "escala em", "parada em" ou "layover").
- **Proteção e Autorização em Rotas Administrativas:**
  - Exigir autenticação (`getAuthUser`) e verificação de privilégios de administrador (`isUserAdmin`) nas rotas `/api/settings` (POST e GET restrito), `/api/scheduler` (ações `restart` e `run_now`), `/api/scraper/test` e `/api/notify/test`.
  - Mascarar chaves sensíveis (`serpApiKey`, `ntfyTopic`) em respostas públicas ou não-administrador de `/api/settings`.
- **Integração do Z-Score e Bessel no Fluxo de Notificações:**
  - Chamar `analyzeFlightPrice` no ciclo de varredura do `scanner.ts` utilizando o histórico de preços da rota.
  - Habilitar gatilho de notificação (`shouldNotify`) quando uma anomalia for detectada (`isDeal = true` com `dealLevel === "OPPORTUNITY"` ou `"IMPERDIVEL"`), respeitando regras de anti-spam/frequência.
  - Enriquecer as notificações Push (NTFY) e E-mails transacionais com badges e métricas da anomalia (Z-score, desvio da média, percentual de desconto).
- **Atualização e Sincronização do README:** Atualizar o diagrama arquitetural e o texto do `README.md` para representar com fidelidade o papel da Travelpayouts (calendário de tarifas flexíveis e links de afiliado) e a atuação do motor de anomalia Z-score acoplado ao scanner.

## Capabilities

### New Capabilities
- `flight-scraper-reliability`: Extração confiável de opções de voo no Google Flights, eliminando falsos positivos de voos diretos, preservando a segregação de voos diretos vs. conexões antes de truncar resultados e garantindo a extração da duração total do voo.
- `admin-api-security`: Autenticação e autorização por papéis (admin) para endpoints de configuração e execução sob demanda do scraper/scheduler, com mascaramento de credenciais sensíveis e blindagem contra DoS.
- `anomaly-alert-dispatch`: Integração do motor estatístico de Z-score com correção de Bessel ($N-1$) no fluxo do scanner em tempo de execução, disparando notificações multi-canal quando oportunidades tarifárias anômalas forem identificadas.

### Modified Capabilities
<!-- Nenhuma especificação existente teve seus requisitos de negócio alterados. -->

## Impact

- **Bibliotecas e Módulos Afetados:**
  - `src/lib/scrapers/google-flights-scraper.ts` (lógica de extração DOM, regex de duração, tratamento de paradas, ordenação e corte de opções).
  - `src/lib/scanner.ts` (segregação de voos diretos/escalas, consulta de histórico para anomalias, avaliação de `isDeal` e formatação de alertas).
  - `src/lib/notifier.ts` e `src/lib/email.ts` (inclusão de dados de Z-score e DealLevel nas mensagens).
  - `src/app/api/settings/route.ts` (autenticação, autorização admin e mascaramento de credenciais).
  - `src/app/api/scheduler/route.ts` (autenticação e autorização admin).
  - `src/app/api/scraper/test/route.ts` (autenticação e autorização admin).
  - `src/app/api/notify/test/route.ts` (autenticação e autorização admin).
  - `README.md` e `ARCHITECTURE.md` (alinhamento textual e diagramas).
- **Quebras de Compatibilidade:** Nenhuma quebra de contrato externo; chamadas anônimas aos endpoints administrativos passarão a receber `401 Unauthorized` ou `403 Forbidden`, o que é o comportamento de segurança desejado.
