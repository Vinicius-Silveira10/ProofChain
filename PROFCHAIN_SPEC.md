===============================================================================
PROOFCHAIN — ESPECIFICAÇÃO TÉCNICA COMPLETA v2.0
Sistema Híbrido de Integridade Corporativa para Registro e Auditoria de
Títulos de Dívida Corporativa
Stack: Node.js/TypeScript · PostgreSQL · Solidity/Sepolia · React · Ethers.js
===============================================================================


-------------------------------------------------------------------------------
1. VISÃO GERAL DO PRODUTO
-------------------------------------------------------------------------------

1.1 Problema de Negócio
------------------------
Bancos de dados tradicionais são mutáveis por natureza — um administrador com
acesso privilegiado pode alterar o valor de um Título de Dívida de
R$ 50.000.000 para R$ 5.000.000 sem deixar rastro auditável externo. Auditores
externos e investidores dependem inteiramente da honestidade do custodiante
dos dados.

1.2 Proposta de Valor
----------------------
O ProofChain utiliza uma Arquitetura Híbrida Off-chain/On-chain:

  - Off-chain (PostgreSQL): armazena os dados financeiros completos com
    performance e privacidade (LGPD).

  - On-chain (Ethereum Sepolia): armazena apenas o hash criptográfico SHA-256
    dos dados — um "carimbo matemático" imutável e público.

Se qualquer byte do banco de dados for alterado, o hash recalculado diverge
do hash registrado na blockchain, expondo a fraude instantaneamente.

1.3 Público-Alvo
-----------------
Perfil                        | Necessidade                               | Acesso
------------------------------|-------------------------------------------|---------------------------
Operador Financeiro           | Emitir e registrar Títulos de Dívida      | Autenticado (JWT)
Auditor Interno               | Investigar trilha de adulterações         | Autenticado (JWT + AUDITOR)
Auditor Externo / Investidor  | Verificar autenticidade de um registro    | Público (sem senha)
Administrador do Sistema      | Gestão de usuários e configurações        | Autenticado (JWT + ADMIN)


-------------------------------------------------------------------------------
2. REGRAS DE NEGÓCIO (RN)
-------------------------------------------------------------------------------

=======================================
2.1 Módulo de Emissão [PRC-REC-001]
=======================================

RN-REC-001 — Campos Obrigatórios do Título de Dívida
Um Título de Dívida só pode ser emitido com todos os seguintes campos
preenchidos e válidos:
  - id               : UUID v4 gerado pelo backend (não aceitar UUIDs externos).
  - cnpj_emissor     : CNPJ válido (14 dígitos, com validação do dígito verificador).
  - credor           : Nome completo da pessoa física ou jurídica credora (3–200 caracteres).
  - valor_centavos   : Inteiro positivo maior que zero. Representa o valor em
                       centavos de real (R$).
                       Valor mínimo : R$ 0,01 (1 centavo).
                       Valor máximo : R$ 999.999.999.999,99.
  - data_vencimento  : Data futura em relação à data de emissão. Não pode ser
                       anterior ou igual ao createdAt.

RN-REC-002 — Fórmula de Hash (Imutável)
A composição do hash de integridade é ESTRITA E IMUTÁVEL. Qualquer alteração
na fórmula invalida todos os registros históricos.

  hash_integridade = SHA256(
    id + cnpj_emissor + valor_centavos.toString() + data_vencimento.toISOString()
  )

  Regras de composição:
  - Os campos são concatenados SEM SEPARADORES.
  - data_vencimento deve ser convertida para ISO 8601 UTC antes da
    concatenação (ex: 2025-12-31T00:00:00.000Z).
  - valor_centavos é convertido para string decimal
    (ex: 5000000 representa R$ 50.000,00).
  - O hash resultante é uma string hexadecimal lowercase de 64 caracteres.

RN-REC-003 — Sequência de Operações Atômica
A emissão de um Título de Dívida deve seguir esta sequência exata, com
rollback total em caso de falha em qualquer etapa:
  1. Validar todos os campos de entrada.
  2. Gerar o UUID id.
  3. Calcular o hash_integridade.
  4. Enviar o hash ao Smart Contract na rede Sepolia e aguardar o recibo
     (tx_hash). TIMEOUT MÁXIMO: 60 SEGUNDOS.
  5. Persistir no PostgreSQL dentro de uma transação ACID, incluindo o
     tx_hash recebido.
  6. Registrar no AuditLog a ação INSERT com userId, clientIp e timestamp.

  ATENÇÃO: Se a etapa 4 falhar (timeout, erro de rede, gás insuficiente),
  NENHUM DADO é salvo no PostgreSQL.


=======================================
2.2 Módulo de Persistência [PRC-ARM-002]
=======================================

RN-ARM-001 — Atomicidade SQL-Blockchain
O campo tx_hash NUNCA pode ser nulo em um registro com status = 'ACTIVE'.
Um registro sem tx_hash indica falha de sistema e deve ser marcado como
status = 'ERROR' e não exibido publicamente.

RN-ARM-002 — Campos de Auditoria Obrigatórios
Todo registro na tabela TituloDivida deve conter:
  - hash_integridade : hash SHA-256 calculado no momento da emissão.
  - tx_hash          : hash da transação Ethereum retornado pelo Smart Contract.
  - createdAt        : gerenciado automaticamente pelo Prisma.
  - updatedAt        : gerenciado automaticamente pelo Prisma.

RN-ARM-003 — Unicidade do Hash
O campo hash_integridade deve ter constraint UNIQUE na tabela. Duplicação de
hash indica tentativa de registro duplicado e deve retornar HTTP 409 Conflict.


=======================================
2.3 Módulo de Transferência de Custódia [PRC-MOV-003]
=======================================

RN-MOV-001 — Transferência como Novo Registro
A transferência de custódia de um Título de Dívida (mudança de credor) NÃO
altera o registro original. O sistema cria um novo registro com:
  - Novo id (UUID).
  - Campo supersedes_id apontando para o id do registro anterior.
  - O registro anterior é marcado com status = 'SUPERSEDED'.
  - Um novo hash é calculado e ancorado na blockchain.

RN-MOV-002 — Cadeia de Custódia Rastreável
O sistema deve permitir reconstruir o histórico completo de custódia de
qualquer Título de Dívida, navegando pela cadeia de supersedes_id.


