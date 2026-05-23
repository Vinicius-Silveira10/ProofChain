import request from 'supertest';
import app from '../../src/app';
import { prisma } from '../../src/config/prisma';
import jwt from 'jsonwebtoken';
import { env } from '../../src/config/env';

jest.mock('../../src/services/blockchainService', () => ({
  anchorHashOnChain: jest.fn().mockResolvedValue('0xMOCKED_HASH_FOR_TESTS'),
  getHashFromChain: jest.fn().mockResolvedValue('0xMOCKED_HASH_FOR_TESTS'),
}));

// Mock de segurança: Geração de Token Real para os Testes E2E
const generateTestToken = (userId: string, role: string) => {
  return jwt.sign({ id: userId, role }, env.jwtSecret, { expiresIn: '1h' });
};

describe('Testes de Integração - AuditLog & Resiliência Atômica (TST-004)', () => {
  let auditorToken: string;
  let adminToken: string;
  let testTituloId: string;

  beforeAll(async () => {
    // Setup Limpo
    await prisma.installment.deleteMany();
    await prisma.auditLog.deleteMany();
    await prisma.tituloDivida.deleteMany();

    auditorToken = generateTestToken('user_auditor_123', 'AUDITOR');
    adminToken = generateTestToken('user_admin_123', 'ADMIN');
  });

  afterEach(async () => {
    // Teardown
    await prisma.installment.deleteMany();
    await prisma.auditLog.deleteMany();
    await prisma.tituloDivida.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('[T1] Deve gerar AuditLog em qualquer INSERT na tabela titulos_divida', async () => {
    const res = await request(app)
      .post('/api/titulos')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        cnpj_emissor: '00.000.000/0001-91',
        nome_devedor: 'Empresa Teste',
        cnpj_devedor: '11.111.111/0001-99',
        valor_centavos: 500000,
        data_vencimento: new Date(Date.now() + 86400000).toISOString()
      });

    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
    
    testTituloId = res.body.id;

    // Verificar se o AuditLog foi criado invisivelmente via Prisma Transaction
    const audit = await prisma.auditLog.findFirst({
      where: { tituloDividaId: testTituloId }
    });

    expect(audit).not.toBeNull();
    expect(audit?.action).toBe('TITULO_CREATED');
    expect(audit?.userId).toBe('user_admin_123'); // Pegou do Token!
  });

  it('[T2] Deve abortar transação e lançar erro quando userId é ausente', async () => {
    // Um token sem ID não deveria acontecer no fluxo real, mas se ocorrer, 
    // a API não pode gravar o título sem o Rastro.
    // Aqui testamos simulando uma chamada de Rota que exige Auth, mas tentamos burlar passando um Auth inválido.
    const res = await request(app)
      .post('/api/titulos')
      .set('Authorization', `Bearer INVALID_TOKEN`)
      .send({
        cnpj_emissor: '00.000.000/0001-91',
        nome_devedor: 'Hacker',
        cnpj_devedor: '11.111.111/0001-99',
        valor_centavos: 100,
        data_vencimento: new Date().toISOString()
      });

    expect(res.status).toBe(401);
    
    // O banco deve permanecer vazio
    const count = await prisma.tituloDivida.count();
    expect(count).toBe(0);
  });

  it('[T3] Deve gerar AuditLog correto para PAYMENT_REGISTERED e [T4] snapshot de UPDATE', async () => {
    // 1. Criar título inicial
    const titulo = await request(app)
      .post('/api/titulos')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        cnpj_emissor: '00.000.000/0001-91',
        nome_devedor: 'Empresa Teste',
        cnpj_devedor: '11.111.111/0001-99',
        valor_centavos: 1000,
        data_vencimento: new Date(Date.now() + 86400000).toISOString()
      });
      
    testTituloId = titulo.body.id;

    // 2. Criar uma Parcela
    await request(app)
      .post(`/api/titulos/${testTituloId}/installments`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send([{
        numero_parcela: 1,
        valor_centavos: 1000,
        data_vencimento_parcela: new Date(Date.now() + 86400000).toISOString()
      }]);

    const installments = await prisma.installment.findMany();
    const parcelaId = installments[0].id;

    // 3. Registrar o Pagamento
    const payRes = await request(app)
      .patch(`/api/installments/${parcelaId}/pay`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({}); // Tenta pagar

    expect(payRes.status).toBe(200);

    // 4. Verificar a Auditoria
    const logs = await prisma.auditLog.findMany({
      where: { tituloDividaId: testTituloId },
      orderBy: { timestamp: 'desc' }
    });

    const paymentLog = logs.find(l => l.action === 'PAYMENT_REGISTERED');
    expect(paymentLog).not.toBeNull();
    
    // T4 - Snapshot de UPDATE correto
    const snap = paymentLog?.diff_snapshot as any;
    expect(snap.status_parcela).toBe('PAGO');
    expect(snap.valor_pago).toBe('1000');
  });

});
