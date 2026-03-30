import { BadRequestException } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { WalletLedger } from '@/payment/entities/wallet-ledger.entity';
import { PaymentAttempt } from '@/payment/entities/payment-attempt.entity';
import { PaymentIntent } from '@/payment/entities/payment-intent.entity';
import { OutboxMessage } from '@/payment/entities/outbox-message.entity';
import { Wallet } from '@/payment/entities/wallet.entity';
import { FakePaymentScenario } from '@/payment/enums/fake-payment-scenario.enum';
import { PayBookingWithWallet, PayBookingWithWalletHandler } from '@/payment/features/v1/wallet/wallet';
import { PaymentStatus, RefundStatus } from 'building-blocks/contracts/payment.contract';

type MockSetup = {
  handler: PayBookingWithWalletHandler;
  mocks: {
    dataSource: { transaction: jest.Mock };
    manager: EntityManager;
    paymentQueryBuilder: {
      setLock: jest.Mock;
      where: jest.Mock;
      getOne: jest.Mock;
    };
    walletQueryBuilder: {
      setLock: jest.Mock;
      where: jest.Mock;
      getOne: jest.Mock;
    };
    paymentIntentRepository: {
      createQueryBuilder: jest.Mock;
      save: jest.Mock;
    };
    paymentAttemptRepository: {
      save: jest.Mock;
    };
    walletRepository: {
      createQueryBuilder: jest.Mock;
      save: jest.Mock;
    };
    walletLedgerRepository: {
      save: jest.Mock;
    };
    outboxRepository: {
      insert: jest.Mock;
    };
    paymentRepository: {
      findPaymentById: jest.Mock;
    };
  };
};

const createPayment = (overrides: Partial<PaymentIntent> = {}): PaymentIntent => {
  const now = new Date('2099-03-10T07:00:00.000Z');
  return new PaymentIntent({
    id: 43,
    bookingId: 56,
    userId: 2,
    amount: 2450000,
    currency: 'VND',
    paymentCode: 'TBK-56',
    paymentStatus: PaymentStatus.PENDING,
    refundStatus: RefundStatus.NONE,
    expiresAt: new Date('2099-03-10T07:30:00.000Z'),
    createdAt: now,
    updatedAt: now,
    attempts: [],
    refunds: [],
    ...overrides
  });
};

const createWallet = (overrides: Partial<Wallet> = {}): Wallet =>
  new Wallet({
    id: 1,
    userId: 2,
    balance: 10100000,
    currency: 'VND',
    createdAt: new Date('2099-03-10T07:00:00.000Z'),
    updatedAt: new Date('2099-03-10T07:00:00.000Z'),
    ...overrides
  });

const makeHandler = (): MockSetup => {
  const paymentQueryBuilder = {
    setLock: jest.fn(),
    where: jest.fn(),
    getOne: jest.fn()
  };
  paymentQueryBuilder.setLock.mockReturnValue(paymentQueryBuilder);
  paymentQueryBuilder.where.mockReturnValue(paymentQueryBuilder);

  const walletQueryBuilder = {
    setLock: jest.fn(),
    where: jest.fn(),
    getOne: jest.fn()
  };
  walletQueryBuilder.setLock.mockReturnValue(walletQueryBuilder);
  walletQueryBuilder.where.mockReturnValue(walletQueryBuilder);

  const walletInsertBuilder = {
    insert: jest.fn(),
    into: jest.fn(),
    values: jest.fn(),
    orIgnore: jest.fn(),
    execute: jest.fn()
  };
  walletInsertBuilder.insert.mockReturnValue(walletInsertBuilder);
  walletInsertBuilder.into.mockReturnValue(walletInsertBuilder);
  walletInsertBuilder.values.mockReturnValue(walletInsertBuilder);
  walletInsertBuilder.orIgnore.mockReturnValue(walletInsertBuilder);
  walletInsertBuilder.execute.mockResolvedValue(undefined);

  const paymentIntentRepository = {
    createQueryBuilder: jest.fn().mockReturnValue(paymentQueryBuilder),
    save: jest.fn().mockImplementation(async (payment: PaymentIntent) => payment)
  };
  const paymentAttemptRepository = {
    save: jest.fn().mockImplementation(async (attempt: PaymentAttempt) => attempt)
  };
  const walletRepository = {
    createQueryBuilder: jest.fn().mockReturnValue(walletQueryBuilder),
    save: jest.fn().mockImplementation(async (wallet: Wallet) => wallet)
  };
  const walletLedgerRepository = {
    save: jest.fn().mockImplementation(async (ledger: WalletLedger) => ledger)
  };
  const outboxRepository = {
    insert: jest.fn().mockResolvedValue(undefined)
  };

  const manager = {
    getRepository: jest.fn((entity: unknown) => {
      if (entity === PaymentIntent) {
        return paymentIntentRepository;
      }
      if (entity === PaymentAttempt) {
        return paymentAttemptRepository;
      }
      if (entity === Wallet) {
        return walletRepository;
      }
      if (entity === WalletLedger) {
        return walletLedgerRepository;
      }
      if (entity === OutboxMessage) {
        return outboxRepository;
      }

      throw new Error('Unsupported repository in test');
    }),
    createQueryBuilder: jest.fn().mockReturnValue(walletInsertBuilder)
  } as unknown as EntityManager;

  const dataSource = {
    transaction: jest.fn(async (callback: (txManager: EntityManager) => Promise<void>) =>
      callback(manager)
    )
  };
  const paymentRepository = {
    findPaymentById: jest.fn()
  };

  const handler = new PayBookingWithWalletHandler(
    dataSource as unknown as DataSource,
    paymentRepository as any
  );

  return {
    handler,
    mocks: {
      dataSource,
      manager,
      paymentQueryBuilder,
      walletQueryBuilder,
      paymentIntentRepository,
      paymentAttemptRepository,
      walletRepository,
      walletLedgerRepository,
      outboxRepository,
      paymentRepository,
    }
  };
};