=======================================
2.4 Módulo de Auditoria de Integridade [PRC-INV-004]
=======================================

RN-INV-001 — Rotina de Verificação Automática
Um job assíncrono (cron) executa a cada 15 minutos e:
  1. Seleciona todos os registros com status = 'ACTIVE'.
  2. Recalcula o hash_integridade com os dados atuais do PostgreSQL.
  3. Consulta o Smart Contract (função view, sem custo de gás) para obter
     o hash original.
  4. Se houver divergência: atualiza integrity_status para 'COMPROMISED' e
     cria registro no AuditLog com action = 'INTEGRITY_BREACH_DETECTED'.

RN-INV-002 — Verificação Manual pelo Auditor
A verificação de integridade de um registro individual deve poder ser
disparada manualmente pela API, com resultado imediato (sem aguardar o cron).

RN-INV-003 — Custo Zero de Verificação
Toda consulta à blockchain para fins de auditoria DEVE utilizar funções view
do Smart Contract. É proibido o uso de transações pagas para leitura de dados.


=======================================
2.5 Módulo de Correções [PRC-AJU-005]
=======================================

RN-AJU-001 — Proibição de DELETE Físico
O comando DELETE é ESTRITAMENTE PROIBIDO na tabela TituloDivida em qualquer
circunstância, incluindo em ambientes de desenvolvimento. Apenas seeds e
migrations de setup podem usar DELETE nas tabelas de suporte.

RN-AJU-002 — Correção por Emenda Lógica
Erros de digitação são corrigidos via "emenda": o registro errado recebe
status = 'SUPERSEDED' e um novo registro corrigido é emitido com
supersedes_id referenciando o original. Ambos os registros permanecem no
banco e na blockchain.

RN-AJU-003 — Imutabilidade do Hash Original
O hash_integridade de um registro NUNCA pode ser atualizado após a emissão.
Qualquer tentativa de UPDATE nesse campo deve ser bloqueada em nível de banco
de dados (trigger PostgreSQL) e retornar HTTP 403 Forbidden.


=======================================
2.6 Módulo de Relatórios Forenses [PRC-REL-006]
=======================================

RN-REL-001 — Lógica de Detecção de Fraude (Tela Pública)
Ao consultar um Título de Dívida publicamente, aplicar a lógica:

  SHA256(dados_atuais_postgres) === hash_on_chain
    → STATUS: ÍNTEGRO (exibir em verde)

  SHA256(dados_atuais_postgres) !== hash_on_chain
    → STATUS: FRAUDE DETECTADA (exibir em vermelho)

  Registro não existe no postgres mas existe on-chain
    → STATUS: REGISTRO REMOVIDO (exibir em vermelho)

  tx_hash inválido ou Smart Contract inacessível
    → STATUS: VERIFICAÇÃO PENDENTE (exibir em amarelo)

RN-REL-002 — Trilha Forense para Auditores Autenticados
Quando STATUS = FRAUDE DETECTADA, auditores com role AUDITOR podem acessar:
  - userId    : quem realizou a modificação suspeita.
  - timestamp : data e hora exata da modificação (UTC).
  - clientIp  : endereço IP de onde partiu a requisição.
  - Campo modificado (quando identificável pelo log de diff).
  - Valor anterior vs. valor atual (snapshot no AuditLog).

RN-REL-003 — Retenção de Logs
Registros do AuditLog não podem ser deletados pelo sistema. Retenção mínima:
7 anos (conforme regulação CVM para mercado de capitais brasileiro).


=======================================
2.7 Dashboard Gerencial [PRC-DASH-008]
=======================================

RN-DASH-001 — Métricas Obrigatórias do Painel
O dashboard deve exibir em tempo próximo ao real (refresh a cada 5 minutos):
  - Total de ativos sob custódia (soma de valor_centavos de registros ACTIVE)
    em R$.
  - Quantidade de Títulos de Dívida ativos.
  - Quantidade de Títulos de Dívida comprometidos
    (integrity_status = 'COMPROMISED').
  - Percentual de integridade da carteira
    (registros íntegros / total ativo × 100).
  - Volume de emissões nos últimos 30 dias (gráfico de barras por dia).
  - Distribuição de status de integridade
    (gráfico de pizza: Íntegros × Comprometidos).


=======================================
2.8 Módulo de Gestão de Parcelas e Pagamentos [PRC-PAG-009]
=======================================

RN-PAG-001 — Estrutura de Parcelamento
Um Título de Dívida pode ter seu valor total dividido em parcelas. Cada
parcela é um registro independente na tabela Installment, vinculado ao Título
de Dívida pai via tituloDividaId. O somatório de valor_centavos de todas as
parcelas DEVE ser igual ao valor_centavos do Título de Dívida pai. O backend
valida essa consistência no momento do cadastro — divergência retorna
HTTP 422 Unprocessable Entity.

RN-PAG-002 — Campos Obrigatórios da Parcela
Cada parcela deve conter:
  - numero_parcela           : inteiro sequencial (1, 2, 3, 4…), único dentro
                               do mesmo Título de Dívida.
  - valor_centavos           : valor individual da parcela em centavos (BigInt).
  - data_vencimento_parcela  : data e hora exata do vencimento (DateTime UTC).
  - motivo                   : descrição da origem/finalidade da dívida.
                               Exemplos: "Melhoria de computadores",
                               "Compra de produtos para estoque".
                               Mínimo 10 caracteres, máximo 500.
  - autorizado_por           : nome completo ou cargo do responsável que
                               aprovou o pagamento (campo de texto livre).
  - status_parcela           : enum — PENDENTE | PAGO | VENCIDO | CANCELADO.

RN-PAG-003 — Registro de Pagamento
Ao marcar uma parcela como PAGO, o sistema deve registrar automaticamente:
  - data_hora_pagamento  : timestamp exato da ação (UTC, precisão de segundos).
                           Não aceitar data/hora informada manualmente pelo
                           usuário — deve ser gerada pelo servidor.
  - usuario_pagamento_id : ID do usuário autenticado (capturado do JWT, não
                           digitado manualmente). Obrigatório, nunca nulo.
  Adicionalmente, gerar registro no AuditLog com action = 'PAYMENT_REGISTERED'.

