import swaggerJSDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

// ─────────────────────────────────────────────────────────────────────────────
// Definição OpenAPI 3.0 — ProofChain API
// Os endpoints individuais são documentados via anotações @swagger nas rotas.
// ─────────────────────────────────────────────────────────────────────────────
const swaggerDefinition: swaggerJSDoc.SwaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'ProofChain API',
    version: '1.0.0',
    description: `
## Sistema Híbrido de Integridade Corporativa

O ProofChain combina a privacidade de um banco de dados relacional com a **imutabilidade pública da blockchain Ethereum** para criar um carimbo matemático irrefutável sobre cada título de dívida corporativa.

### Autenticação
A maioria dos endpoints exige um **Bearer Token JWT**. Para obtê-lo:
1. Faça \`POST /api/auth/login\` com suas credenciais.
2. Copie o \`token\` da resposta.
3. Clique em **Authorize** (🔒) e cole: \`Bearer <seu_token>\`

### Roles e Permissões
| Role | Permissões |
|------|-----------|
| \`ADMIN\` | Acesso total — criação, cancelamento, configurações |
| \`OPERATOR\` | Emissão de títulos e registro de pagamentos |
| \`AUDITOR\` | Leitura irrestrita de logs forenses, sem mutação |
    `,
    contact: {
      name: 'ProofChain Dev Team',
    },
    license: {
      name: 'MIT',
    },
  },
  servers: [
    {
      url: 'http://localhost:3001',
      description: 'Servidor de Desenvolvimento Local',
    },
  ],

  // ── Esquema de Segurança Global ──────────────────────────────────────────
  components: {
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Token JWT obtido via `POST /api/auth/login`',
      },
    },

    // ── Schemas Reutilizáveis ──────────────────────────────────────────────
    schemas: {
      // --- Auth ---
      LoginRequest: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email:    { type: 'string', format: 'email',    example: 'admin@proofchain.dev' },
          password: { type: 'string', format: 'password', example: 'Admin@2025!' },
        },
      },
      LoginResponse: {
        type: 'object',
        properties: {
          token: { type: 'string', description: 'JWT de acesso', example: 'eyJhbGc...' },
          user: {
            type: 'object',
            properties: {
              id:    { type: 'string', format: 'uuid' },
              name:  { type: 'string', example: 'Administrador' },
              email: { type: 'string', example: 'admin@proofchain.dev' },
              role:  { type: 'string', enum: ['ADMIN', 'OPERATOR', 'AUDITOR'] },
            },
          },
        },
      },

      // --- Título ---
      TituloStatus: {
        type: 'string',
        enum: ['VERIFIED', 'COMPROMISED', 'PENDING'],
        description: 'Status de integridade do título em relação à blockchain',
      },
      Titulo: {
        type: 'object',
        properties: {
          id:                  { type: 'string', format: 'uuid' },
          code:                { type: 'string', example: 'DEB-2025-001' },
          issuer:              { type: 'string', example: 'Empresa ABC S.A.' },
          issuer_cnpj:         { type: 'string', example: '12.345.678/0001-99' },
          face_value:          { type: 'number', example: 1000000.00 },
          emission_date:       { type: 'string', format: 'date', example: '2025-01-15' },
          maturity_date:       { type: 'string', format: 'date', example: '2030-01-15' },
          interest_rate:       { type: 'number', example: 12.5 },
          integrity_status:    { $ref: '#/components/schemas/TituloStatus' },
          blockchain_tx_hash:  { type: 'string', example: '0xabc123...' },
          blockchain_anchor_hash: { type: 'string', example: '0xdef456...' },
          created_at:          { type: 'string', format: 'date-time' },
        },
      },
      CreateTituloRequest: {
        type: 'object',
        required: ['code', 'issuer', 'issuer_cnpj', 'face_value', 'emission_date', 'maturity_date', 'interest_rate'],
        properties: {
          code:          { type: 'string', example: 'DEB-2025-001' },
          issuer:        { type: 'string', example: 'Empresa ABC S.A.' },
          issuer_cnpj:   { type: 'string', example: '12.345.678/0001-99' },
          face_value:    { type: 'number', example: 1000000.00 },
          emission_date: { type: 'string', format: 'date', example: '2025-01-15' },
          maturity_date: { type: 'string', format: 'date', example: '2030-01-15' },
          interest_rate: { type: 'number', example: 12.5 },
          description:   { type: 'string', example: 'Debênture série A — captação para expansão' },
        },
      },
      VerifyResponse: {
        type: 'object',
        properties: {
          id:               { type: 'string', format: 'uuid' },
          code:             { type: 'string' },
          integrity_status: { $ref: '#/components/schemas/TituloStatus' },
          verified_at:      { type: 'string', format: 'date-time' },
          on_chain_hash:    { type: 'string' },
          computed_hash:    { type: 'string' },
          match:            { type: 'boolean' },
        },
      },

      // --- Installment (Parcela) ---
      Installment: {
        type: 'object',
        properties: {
          id:          { type: 'string', format: 'uuid' },
          titulo_id:   { type: 'string', format: 'uuid' },
          due_date:    { type: 'string', format: 'date' },
          amount:      { type: 'number' },
          status:      { type: 'string', enum: ['PENDING', 'PAID', 'OVERDUE'] },
          paid_at:     { type: 'string', format: 'date-time', nullable: true },
          paid_amount: { type: 'number', nullable: true },
        },
      },

      // --- AuditLog ---
      AuditLog: {
        type: 'object',
        properties: {
          id:            { type: 'string', format: 'uuid' },
          action:        { type: 'string', example: 'CREATE_TITULO' },
          entity_type:   { type: 'string', example: 'Titulo' },
          entity_id:     { type: 'string', format: 'uuid' },
          performed_by:  { type: 'string', description: 'UUID do usuário que executou a ação' },
          diff_snapshot: { type: 'object', description: 'Diff antes/depois da operação' },
          created_at:    { type: 'string', format: 'date-time' },
        },
      },

      // --- Errors ---
      ErrorResponse: {
        type: 'object',
        properties: {
          error:   { type: 'string', example: 'Mensagem de erro' },
          details: { type: 'string', example: 'Detalhes técnicos opcionais' },
        },
      },
    },
  },

  // Segurança padrão global — pode ser sobrescrita por endpoint
  security: [{ BearerAuth: [] }],

  // ── Tags para agrupar endpoints na UI ──────────────────────────────────────
  tags: [
    { name: 'Auth',         description: 'Autenticação e sessão do usuário' },
    { name: 'Títulos',      description: 'Emissão, consulta e verificação de integridade dos títulos de dívida' },
    { name: 'Parcelas',     description: 'Gestão do plano de parcelas e registro de pagamentos' },
    { name: 'Audit Logs',   description: 'Trilha forense de auditoria — acesso restrito a AUDITOR e ADMIN' },
    { name: 'Dashboard',    description: 'Métricas e resumo executivo do sistema' },
    { name: 'Health',       description: 'Verificação de saúde da API' },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// Opções do swagger-jsdoc — define de onde ele vai ler as anotações @swagger
// ─────────────────────────────────────────────────────────────────────────────
const options: swaggerJSDoc.Options = {
  swaggerDefinition,
  // Padrão glob: lê anotações de todas as rotas e controllers
  apis: ['./src/routes/*.ts', './src/controllers/*.ts'],
};

export const swaggerSpec = swaggerJSDoc(options);
export { swaggerUi };
