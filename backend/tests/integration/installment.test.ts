import request from 'supertest';
import app from '../../src/app';
import { prisma } from '../../src/config/prisma';
import jwt from 'jsonwebtoken';
import { env } from '../../src/config/env';

jest.mock('../../src/services/blockchainService', () => ({
  anchorHashOnChain: jest.fn().mockResolvedValue('0xMOCKED_HASH_FOR_TESTS'),
  getHashFromChain: jest.fn().mockResolvedValue('0xMOCKED_HASH_FOR_TESTS'),
}));

const generateTestToken = (userId: string, role: string) => {
  return jwt.sign({ id: userId, role }, env.jwtSecret, { expiresIn: '1h' });
};

describe('Testes de Integração - Módulo Financeiro (TST-005)', () => {
  let token: string;
  let testTituloId: string;

  beforeAll(async () => {
    await prisma.installment.deleteMany();
    await prisma.auditLog.deleteMany();
    await prisma.tituloDivida.deleteMany();

    token = generateTestToken('user_financial_777', 'OPERADOR');
  });

  afterEach(async () => {
    await prisma.installment.deleteMany();
    await prisma.auditLog.deleteMany();
    await prisma.tituloDivida.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  async function seedTitulo(valor: number) {
    const res = await request(app)
      .post('/api/titulos')
      .set('Authorization', `Bearer ${token}`)
      .send({
        cnpj_emissor: '00.000.000/0001-91',
        nome_devedor: 'Finance',
        cnpj_devedor: '11.111.111/0001-99',
        valor_centavos: valor,
        data_vencimento: new Date(Date.now() + 86400000).toISOString()
      });
    return res.body.id;
  }

  it('[T5] Deve rejeitar plano de parcelas com soma divergente do valor total', async () => {
    testTituloId = await seedTitulo(4000000); // R$ 40.000,00

    const res = await request(app)
      .post(`/api/titulos/${testTituloId}/installments`)
      .set('Authorization', `Bearer ${token}`)
      .send([
        { numero_parcela: 1, valor_centavos: 1000000, data_vencimento_parcela: new Date().toISOString() },
        { numero_parcela: 2, valor_centavos: 1000000, data_vencimento_parcela: new Date().toISOString() },
        { numero_parcela: 3, valor_centavos: 1000000, data_vencimento_parcela: new Date().toISOString() }
      ]); // Totaliza R$ 30.000,00 (Faltam 10k)

    expect(res.status).toBe(422);
    expect(res.body.error).toContain('FINANCIAL_MISMATCH');
  });

  it('[T6] Deve aceitar parcelas de valores desiguais cuja soma bate perfeitamente', async () => {
    testTituloId = await seedTitulo(4000000); // R$ 40.000,00

    // Entrada de 20k + 3 de 6666.67 (Arredondado em centavos: 2000000, 666667, 666667, 666666)
    const res = await request(app)
      .post(`/api/titulos/${testTituloId}/installments`)
      .set('Authorization', `Bearer ${token}`)
      .send([
        { numero_parcela: 1, valor_centavos: 2000000, data_vencimento_parcela: new Date().toISOString() },
        { numero_parcela: 2, valor_centavos: 666667, data_vencimento_parcela: new Date().toISOString() },
        { numero_parcela: 3, valor_centavos: 666667, data_vencimento_parcela: new Date().toISOString() },
        { numero_parcela: 4, valor_centavos: 666666, data_vencimento_parcela: new Date().toISOString() }
      ]);

    expect(res.status).toBe(201); // Created!
  });

  it('[T7] Deve impedir pagamento de parcela já paga (HTTP 403) e [T8] Ignorar dados forjados', async () => {
    testTituloId = await seedTitulo(1000); // R$ 10,00

    // Cria a parcela
    await request(app)
      .post(`/api/titulos/${testTituloId}/installments`)
      .set('Authorization', `Bearer ${token}`)
      .send([{ numero_parcela: 1, valor_centavos: 1000, data_vencimento_parcela: new Date().toISOString() }]);

    const parcela = await prisma.installment.findFirst();
    const pId = parcela!.id;

    // Hacker tenta enviar um pagamento com data retroativa forjada no Body
    const dataForjada = new Date('2020-01-01').toISOString();
    
    // 1º Pagamento Real
    const payRes1 = await request(app)
      .patch(`/api/installments/${pId}/pay`)
      .set('Authorization', `Bearer ${token}`)
      .send({ data_hora_pagamento: dataForjada, usuario_pagamento_id: 'HACKER_ID' });

    expect(payRes1.status).toBe(200);

    // Verifica T8 e T9 no Banco: Ele NÃO aceitou a data forjada nem o hacker ID, extraiu do backend.
    const parcelaVerificada = await prisma.installment.findUnique({ where: { id: pId }});
    expect(parcelaVerificada?.usuario_pagamento_id).toBe('user_financial_777'); // T9 - JWT Auth Preserved
    expect(parcelaVerificada?.data_hora_pagamento?.toISOString()).not.toBe(dataForjada); // T8 - Timestamp Seguro

    // T7 - 2º Pagamento Tentativa de Duplo Pagamento
    const payRes2 = await request(app)
      .patch(`/api/installments/${pId}/pay`)
      .set('Authorization', `Bearer ${token}`)
      .send({});

    expect(payRes2.status).toBe(403);
    expect(payRes2.body.error).toContain('FORBIDDEN');
  });

});
