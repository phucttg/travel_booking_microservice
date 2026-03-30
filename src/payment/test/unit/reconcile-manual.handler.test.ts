import { ManualReconcilePayment, ManualReconcilePaymentHandler } from '@/payment/features/v1/reconcile-manual/reconcile-manual';
import { ManualReconcileResult, PaymentStatus } from 'building-blocks/contracts/payment.contract';
import { DataSource } from 'typeorm';
import { OutboxMessage } from '@/payment/entities/outbox-message.entity';
import { PaymentAttempt } from '@/payment/entities/payment-attempt.entity';
import { PaymentIntent } from '@/payment/entities/payment-intent.entity';

describe('ManualReconcilePaymentHandler', () => {
  it('credits payment when payment code and amount are valid', async () => {
    const paymentRepository = {
      findPaymentByProviderTxnId: jest.fn().mockResolvedValue(null),
      findPaymentByCode: jest.fn().mockResolvedValue({
        id: 1,
        bookingId: 99,
        userId: 42,
        amount: 2625000,
        currency: 'VND',
        paymentCode: 'TBK-99',
        paymentStatus: PaymentStatus.PENDING,
        refundStatus: 0,
        expiresAt: new Date('2099-03-10T07:15:00.000Z'),
        createdAt: new Date('2099-03-10T07:00:00.000Z'),
        attempts: [],
        refunds: []
      }),
      updatePaymentIntent: jest.fn()
    };
    const paymentQueryBuilder = {
      setLock: jest.fn(),
      where: jest.fn(),
      getOne: jest.fn().mockResolvedValue({
        id: 1,
        bookingId: 99,
        userId: 42,
        amount: 2625000,
        currency: 'VND',
        paymentCode: 'TBK-99',
        paymentStatus: PaymentStatus.PENDING,
        refundStatus: 0,
        expiresAt: new Date('2099-03-10T07:15:00.000Z'),
        createdAt: new Date('2099-03-10T07:00:00.000Z'),
        attempts: [],
        refunds: []
      })
    };
    paymentQueryBuilder.setLock.mockReturnValue(paymentQueryBuilder);
    paymentQueryBuilder.where.mockReturnValue(paymentQueryBuilder);
    const txPaymentRepository = {
      createQueryBuilder: jest.fn().mockReturnValue(paymentQueryBuilder),
      save: jest.fn().mockImplementation(async (payment) => ({
        ...payment,
        attempts: [],
        refunds: []
      }))
    };
    const txPaymentAttemptRepository = {
      save: jest.fn().mockImplementation(async (attempt) => attempt)
    };
    const txOutboxRepository = {
      insert: jest.fn().mockResolvedValue(undefined)
    };
    const dataSource = {
      transaction: jest.fn(async (callback) =>
        callback({
          getRepository: jest.fn((entity) => {
            if (entity === PaymentIntent) {
              return txPaymentRepository;
            }
            if (entity === PaymentAttempt) {
              return txPaymentAttemptRepository;
            }
            if (entity === OutboxMessage) {
              return txOutboxRepository;
            }

            throw new Error('Unexpected repository');
          })
        })
      )
    } as unknown as DataSource;

    const handler = new ManualReconcilePaymentHandler(paymentRepository as any, dataSource);

    const result = await handler.execute(
      new ManualReconcilePayment({
        providerTxnId: 'TXN-001',
        transferContent: 'THANH TOAN TBK-99',
        transferredAmount: 2625000,
        transferredAt: new Date('2099-03-10T07:05:00.000Z'),
        currentUserId: 7,
        isAdmin: true
      })
    );

    expect(result.result).toBe(ManualReconcileResult.CREDITED);
    expect(txPaymentAttemptRepository.save).toHaveBeenCalledTimes(1);
    expect(txPaymentRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        paymentStatus: PaymentStatus.SUCCEEDED,
        providerTxnId: 'TXN-001',
        reconciledBy: 7
      })
    );
    expect(txOutboxRepository.insert).toHaveBeenCalledTimes(1);
  });

  it('rejects when payment code cannot be found in transfer content', async () => {
    const paymentRepository = {
      findPaymentByProviderTxnId: jest.fn().mockResolvedValue(null),
      findPaymentByCode: jest.fn(),
      updatePaymentIntent: jest.fn()
    };
    const handler = new ManualReconcilePaymentHandler(paymentRepository as any, {
      transaction: jest.fn()
    } as unknown as DataSource);

    const result = await handler.execute(
      new ManualReconcilePayment({
        providerTxnId: 'TXN-002',
        transferContent: 'THANH TOAN CHUYEN KHOAN',
        transferredAmount: 2625000,
        transferredAt: new Date('2099-03-10T07:05:00.000Z'),
        currentUserId: 7,
        isAdmin: true
      })
    );

    expect(result.result).toBe(ManualReconcileResult.REJECTED_NOT_FOUND);
    expect(paymentRepository.findPaymentByCode).not.toHaveBeenCalled();
    expect(paymentRepository.updatePaymentIntent).not.toHaveBeenCalled();
  });

  it('rejects when transferred amount mismatches', async () => {
    const paymentRepository = {
      findPaymentByProviderTxnId: jest.fn().mockResolvedValue(null),
      findPaymentByCode: jest.fn().mockResolvedValue({
        id: 1,
        bookingId: 99,
        userId: 42,
        amount: 2625000,
        currency: 'VND',
        paymentCode: 'TBK-99',
        paymentStatus: PaymentStatus.PENDING,
        refundStatus: 0,
        expiresAt: new Date('2099-03-10T07:15:00.000Z'),
        createdAt: new Date('2099-03-10T07:00:00.000Z'),
        attempts: [],
        refunds: []
      }),
      updatePaymentIntent: jest.fn()
    };
    const handler = new ManualReconcilePaymentHandler(paymentRepository as any, {
      transaction: jest.fn()
    } as unknown as DataSource);

    const result = await handler.execute(
      new ManualReconcilePayment({
        providerTxnId: 'TXN-003',
        transferContent: 'TBK-99',
        transferredAmount: 100000,
        transferredAt: new Date('2099-03-10T07:05:00.000Z'),
        currentUserId: 7,
        isAdmin: true
      })
    );

    expect(result.result).toBe(ManualReconcileResult.REJECTED_AMOUNT_MISMATCH);
    expect(paymentRepository.updatePaymentIntent).not.toHaveBeenCalled();
  });

  it('rejects when payment is expired', async () => {
    const paymentRepository = {
      findPaymentByProviderTxnId: jest.fn().mockResolvedValue(null),
      findPaymentByCode: jest.fn().mockResolvedValue({
        id: 1,
        bookingId: 99,
        userId: 42,
        amount: 2625000,
        currency: 'VND',
        paymentCode: 'TBK-99',
        paymentStatus: PaymentStatus.PENDING,
        refundStatus: 0,
        expiresAt: new Date('2099-03-10T07:00:00.000Z'),
        createdAt: new Date('2099-03-10T06:45:00.000Z'),
        attempts: [],
        refunds: []
      }),
      updatePaymentIntent: jest.fn()
    };
    const handler = new ManualReconcilePaymentHandler(paymentRepository as any, {
      transaction: jest.fn()
    } as unknown as DataSource);

    const result = await handler.execute(
      new ManualReconcilePayment({
        providerTxnId: 'TXN-004',
        transferContent: 'TBK-99',
        transferredAmount: 2625000,
        transferredAt: new Date('2099-03-10T07:05:00.000Z'),
        currentUserId: 7,
        isAdmin: true
      })
    );

    expect(result.result).toBe(ManualReconcileResult.REJECTED_EXPIRED);
    expect(paymentRepository.updatePaymentIntent).not.toHaveBeenCalled();
  });

  it('is idempotent when provider transaction already exists', async () => {
    const paymentRepository = {
      findPaymentByProviderTxnId: jest.fn().mockResolvedValue({
        id: 1,
        bookingId: 99,
        userId: 42,
        amount: 2625000,
        currency: 'VND',
        paymentCode: 'TBK-99',
        paymentStatus: PaymentStatus.SUCCEEDED,
        refundStatus: 0,
        providerTxnId: 'TXN-005',
        expiresAt: new Date('2099-03-10T07:15:00.000Z'),
        createdAt: new Date('2099-03-10T07:00:00.000Z'),
        attempts: [],
        refunds: []
      }),
      findPaymentByCode: jest.fn(),
      updatePaymentIntent: jest.fn()
    };
    const handler = new ManualReconcilePaymentHandler(paymentRepository as any, {
      transaction: jest.fn()
    } as unknown as DataSource);

    const result = await handler.execute(
      new ManualReconcilePayment({
        providerTxnId: 'TXN-005',
        transferContent: 'TBK-99',
        transferredAmount: 2625000,
        transferredAt: new Date('2099-03-10T07:05:00.000Z'),
        currentUserId: 7,
        isAdmin: true
      })
    );

    expect(result.result).toBe(ManualReconcileResult.ALREADY_CREDITED);
    expect(paymentRepository.findPaymentByCode).not.toHaveBeenCalled();
    expect(paymentRepository.updatePaymentIntent).not.toHaveBeenCalled();
  });
});