RN-PAG-004 — Imutabilidade após Pagamento
Uma parcela com status_parcela = 'PAGO' não pode ser editada ou cancelada.
Tentativa retorna HTTP 403 Forbidden. Correção de erro deve seguir o processo
de emenda lógica (RN-AJU-002).

RN-PAG-005 — Privacidade Total (LGPD + Sigilo Corporativo)
Os campos motivo, autorizado_por, usuario_pagamento_id e data_hora_pagamento
são classificados como DADOS SENSÍVEIS INTERNOS. Regras obrigatórias:
  - NUNCA são incluídos no cálculo do hash_integridade enviado à blockchain.
  - NUNCA são expostos em endpoints públicos (sem autenticação).
  - São visíveis apenas para usuários com role OPERATOR, AUDITOR ou ADMIN.
  - O hash on-chain continua calculado apenas com os campos do Título de
    Dívida pai (RN-REC-002), preservando a privacidade e conformidade LGPD.

RN-PAG-006 — Vencimento Automático de Parcelas
O cron job de integridade (RN-INV-001) deve também varrer parcelas com
data_vencimento_parcela anterior à data atual e status_parcela = 'PENDENTE',
atualizando-as para 'VENCIDO' automaticamente e gerando AuditLog com
action = 'INSTALLMENT_OVERDUE'.

RN-PAG-007 — Dois Atores Distintos no Registro de Pagamento
  - autorizado_por        : pessoa externa ao sistema (ex: diretor financeiro)
                            que aprovou a dívida — campo de TEXTO LIVRE.
  - usuario_pagamento_id  : usuário do sistema que está registrando o
                            pagamento — capturado AUTOMATICAMENTE do JWT.
  Ambos devem ser rastreados e armazenados de forma independente.

Tabela resumo de privacidade por camada de acesso:

  DADO                       | BLOCKCHAIN | API PÚBLICA | API AUTENTICADA
  ---------------------------|------------|-------------|----------------
  Hash SHA-256               |     SIM    |     SIM     |      SIM
  Valor total / Nº parcelas  |     NÃO    |     SIM     |      SIM
  Motivo da dívida           |     NÃO    |     NÃO     |      SIM
  Quem autorizou             |     NÃO    |     NÃO     |      SIM
  Quem registrou pagamento   |     NÃO    |     NÃO     |      SIM
  Data/hora do pagamento     |     NÃO    |     NÃO     |      SIM


-------------------------------------------------------------------------------
3. REQUISITOS FUNCIONAIS (RF)
-------------------------------------------------------------------------------

RF01 — Autenticação e Autorização
  RF01.1 : Autenticação via JWT com expiração de 8 horas.
  RF01.2 : Roles suportados: OPERATOR, AUDITOR, ADMIN.
  RF01.3 : Endpoints de estado (INSERT/UPDATE) requerem JWT válido e role
           mínimo OPERATOR.
  RF01.4 : Endpoints de auditoria forense requerem role AUDITOR ou ADMIN.
  RF01.5 : GET /api/titulos/:id/verify não requer autenticação.
  RF01.6 : Senhas armazenadas com bcrypt (custo mínimo: 12 rounds).
  RF01.7 : Rate limiting de login: máximo 5 tentativas falhas por IP em
           15 minutos, com bloqueio temporário subsequente.

RF02 — Cadastro de Título de Dívida
  RF02.1 : Formulário web com campos: CNPJ Emissor, Nome do Credor, Valor
           (em R$ com máscara monetária), Data de Vencimento.
  RF02.2 : Validação de CNPJ no frontend E no backend (dígito verificador).
  RF02.3 : Campo de valor aceita formato monetário brasileiro
           (ex: R$ 1.500.000,00) e converte automaticamente para centavos.
  RF02.4 : Comprovante pós-emissão exibe: ID do Título, hash de integridade,
           link para o Etherscan da transação.
  RF02.5 : Loading state com texto "Ancorando na blockchain..." durante
           confirmação on-chain.

RF03 — Motor de Hashing
  RF03.1 : Backend implementa a função de hash conforme RN-REC-002.
  RF03.2 : Função de hash coberta por testes unitários automatizados (TST-001).
  RF03.3 : Função isolada no módulo src/services/hashEngine.ts.

RF04 — Ancoragem On-chain
  RF04.1 : Comunicação com Smart Contract via Ethers.js usando wallet
           configurada por variável de ambiente.
  RF04.2 : Smart Contract implementa storeHash(string id, bytes32 hash).
  RF04.3 : Smart Contract implementa getHash(string id) view returns (bytes32).
  RF04.4 : Smart Contract emite evento
           HashStored(string indexed id, bytes32 hash, uint256 timestamp).
  RF04.5 : Backend monitora timeout de 60s na confirmação da transação.

RF05 — Persistência Híbrida
  RF05.1 : Gravação no PostgreSQL ocorre APENAS após confirmação blockchain
           (RN-ARM-001).
  RF05.2 : Toda operação de escrita envolvida em transação ACID do Prisma.
  RF05.3 : Toda transação ACID gera automaticamente registro no AuditLog
           (via middleware Prisma).

RF06 — Consulta Pública de Autenticidade
  RF06.1 : Qualquer usuário (sem autenticação) informa o ID do Título de
           Dívida e recebe o resultado de verificação.
  RF06.2 : Resultado exibido em menos de 10 segundos.
  RF06.3 : Exibe dados do registro (valor, credor, vencimento, data de emissão)
           junto ao resultado.

RF07 — Interface Visual de Alerta
  RF07.1 : Tela de verificação exibe distintivo visual colorido (UI-001).
  RF07.2 : Clicar no distintivo verde abre modal com comparação lado a lado:
           dados do PostgreSQL × dados da blockchain + link Etherscan.
  RF07.3 : Distintivo vermelho exibe na tela pública apenas que houve
           adulteração — detalhes forenses reservados a auditores autenticados.

RF08 — Schema de Log de Auditoria
  RF08.1 : Toda operação INSERT ou UPDATE nas tabelas financeiras gera AuditLog.
  RF08.2 : AuditLog contém: tituloDividaId, userId, action, clientIp,
           timestamp, diff_snapshot (JSON com antes/depois dos campos alterados).
  RF08.3 : AuditLog acessível apenas por roles AUDITOR ou ADMIN.

RF09 — Rotina de Integridade Automática
  RF09.1 : Varredura automática conforme RN-INV-001.
  RF09.2 : Resultado da última varredura visível no dashboard (data/hora,
           quantidade verificada, quantidade de anomalias).

