import { ManualReconcilePayment, ManualReconcilePaymentHandler } from '@/payment/features/v1/reconcile-manual/reconcile-manual';
import { ManualReconcileResult, PaymentStatus } from 'building-blocks/contracts/payment.contract';

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
      createAttempt: jest.fn(),
      updatePaymentIntent: jest.fn().mockImplementation(async (payment) => ({
        ...payment,
        attempts: [],
        refunds: []
      }))
    };
    const rabbitmqPublisher = {
      publishMessage: jest.fn(),
      isPublished: jest.fn()
    };

    const handler = new ManualReconcilePaymentHandler(paymentRepository as any, rabbitmqPublisher as any);

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
    expect(paymentRepository.createAttempt).toHaveBeenCalledTimes(1);
    expect(paymentRepository.updatePaymentIntent).toHaveBeenCalledWith(
      expect.objectContaining({
        paymentStatus: PaymentStatus.SUCCEEDED,
        providerTxnId: 'TXN-001',
        reconciledBy: 7
      })
    );
    expect(rabbitmqPublisher.publishMessage).toHaveBeenCalledTimes(1);
  });

  it('rejects when payment code cannot be found in transfer content', async () => {
    const paymentRepository = {
      findPaymentByProviderTxnId: jest.fn().mockResolvedValue(null),
      findPaymentByCode: jest.fn(),
      createAttempt: jest.fn(),
      updatePaymentIntent: jest.fn()
    };
    const rabbitmqPublisher = {
      publishMessage: jest.fn(),
      isPublished: jest.fn()
    };
    const handler = new ManualReconcilePaymentHandler(paymentRepository as any, rabbitmqPublisher as any);

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
      createAttempt: jest.fn(),
      updatePaymentIntent: jest.fn()
    };
    const rabbitmqPublisher = {
      publishMessage: jest.fn(),
      isPublished: jest.fn()
    };
    const handler = new ManualReconcilePaymentHandler(paymentRepository as any, rabbitmqPublisher as any);

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
    expect(rabbitmqPublisher.publishMessage).not.toHaveBeenCalled();
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
      createAttempt: jest.fn(),
      updatePaymentIntent: jest.fn()
    };
    const rabbitmqPublisher = {
      publishMessage: jest.fn(),
      isPublished: jest.fn()
    };
    const handler = new ManualReconcilePaymentHandler(paymentRepository as any, rabbitmqPublisher as any);

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
      createAttempt: jest.fn(),
      updatePaymentIntent: jest.fn()
    };
    const rabbitmqPublisher = {
      publishMessage: jest.fn(),
      isPublished: jest.fn()
    };
    const handler = new ManualReconcilePaymentHandler(paymentRepository as any, rabbitmqPublisher as any);

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
