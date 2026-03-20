import { ConfirmPayment, ConfirmPaymentHandler } from '@/payment/features/v1/confirm-payment/confirm-payment';
import { FakePaymentScenario, PaymentStatus } from 'building-blocks/contracts/payment.contract';
import { createRequestHash } from '@/payment/utils/request-hash';

describe('ConfirmPaymentHandler', () => {
  it('marks a payment as succeeded and publishes PaymentSucceeded', async () => {
    const paymentRepository = {
      findPaymentById: jest.fn().mockResolvedValue({
        id: 1,
        bookingId: 99,
        userId: 42,
        amount: 2625000,
        currency: 'VND',
        paymentStatus: PaymentStatus.PENDING,
        refundStatus: 0,
        expiresAt: new Date('2099-03-10T07:15:00.000Z'),
        createdAt: new Date('2099-03-10T07:00:00.000Z')
      }),
      createAttempt: jest.fn(),
      updatePaymentIntent: jest.fn().mockImplementation(async (payment) => ({
        ...payment,
        attempts: [],
        refunds: []
      }))
    };
    const idempotencyRepository = {
      findByScopeAndKey: jest.fn().mockResolvedValue(null),
      saveRecord: jest.fn()
    };
    const rabbitmqPublisher = {
      publishMessage: jest.fn(),
      isPublished: jest.fn()
    };

    const handler = new ConfirmPaymentHandler(
      paymentRepository as any,
      idempotencyRepository as any,
      rabbitmqPublisher as any
    );

    const result = await handler.execute(
      new ConfirmPayment({
        id: 1,
        scenario: FakePaymentScenario.SUCCESS,
        currentUserId: 42,
        idempotencyKey: 'payment-1'
      })
    );

    expect(paymentRepository.createAttempt).toHaveBeenCalledWith(
      expect.objectContaining({
        paymentId: 1,
        scenario: FakePaymentScenario.SUCCESS,
        paymentStatus: PaymentStatus.SUCCEEDED
      })
    );
    expect(rabbitmqPublisher.publishMessage).toHaveBeenCalledTimes(1);
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
      createAttempt: jest.fn(),
      updatePaymentIntent: jest.fn()
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
    const rabbitmqPublisher = {
      publishMessage: jest.fn(),
      isPublished: jest.fn()
    };

    const handler = new ConfirmPaymentHandler(
      paymentRepository as any,
      idempotencyRepository as any,
      rabbitmqPublisher as any
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