RF10 — Dashboard Gerencial
  RF10.1 : Acessível apenas para usuários autenticados (qualquer role).
  RF10.2 : Implementa métricas de RN-DASH-001.
  RF10.3 : Utiliza Recharts para gráficos (Bar Chart e Pie Chart).

RF11 — Transferência de Custódia
  RF11.1 : Operador pode transferir custódia de um Título de Dívida para
           novo credor.
  RF11.2 : Operação segue RN-MOV-001 e RN-MOV-002.

RF12 — Cadastro de Parcelamento
  RF12.1 : Ao emitir um Título de Dívida, operador pode definir plano de
           parcelas (número de parcelas, valor de cada uma, data de vencimento
           de cada uma).
  RF12.2 : Sistema valida que soma das parcelas é igual ao valor total do
           Título de Dívida (RN-PAG-001).
  RF12.3 : Campo motivo obrigatório para cada parcela.
  RF12.4 : Campo autorizado_por obrigatório para cada parcela.
  RF12.5 : Sistema suporta parcelas de valores desiguais (ex: entrada maior
           seguida de parcelas menores).

RF13 — Registro de Pagamento de Parcela
  RF13.1 : Operador autenticado pode marcar uma parcela individual como PAGO.
  RF13.2 : Sistema registra automaticamente data_hora_pagamento e
           usuario_pagamento_id no momento da ação (não aceitar data/hora
           informada manualmente pelo usuário).
  RF13.3 : Após pagamento, parcela exibe: valor pago, data/hora do pagamento,
           nome do usuário que registrou, quem autorizou.

RF14 — Visualização Interna das Parcelas
  RF14.1 : Tela interna de detalhe do Título de Dívida exibe tabela de
           parcelas com colunas: número, valor, vencimento, motivo, status,
           data de pagamento (se pago), quem autorizou, quem registrou.
  RF14.2 : Parcelas vencidas destacadas visualmente em cor âmbar (UI-001).
  RF14.3 : Tela pública de verificação (sem autenticação) exibe APENAS:
           número de parcelas, valor total e status geral — sem motivo,
           sem nomes, sem datas de pagamento.

RF15 — Exportação de Extrato de Parcelas
  RF15.1 : Usuários com role AUDITOR ou ADMIN podem exportar extrato completo
           de parcelas de um Título de Dívida em formato .xlsx ou .csv.
  RF15.2 : Planilha exportada contém colunas:
             Nº Parcela | Valor (R$) | Vencimento | Motivo | Autorizado Por
             | Status | Data/Hora do Pagamento | Registrado Por (usuário)
  RF15.3 : Exportação registrada no AuditLog com action = 'EXPORT_GENERATED'.


-------------------------------------------------------------------------------
4. REQUISITOS NÃO FUNCIONAIS (RNF)
-------------------------------------------------------------------------------

4.1 Performance
----------------
RNF-PERF-001 — Tempo de Resposta da API (endpoints off-chain)
  - Endpoints de leitura do PostgreSQL       : P95 <= 200ms.
  - Endpoints de escrita sem blockchain      : P95 <= 500ms.

RNF-PERF-002 — Tempo de Resposta com Blockchain
  - Emissão de Título de Dívida (inclui confirmação on-chain): timeout
    máximo de 60s, com feedback visual ao usuário durante a espera.
  - Verificação de integridade (leitura via view)            : P95 <= 3s.

RNF-PERF-003 — Concorrência
  - O sistema deve suportar pelo menos 50 requisições simultâneas sem
    degradação perceptível (adequado para MVP/ambiente corporativo pequeno).

4.2 Segurança
--------------
RNF-SEC-001 — Gerenciamento de Secrets
  - Chaves privadas Ethereum, URLs de RPC e secrets JWT carregados
    exclusivamente via variáveis de ambiente (.env).
  - .env no .gitignore. Repositório contém apenas .env.example com
    valores fictícios.

RNF-SEC-002 — Prevenção de SQL Injection
  - Todo acesso ao banco via Prisma ORM com queries parametrizadas.
    Queries SQL raw são proibidas.

RNF-SEC-003 — Sanitização de Inputs
  - Todos os campos de texto sanitizados (trim, remoção de caracteres de
    controle) antes do processamento.

RNF-SEC-004 — HTTPS
  - Em produção: comunicação obrigatoriamente via HTTPS.
  - No MVP (localhost): ausência de TLS aceitável mas deve ser documentada.

RNF-SEC-005 — CORS
  - Backend configura CORS permitindo apenas origens do frontend
    especificadas em .env.

RNF-SEC-006 — Privacidade (LGPD)
  - Nenhum dado pessoal identificável (PII) ou informação financeira
    sigilosa publicada na blockchain. Apenas o hash criptográfico vai on-chain.

RNF-SEC-007 — Rate Limiting
  - Endpoints públicos    : máximo 100 requisições por IP por minuto.
  - Endpoints autenticados: máximo 200 requisições por token por minuto.

4.3 Confiabilidade
-------------------
RNF-REL-001 — Atomicidade Blockchain-SQL
  - Falha na confirmação blockchain impede qualquer persistência no
    PostgreSQL (zero risco de estado inconsistente).

RNF-REL-002 — Idempotência da Verificação
  - A verificação de integridade (RF06) é idempotente: múltiplas chamadas
    com o mesmo ID retornam sempre o mesmo resultado enquanto os dados
    não mudam.

RNF-REL-003 — Graceful Degradation
  - Se a rede Sepolia estiver inacessível, leituras do PostgreSQL continuam
    funcionando. O status de integridade é exibido como PENDING_VERIFICATION
    (amarelo) em vez de erro.

4.4 Manutenibilidade
---------------------
RNF-MAINT-001 — Padrão de Código
  - Todo o TypeScript deve passar em tsc --noEmit com strict: true.
  - ESLint com configuração Airbnb TypeScript aplicado.

RNF-MAINT-002 — Cobertura de Testes
  - Módulos críticos (hashEngine, verificationService, Smart Contract):
    cobertura mínima de 80% de statements.

RNF-MAINT-003 — Documentação da API
  - API autodocumentada via Swagger/OpenAPI 3.0, acessível em /api/docs.

