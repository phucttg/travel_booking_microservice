import { ConfirmPayment, ConfirmPaymentHandler } from '@/payment/features/v1/confirm-payment/confirm-payment';
import { FakePaymentScenario, PaymentStatus } from 'building-blocks/contracts/payment.contract';
import { DataSource } from 'typeorm';
import { IdempotencyRecord } from '@/payment/entities/idempotency-record.entity';
import { OutboxMessage } from '@/payment/entities/outbox-message.entity';
import { PaymentAttempt } from '@/payment/entities/payment-attempt.entity';
import { PaymentIntent } from '@/payment/entities/payment-intent.entity';
import { createRequestHash } from '@/payment/utils/request-hash';

describe('ConfirmPaymentHandler', () => {
  it('marks a payment as succeeded and enqueues PaymentSucceeded', async () => {
    const initialPayment = {
      id: 1,
      bookingId: 99,
      userId: 42,
      amount: 2625000,
      currency: 'VND',
      paymentStatus: PaymentStatus.PENDING,
      refundStatus: 0,
      expiresAt: new Date('2099-03-10T07:15:00.000Z'),
      createdAt: new Date('2099-03-10T07:00:00.000Z')
    };
    const paymentRepository = {
      findPaymentById: jest.fn().mockResolvedValue(initialPayment)
    };
    const idempotencyRepository = {
      findByScopeAndKey: jest.fn().mockResolvedValue(null),
      saveRecord: jest.fn()
    };
    const paymentQueryBuilder = {
      setLock: jest.fn(),
      where: jest.fn(),
      getOne: jest.fn().mockResolvedValue({
        ...initialPayment
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
    const txIdempotencyRepository = {
      save: jest.fn().mockImplementation(async (record) => record)
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
            if (entity === IdempotencyRecord) {
              return txIdempotencyRepository;
            }
            if (entity === OutboxMessage) {
              return txOutboxRepository;
            }

            throw new Error('Unexpected repository');
          })
        })
      )
    } as unknown as DataSource;

    const handler = new ConfirmPaymentHandler(
      paymentRepository as any,
      idempotencyRepository as any,
      dataSource
    );

    const result = await handler.execute(
      new ConfirmPayment({
        id: 1,
        scenario: FakePaymentScenario.SUCCESS,
        currentUserId: 42,
        idempotencyKey: 'payment-1'
      })
    );

    expect(txPaymentAttemptRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        paymentId: 1,
        scenario: FakePaymentScenario.SUCCESS,
        paymentStatus: PaymentStatus.SUCCEEDED
      })
    );
    expect(txOutboxRepository.insert).toHaveBeenCalledTimes(1);
    expect(result.paymentStatus).toBe(PaymentStatus.SUCCEEDED);
  });

  it('returns the stored response for an idempotent replay', async () => {
    const idempotentResponse = {
      id: 1,
      bookingId: 99,
      userId: 42,
      amount: 2625000,
      currency: 'VND',
      paymentStatus: PaymentStatus.SUCCEEDED,
      refundStatus: 0,
      expiresAt: '2099-03-10T07:15:00.000Z',
      createdAt: '2099-03-10T07:00:00.000Z'
    };
    const paymentRepository = {
      findPaymentById: jest.fn(),
    };
    const idempotencyRepository = {
      findByScopeAndKey: jest.fn().mockResolvedValue({
        requestHash: createRequestHash({
          paymentId: 1,
          userId: 42,
          scenario: FakePaymentScenario.SUCCESS
        }),
        responseBody: JSON.stringify(idempotentResponse)
      }),
      saveRecord: jest.fn()
    };
    const dataSource = {
      transaction: jest.fn()
    } as unknown as DataSource;

    const handler = new ConfirmPaymentHandler(
      paymentRepository as any,
      idempotencyRepository as any,
      dataSource
    );

    const result = await handler.execute(
      new ConfirmPayment({
        id: 1,
        scenario: FakePaymentScenario.SUCCESS,
        currentUserId: 42,
        idempotencyKey: 'payment-1'
      })
    );

    expect(paymentRepository.findPaymentById).not.toHaveBeenCalled();
    expect(result.paymentStatus).toBe(PaymentStatus.SUCCEEDED);
  });
});