describe('PayBookingWithWalletHandler', () => {
  it('pays booking successfully when wallet balance is sufficient', async () => {
    const { handler, mocks } = makeHandler();
    mocks.paymentQueryBuilder.getOne.mockResolvedValue(createPayment());
    mocks.walletQueryBuilder.getOne.mockResolvedValue(createWallet());
    mocks.paymentRepository.findPaymentById.mockResolvedValue(
      createPayment({
        paymentStatus: PaymentStatus.SUCCEEDED,
        completedAt: new Date('2099-03-10T07:05:00.000Z')
      })
    );

    const result = await handler.execute(new PayBookingWithWallet({ paymentId: 43, currentUserId: 2 }));

    expect(mocks.paymentQueryBuilder.setLock).toHaveBeenCalledWith('pessimistic_write');
    expect(mocks.paymentQueryBuilder.where).toHaveBeenCalledWith('payment.id = :id', { id: 43 });
    expect(mocks.walletRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        balance: 7650000
      })
    );
    expect(mocks.paymentAttemptRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        paymentId: 43,
        scenario: FakePaymentScenario.SUCCESS,
        paymentStatus: PaymentStatus.SUCCEEDED
      })
    );
    expect(mocks.outboxRepository.insert).toHaveBeenCalledTimes(1);
    expect(result.wallet.balance).toBe(7650000);
    expect(result.payment.paymentStatus).toBe(PaymentStatus.SUCCEEDED);
  });

  it('throws INSUFFICIENT_WALLET_BALANCE when wallet is not enough', async () => {
    const { handler, mocks } = makeHandler();
    mocks.paymentQueryBuilder.getOne.mockResolvedValue(createPayment({ amount: 9000000 }));
    mocks.walletQueryBuilder.getOne.mockResolvedValue(createWallet({ balance: 1000000 }));

    await expect(
      handler.execute(new PayBookingWithWallet({ paymentId: 43, currentUserId: 2 }))
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(mocks.walletLedgerRepository.save).not.toHaveBeenCalled();
    expect(mocks.paymentAttemptRepository.save).not.toHaveBeenCalled();
    expect(mocks.outboxRepository.insert).not.toHaveBeenCalled();
  });

  it('marks payment expired and throws PAYMENT_EXPIRED when payment is out of time window', async () => {
    const { handler, mocks } = makeHandler();
    mocks.paymentQueryBuilder.getOne.mockResolvedValue(
      createPayment({
        expiresAt: new Date('2000-01-01T00:00:00.000Z'),
        paymentStatus: PaymentStatus.PENDING
      })
    );
    mocks.walletQueryBuilder.getOne.mockResolvedValue(createWallet());

    await expect(
      handler.execute(new PayBookingWithWallet({ paymentId: 43, currentUserId: 2 }))
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(mocks.paymentIntentRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        paymentStatus: PaymentStatus.EXPIRED
      })
    );
    expect(mocks.outboxRepository.insert).toHaveBeenCalledTimes(1);
    expect(mocks.paymentAttemptRepository.save).not.toHaveBeenCalled();
  });

  it('returns current state when payment is already succeeded', async () => {
    const { handler, mocks } = makeHandler();
    mocks.paymentQueryBuilder.getOne.mockResolvedValue(
      createPayment({
        paymentStatus: PaymentStatus.SUCCEEDED,
        completedAt: new Date('2099-03-10T07:05:00.000Z')
      })
    );
    mocks.walletQueryBuilder.getOne.mockResolvedValue(createWallet({ balance: 12000000 }));
    mocks.paymentRepository.findPaymentById.mockResolvedValue(
      createPayment({
        paymentStatus: PaymentStatus.SUCCEEDED,
        completedAt: new Date('2099-03-10T07:05:00.000Z')
      })
    );

    const result = await handler.execute(new PayBookingWithWallet({ paymentId: 43, currentUserId: 2 }));

    expect(mocks.paymentAttemptRepository.save).not.toHaveBeenCalled();
    expect(mocks.walletLedgerRepository.save).not.toHaveBeenCalled();
    expect(mocks.outboxRepository.insert).not.toHaveBeenCalled();
    expect(result.wallet.balance).toBe(12000000);
    expect(result.payment.paymentStatus).toBe(PaymentStatus.SUCCEEDED);
  });
});