RNF-MAINT-004 — Variáveis de Ambiente Documentadas
  - Todas as variáveis de ambiente documentadas no README.md com tipo,
    descrição e exemplo.

4.5 Usabilidade
----------------
RNF-UX-001 — Design Responsivo
  - Interface utilizável em telas a partir de 375px (mobile) até
    desktops widescreen.

RNF-UX-002 — Acessibilidade (WCAG 2.1 AA)
  - Contraste mínimo de 4.5:1 para texto normal, 3:1 para texto grande.
  - Todos os elementos interativos acessíveis via teclado.
  - Elementos de status (selos verde/vermelho) com alternativa textual
    (não depender apenas de cor).

RNF-UX-003 — Feedback de Loading
  - Operações com blockchain exibem estado de carregamento explícito com
    texto descritivo: "Consultando ledger descentralizado...".


-------------------------------------------------------------------------------
5. SCHEMA DO BANCO DE DADOS (PRISMA ORM)
-------------------------------------------------------------------------------

// =====================================================================
// schema.prisma
// =====================================================================

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ---------------------------------------------------------------------
// USUÁRIOS
// ---------------------------------------------------------------------

model User {
  id                   String        @id @default(uuid())
  email                String        @unique
  passwordHash         String
  name                 String
  role                 UserRole      @default(OPERATOR)
  isActive             Boolean       @default(true)
  createdAt            DateTime      @default(now())
  updatedAt            DateTime      @updatedAt
  auditLogs            AuditLog[]
  installmentPayments  Installment[] @relation("PaymentUser")

  @@map("users")
}

enum UserRole {
  OPERATOR
  AUDITOR
  ADMIN
}

// ---------------------------------------------------------------------
// TÍTULOS DE DÍVIDA (anteriormente: Debêntures)
// ---------------------------------------------------------------------

model TituloDivida {
  id                String          @id @default(uuid())
  cnpj_emissor      String
  credor            String
  valor_centavos    BigInt
  // BigInt para suportar valores altos sem perda de precisão.
  // Ao serializar para JSON, converter para string.
  data_vencimento   DateTime
  hash_integridade  String          @unique
  tx_hash           String?
  status            TituloStatus    @default(ACTIVE)
  integrity_status  IntegrityStatus @default(PENDING)
  supersedes_id     String?         // FK para TituloDivida (cadeia de custódia)
  superseded_by     TituloDivida?   @relation("CustodyChain", fields: [supersedes_id], references: [id])
  supersession      TituloDivida[]  @relation("CustodyChain")
  createdAt         DateTime        @default(now())
  updatedAt         DateTime        @updatedAt
  auditLogs         AuditLog[]
  installments      Installment[]

  @@map("titulos_divida")
}

enum TituloStatus {
  ACTIVE
  SUPERSEDED
  ERROR
}

enum IntegrityStatus {
  VERIFIED     // Hash bate com a blockchain — registro íntegro
  COMPROMISED  // Hash diverge — fraude detectada
  PENDING      // Ainda não verificado ou blockchain inacessível
}

// ---------------------------------------------------------------------
// PARCELAS E PAGAMENTOS
// ---------------------------------------------------------------------

model Installment {
  id                      String            @id @default(uuid())
  tituloDividaId          String
  tituloDivida            TituloDivida      @relation(fields: [tituloDividaId], references: [id])

  numero_parcela          Int               // 1, 2, 3, 4...
  valor_centavos          BigInt
  data_vencimento_parcela DateTime          // DateTime UTC

  motivo                  String
  // Finalidade da dívida. Ex: "Compra de produtos para estoque"
  // Mínimo 10 caracteres, máximo 500. NUNCA exposto publicamente.

  autorizado_por          String
  // Nome/cargo de quem aprovou. Ex: "João Silva — Diretor Financeiro"
  // Campo de texto livre. NUNCA exposto publicamente.

  status_parcela          InstallmentStatus @default(PENDENTE)

  // Campos preenchidos AUTOMATICAMENTE pelo servidor no momento do pagamento:
  data_hora_pagamento     DateTime?         // null até ser marcado como PAGO
  usuario_pagamento_id    String?           // null até ser marcado como PAGO
  usuario_pagamento       User?             @relation("PaymentUser", fields: [usuario_pagamento_id], references: [id])

  createdAt               DateTime          @default(now())
  updatedAt               DateTime          @updatedAt

  @@unique([tituloDividaId, numero_parcela])
  // Impede número de parcela duplicado dentro do mesmo Título de Dívida.
  @@map("installments")
}

enum InstallmentStatus {
  PENDENTE
  PAGO
  VENCIDO
  CANCELADO
}

// ---------------------------------------------------------------------
// LOG DE AUDITORIA
// ---------------------------------------------------------------------

model AuditLog {
  id              String      @id @default(uuid())
  tituloDividaId  String
  tituloDivida    TituloDivida @relation(fields: [tituloDividaId], references: [id])
  userId          String
  user            User        @relation(fields: [userId], references: [id])
  action          AuditAction
  clientIp        String
  diff_snapshot   Json?       // { before: {...}, after: {...} }
  timestamp       DateTime    @default(now())

  @@map("audit_logs")
}

enum AuditAction {
  INSERT
  UPDATE
  STATUS_CHANGE
  INTEGRITY_BREACH_DETECTED
  CUSTODY_TRANSFER
  VERIFICATION_REQUESTED
  PAYMENT_REGISTERED
  INSTALLMENT_OVERDUE
  INSTALLMENT_CANCELLED
  EXPORT_GENERATED
}

// NOTA: valor_centavos usa BigInt para evitar overflow em valores acima
// de 2^31 em JavaScript. Sempre converter para string ao serializar JSON.


-------------------------------------------------------------------------------
6. SMART CONTRACT (SOLIDITY)
-------------------------------------------------------------------------------

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title ProofChainRegistry
 * @notice Armazena provas criptográficas (hashes SHA-256) de Títulos de Dívida.
 *         NUNCA armazena dados financeiros ou PII — apenas hashes.
 * @dev Deployado na rede Sepolia Testnet.
 */
contract ProofChainRegistry {

    // Mapeia o ID do Título de Dívida (string) ao hash de integridade (bytes32)
    mapping(string => bytes32) private _hashes;

    // Mapeia o ID ao timestamp de registro
    mapping(string => uint256) private _timestamps;

    // Controle de acesso: apenas o owner (backend wallet) pode registrar
    address public owner;

    // Eventos
    event HashStored(
        string indexed id,
        bytes32 hash,
        uint256 timestamp
    );

    event OwnershipTransferred(
        address indexed previousOwner,
        address indexed newOwner
    );

    // Modificadores
    modifier onlyOwner() {
        require(msg.sender == owner, "ProofChain: caller is not the owner");
        _;
    }

    modifier hashNotExists(string memory id) {
        require(
            _hashes[id] == bytes32(0),
            "ProofChain: hash already registered for this ID"
        );
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    /**
     * @notice Registra o hash de integridade de um Título de Dívida.
     * @param id   UUID do Título de Dívida (string).
     * @param hash Hash SHA-256 calculado pelo backend (bytes32).
     * @dev Somente o owner pode chamar. Cada ID só pode ser registrado uma vez.
     */
    function storeHash(string memory id, bytes32 hash)
        external
        onlyOwner
        hashNotExists(id)
    {
        require(bytes(id).length > 0, "ProofChain: id cannot be empty");
        require(hash != bytes32(0),   "ProofChain: hash cannot be zero");

        _hashes[id]     = hash;
        _timestamps[id] = block.timestamp;

        emit HashStored(id, hash, block.timestamp);
    }

    /**
     * @notice Recupera o hash registrado para um ID.
     * @param id UUID do Título de Dívida.
     * @return Hash bytes32 armazenado (zero se não existir).
     * @dev Função view — custo ZERO de gás para chamadas externas.
     */
    function getHash(string memory id) external view returns (bytes32) {
        return _hashes[id];
    }

    /**
     * @notice Recupera o timestamp de registro de um hash.
     * @param id UUID do Título de Dívida.
     * @return Timestamp Unix do bloco em que o hash foi registrado.
     */
    function getTimestamp(string memory id) external view returns (uint256) {
        return _timestamps[id];
    }

    /**
     * @notice Verifica se um ID já possui hash registrado.
     * @param id UUID do Título de Dívida.
     * @return true se o hash existe.
     */
    function hashExists(string memory id) external view returns (bool) {
        return _hashes[id] != bytes32(0);
    }

    /**
     * @notice Transfere a propriedade do contrato para um novo endereço.
     */
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "ProofChain: new owner is zero address");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }
}


-------------------------------------------------------------------------------
7. ARQUITETURA DA API REST
-------------------------------------------------------------------------------

7.1 Endpoints Públicos (sem autenticação)
------------------------------------------
Método  | Rota                            | Descrição                          | RF
--------|---------------------------------|------------------------------------|-----
GET     | /api/health                     | Health check do sistema            | —
GET     | /api/titulos/:id/verify         | Verificação pública de autenticidade| RF06
POST    | /api/auth/login                 | Autenticação e geração de JWT      | RF01

7.2 Endpoints Autenticados — Role OPERATOR+
--------------------------------------------
Método  | Rota                            | Descrição                          | RF
--------|---------------------------------|------------------------------------|-----
POST    | /api/titulos                    | Emitir novo Título de Dívida       | RF02
GET     | /api/titulos                    | Listar Títulos de Dívida (paginado)| RF10
GET     | /api/titulos/:id                | Detalhe de um Título de Dívida     | RF07
POST    | /api/titulos/:id/transfer       | Transferir custódia                | RF11
GET     | /api/dashboard/metrics          | Métricas para o dashboard          | RF10
POST    | /api/titulos/:id/installments   | Cadastrar plano de parcelas        | RF12
GET     | /api/titulos/:id/installments   | Listar parcelas (com dados internos)| RF14
PATCH   | /api/installments/:id/pay       | Registrar pagamento de parcela     | RF13

7.3 Endpoints Autenticados — Role AUDITOR+
-------------------------------------------
Método  | Rota                                        | Descrição                       | RF
--------|---------------------------------------------|---------------------------------|-----
GET     | /api/audit-logs                             | Listar logs de auditoria        | RF08
GET     | /api/audit-logs/titulo/:id                  | Trilha forense de um Título     | RF08
POST    | /api/titulos/:id/verify-integrity            | Verificação manual de integridade| RF09
GET     | /api/titulos/:id/installments/export        | Exportar extrato (.xlsx/.csv)   | RF15

7.4 Endpoints Autenticados — Role ADMIN
----------------------------------------
Método  | Rota                    | Descrição                    | RF
--------|-------------------------|------------------------------|-----
GET     | /api/users              | Listar usuários              | RF01
POST    | /api/users              | Criar usuário                | RF01
PATCH   | /api/users/:id          | Atualizar role/status        | RF01
POST    | /api/integrity/scan     | Disparar varredura manual    | RF09


-------------------------------------------------------------------------------
8. SUITE DE TESTES AUTOMATIZADOS
-------------------------------------------------------------------------------

8.1 Testes Unitários — Jest (Backend)
---------------------------------------

TST-001 — Determinismo do Hash
  Garante que a mesma entrada sempre produz o mesmo hash SHA-256.

  describe('HashEngine', () => {
    it('deve gerar hash idêntico para inputs idênticos', () => {
      const input = {
        id: 'uuid-123',
        cnpj_emissor: '12345678000195',
        valor_centavos: 5000000,
        data_vencimento: new Date('2025-12-31T00:00:00.000Z')
      };
      expect(generateHash(input)).toBe(generateHash(input));
    });

    it('deve gerar hashes diferentes para inputs diferentes', () => {
      const input1 = { ...base, valor_centavos: 5000000 };
      const input2 = { ...base, valor_centavos: 500000 };
      expect(generateHash(input1)).not.toBe(generateHash(input2));
    });

    it('deve retornar string hexadecimal de 64 caracteres', () => {
      expect(generateHash(base)).toMatch(/^[a-f0-9]{64}$/);
    });
  });

TST-002 — Detecção de Adulteração
  Simula adulteração de dados e verifica se o motor detecta a divergência.

  describe('VerificationService', () => {
    it('deve retornar VERIFIED quando hashes coincidem', async () => {
      const mockDbData = { ...tituloBase, valor_centavos: 5000000n };
      const mockBlockchainHash = generateHash({ ...tituloBase, valor_centavos: 5000000 });
      const result = await verifyIntegrity(mockDbData, mockBlockchainHash);
      expect(result.status).toBe('VERIFIED');
    });

    it('deve retornar COMPROMISED quando hashes divergem', async () => {
      const mockDbData = { ...tituloBase, valor_centavos: 500000n }; // ADULTERADO
      const originalHash = generateHash({ ...tituloBase, valor_centavos: 5000000 });
      const result = await verifyIntegrity(mockDbData, originalHash);
      expect(result.status).toBe('COMPROMISED');
    });
  });

8.2 Testes do Smart Contract — Hardhat + Chai
----------------------------------------------

TST-003 — Contrato Inteligente
  Valida armazenamento, eventos e controle de acesso do contrato.

  describe('ProofChainRegistry', () => {
    it('deve armazenar e recuperar hash corretamente', async () => {
      await contract.storeHash('uuid-123', ethers.utils.formatBytes32String('abc'));
      const stored = await contract.getHash('uuid-123');
      expect(stored).to.equal(ethers.utils.formatBytes32String('abc'));
    });

    it('deve emitir evento HashStored ao registrar', async () => {
      await expect(contract.storeHash('uuid-456', hash))
        .to.emit(contract, 'HashStored')
        .withArgs('uuid-456', hash, anyValue);
    });

    it('deve rejeitar registro duplicado para o mesmo ID', async () => {
      await contract.storeHash('uuid-789', hash);
      await expect(contract.storeHash('uuid-789', hash))
        .to.be.revertedWith('ProofChain: hash already registered for this ID');
    });

    it('deve permitir leitura gratuita via getHash (view function)', async () => {
      const hashValue = await contract.getHash('uuid-123');
      expect(hashValue).to.be.a('string');
    });

    it('deve rejeitar storeHash de endereço não-owner', async () => {
      const [, attacker] = await ethers.getSigners();
      await expect(contract.connect(attacker).storeHash('uuid-999', hash))
        .to.be.revertedWith('ProofChain: caller is not the owner');
    });
  });

8.3 Testes de Integração
--------------------------

TST-004 — Enforcement de Log
  Garante que toda operação de escrita gera AuditLog e que userId ausente
  aborta a transação.

  describe('AuditLog Enforcement', () => {
    it('deve gerar AuditLog em qualquer INSERT', async () => {
      const before = await prisma.auditLog.count();
      await tituloService.create(validTitulo, userId, clientIp);
      const after = await prisma.auditLog.count();
      expect(after).toBe(before + 1);
    });

    it('deve abortar transação quando userId é ausente', async () => {
      await expect(tituloService.create(validTitulo, null, clientIp))
        .rejects.toThrow('userId is required for audit logging');
    });
  });

TST-005 — Consistência de Parcelas
  Garante que soma de parcelas bate com valor total do Título de Dívida.

  describe('Installment Consistency', () => {
    it('deve rejeitar plano de parcelas com soma divergente', async () => {
      const titulo = { valor_centavos: 4000000n }; // R$ 40.000,00
      const parcelas = [
        { numero_parcela: 1, valor_centavos: 1000000n }, // R$ 10.000
        { numero_parcela: 2, valor_centavos: 1000000n }, // R$ 10.000
        { numero_parcela: 3, valor_centavos: 1000000n }, // R$ 10.000
        // Parcela 4 faltando — soma = R$ 30.000 != R$ 40.000
      ];
      await expect(installmentService.create(titulo.id, parcelas, userId, clientIp))
        .rejects.toThrow('HTTP 422');
    });

    it('deve aceitar parcelas de valores diferentes cuja soma bate', async () => {
      const titulo = { valor_centavos: 4000000n }; // R$ 40.000,00
      const parcelas = [
        { numero_parcela: 1, valor_centavos: 2000000n }, // entrada R$ 20.000
        { numero_parcela: 2, valor_centavos: 1000000n },
        { numero_parcela: 3, valor_centavos: 500000n  },
        { numero_parcela: 4, valor_centavos: 500000n  },
      ]; // soma = R$ 40.000 — OK
      await expect(installmentService.create(titulo.id, parcelas, userId, clientIp))
        .resolves.not.toThrow();
    });
  });


-------------------------------------------------------------------------------
9. PRIORIDADES DO MVP (MoSCoW)
-------------------------------------------------------------------------------

MUST HAVE — Entrega Mínima Funcional
  [ ] Smart Contract na Sepolia (storeHash + getHash + evento)
  [ ] Motor de Hashing SHA-256 (hashEngine.ts) com testes unitários
  [ ] Endpoint de emissão de Título de Dívida com ancoragem blockchain
  [ ] Tela pública de verificação com selos visuais (verde/vermelho/amarelo)
  [ ] Testes unitários TST-001 e TST-002
  [ ] Testes de smart contract TST-003
  [ ] Schema do banco de dados com migrations via Prisma
  [ ] Autenticação JWT básica

SHOULD HAVE — Alta Prioridade
  [ ] Cadastro de parcelamento com validação de consistência (RF12)
  [ ] Registro de pagamento de parcela com timestamp automático (RF13)
  [ ] Trilha forense para auditores autenticados (AuditLog completo)
  [ ] Modal de comparação on-chain vs off-chain com link Etherscan
  [ ] Rotina de verificação automática (cron job)
  [ ] Testes de integração TST-004 e TST-005
  [ ] Dashboard com métricas básicas

COULD HAVE — Se houver tempo
  [ ] Gráficos Recharts no dashboard (Bar + Pie)
  [ ] Exportação de extrato de parcelas em .xlsx/.csv (RF15)
  [ ] Transferência de custódia (cadeia de supersession)
  [ ] Documentação Swagger/OpenAPI
  [ ] Rate limiting avançado

WON'T HAVE — Fora do escopo do MVP
  [ ] Deploy em cloud (sistema roda em localhost; blockchain na testnet pública)
  [ ] Integração com sistemas externos de compliance (CVM, B3)
  [ ] Notificações em tempo real (WebSocket/SSE)
  [ ] Multi-tenancy (múltiplas empresas no mesmo sistema)
  [ ] Mobile app nativo


-------------------------------------------------------------------------------
10. ESTRUTURA DE PASTAS DO PROJETO
-------------------------------------------------------------------------------

proofchain/
├── backend/
│   ├── src/
│   │   ├── controllers/
│   │   │   ├── tituloController.ts
│   │   │   ├── installmentController.ts
│   │   │   └── authController.ts
│   │   ├── services/
│   │   │   ├── hashEngine.ts           # SHA-256 determinístico (core)
│   │   │   ├── blockchainService.ts    # Comunicação com Smart Contract
│   │   │   ├── tituloService.ts        # Lógica de negócio dos Títulos de Dívida
│   │   │   ├── installmentService.ts   # Lógica de parcelas e pagamentos
│   │   │   └── verificationService.ts  # Motor de auditoria de integridade
│   │   ├── middleware/
│   │   │   ├── auth.ts                 # Verificação JWT + roles
│   │   │   ├── auditLog.ts             # Interceptor de escrita para AuditLog
│   │   │   └── rateLimiter.ts
│   │   ├── prisma/
│   │   │   ├── schema.prisma
│   │   │   └── migrations/
│   │   ├── jobs/
│   │   │   └── integrityScanner.ts     # Cron: varredura de integridade + vencimentos
│   │   └── app.ts
│   ├── tests/
│   │   ├── unit/
│   │   │   ├── hashEngine.test.ts
│   │   │   └── verificationService.test.ts
│   │   └── integration/
│   │       ├── auditLog.test.ts
│   │       └── installment.test.ts
│   ├── .env.example
│   └── tsconfig.json
│
├── smart-contract/
│   ├── contracts/
│   │   └── ProofChainRegistry.sol
│   ├── test/
│   │   └── ProofChainRegistry.test.ts
│   ├── scripts/
│   │   └── deploy.ts
│   └── hardhat.config.ts
│
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── PublicVerify.tsx        # Tela pública de verificação
│   │   │   ├── Dashboard.tsx
│   │   │   ├── Issuance.tsx            # Formulário de emissão + parcelamento
│   │   │   ├── InstallmentDetail.tsx   # Detalhe interno de parcelas
│   │   │   └── AuditTrail.tsx          # Trilha forense (autenticado)
│   │   ├── components/
│   │   │   ├── IntegrityBadge.tsx      # Selo verde/vermelho/amarelo
│   │   │   ├── VerificationModal.tsx   # Modal on-chain vs off-chain
│   │   │   ├── InstallmentTable.tsx    # Tabela de parcelas com status visual
│   │   │   └── CurrencyInput.tsx       # Input com máscara monetária (R$)
│   │   └── services/
│   │       └── api.ts
│   └── tsconfig.json
│
├── README.md
└── docker-compose.yml                  # Apenas para PostgreSQL local


-------------------------------------------------------------------------------
11. VARIÁVEIS DE AMBIENTE (.env.example)
-------------------------------------------------------------------------------

# === BACKEND ===
NODE_ENV=development
PORT=3001
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=8h

# === DATABASE ===
DATABASE_URL=postgresql://proofchain:password@localhost:5432/proofchain_db

# === BLOCKCHAIN (Ethereum Sepolia) ===
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_INFURA_PROJECT_ID
BACKEND_WALLET_PRIVATE_KEY=0xYOUR_PRIVATE_KEY_NEVER_COMMIT_THIS
CONTRACT_ADDRESS=0xDEPLOYED_CONTRACT_ADDRESS_ON_SEPOLIA

# === FRONTEND ===
REACT_APP_API_URL=http://localhost:3001
REACT_APP_ETHERSCAN_BASE_URL=https://sepolia.etherscan.io/tx/

# === CORS ===
CORS_ALLOWED_ORIGINS=http://localhost:3000


-------------------------------------------------------------------------------
12. GLOSSÁRIO
-------------------------------------------------------------------------------

Termo                | Definição
---------------------|----------------------------------------------------------
Título de Dívida     | Registro formal de um empréstimo feito por um credor a
                     | uma empresa. A empresa recebe o dinheiro e se compromete
                     | a devolvê-lo com juros em uma data combinada.
                     | (Termo técnico de mercado: Debênture)
Hash SHA-256         | Função criptográfica que transforma qualquer conjunto de
                     | dados em uma string de 64 caracteres. Qualquer mínima
                     | alteração nos dados produz um hash completamente diferente.
Hash de Integridade  | O hash SHA-256 calculado a partir dos campos do Título de
                     | Dívida no momento da emissão. Funciona como uma
                     | "impressão digital" dos dados — imutável após o registro.
On-chain             | Dados armazenados diretamente na blockchain Ethereum.
                     | São imutáveis e públicos.
Off-chain            | Dados armazenados em banco de dados tradicional
                     | (PostgreSQL). São privados e de alto desempenho.
tx_hash              | Identificador único de uma transação na blockchain.
                     | Funciona como recibo da operação on-chain.
View function        | Função Solidity que apenas lê dados da blockchain sem
                     | modificar estado — custo ZERO de gás.
Gás (Gas)            | Taxa paga em Ethereum para executar operações na
                     | blockchain. Funções view têm custo zero.
Sepolia              | Rede de testes pública do Ethereum usada para
                     | desenvolvimento. ETH da Sepolia não tem valor real.
CNPJ                 | Cadastro Nacional de Pessoa Jurídica — número de
                     | identificação de empresas no Brasil (14 dígitos).
LGPD                 | Lei Geral de Proteção de Dados (Lei 13.709/2018) —
                     | regulação brasileira de privacidade de dados pessoais.
CVM                  | Comissão de Valores Mobiliários — autarquia reguladora
                     | do mercado de capitais brasileiro.
ACID                 | Atomicidade, Consistência, Isolamento, Durabilidade —
                     | propriedades que garantem confiabilidade em transações
                     | de banco de dados.
JWT                  | JSON Web Token — padrão para autenticação stateless
                     | via tokens assinados digitalmente.
PII                  | Personally Identifiable Information — dados que permitem
                     | identificar uma pessoa física.
Parcela              | Divisão do valor total de um Título de Dívida em
                     | pagamentos menores, cada um com data e valor definidos.
Motivo               | Campo interno que descreve a finalidade da dívida.
                     | Ex: "Melhoria de computadores", "Compra de estoque".
                     | Nunca exposto publicamente — apenas para auditores.
Autorizado por       | Nome ou cargo de quem aprovou o pagamento dentro da
                     | empresa. Campo de texto livre. Nunca exposto publicamente.


===============================================================================
ProofChain — Especificação Técnica v2.0
Última atualização: 2025
===============================================================================
