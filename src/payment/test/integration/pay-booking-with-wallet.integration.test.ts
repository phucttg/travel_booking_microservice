import { DataSource } from 'typeorm';
import { GenericContainer, StartedTestContainer, Wait } from 'testcontainers';
import { PaymentStatus, RefundStatus } from 'building-blocks/contracts/payment.contract';
import { PayBookingWithWallet, PayBookingWithWalletHandler } from '@/payment/features/v1/wallet/wallet';
import { PaymentIntent } from '@/payment/entities/payment-intent.entity';
import { PaymentAttempt } from '@/payment/entities/payment-attempt.entity';
import { Refund } from '@/payment/entities/refund.entity';
import { Wallet } from '@/payment/entities/wallet.entity';
import { WalletLedger } from '@/payment/entities/wallet-ledger.entity';

jest.setTimeout(240000);

describe('PayBookingWithWalletHandler (integration)', () => {
  let postgresContainer: StartedTestContainer;
  let dataSource: DataSource;
  let handler: PayBookingWithWalletHandler;
  const rabbitmqPublisher = {
    publishMessage: jest.fn().mockResolvedValue(undefined)
  };

  beforeAll(async () => {
    postgresContainer = await new GenericContainer('postgres:16-alpine')
      .withExposedPorts(5432)
      .withEnvironment({
        POSTGRES_DB: 'test_db',
        POSTGRES_USER: 'testcontainers',
        POSTGRES_PASSWORD: 'testcontainers'
      })
      .withWaitStrategy(
        Wait.forAll([Wait.forListeningPorts(), Wait.forLogMessage('database system is ready to accept connections', 2)])
      )
      .withStartupTimeout(180000)
      .start();

    dataSource = new DataSource({
      type: 'postgres',
      host: postgresContainer.getHost(),
      port: postgresContainer.getMappedPort(5432),
      username: 'testcontainers',
      password: 'testcontainers',
      database: 'test_db',
      synchronize: true,
      dropSchema: true,
      logging: false,
      entities: [PaymentIntent, PaymentAttempt, Refund, Wallet, WalletLedger]
    });
    await dataSource.initialize();

    const paymentRepository = {
      findPaymentById: jest.fn(async (id: number) => {
        return await dataSource.getRepository(PaymentIntent).findOne({
          where: { id },
          relations: ['attempts', 'refunds']
        });
      })
    };

    handler = new PayBookingWithWalletHandler(dataSource, paymentRepository as any, rabbitmqPublisher as any);
  });

  afterAll(async () => {
    if (dataSource?.isInitialized) {
      await dataSource.destroy();
    }

    if (postgresContainer) {
      await postgresContainer.stop();
    }
  });

  beforeEach(async () => {
    rabbitmqPublisher.publishMessage.mockClear();
    await dataSource.synchronize(true);
  });

  it('processes wallet payment successfully when attempts/refunds are empty', async () => {
    const now = new Date('2099-03-20T14:45:00.000Z');

    const seededPayment = await dataSource.getRepository(PaymentIntent).save(
      new PaymentIntent({
        bookingId: 501,
        userId: 2,
        amount: 2450000,
        currency: 'VND',
        paymentCode: 'TBK-501',
        paymentStatus: PaymentStatus.PENDING,
        refundStatus: RefundStatus.NONE,
        expiresAt: new Date('2099-03-20T15:45:00.000Z'),
        createdAt: now,
        updatedAt: now
      })
    );

    await dataSource.getRepository(Wallet).save(
      new Wallet({
        userId: 2,
        balance: 10100000,
        currency: 'VND',
        createdAt: now,
        updatedAt: now
      })
    );

    const response = await handler.execute(new PayBookingWithWallet({ paymentId: seededPayment.id, currentUserId: 2 }));

    expect(response.payment.id).toBe(seededPayment.id);
    expect(response.payment.paymentStatus).toBe(PaymentStatus.SUCCEEDED);
    expect(response.wallet.balance).toBe(7650000);

    const savedWallet = await dataSource.getRepository(Wallet).findOneBy({ userId: 2 });
    expect(savedWallet.balance).toBe(7650000);

    const savedPayment = await dataSource.getRepository(PaymentIntent).findOneBy({ id: seededPayment.id });
    expect(savedPayment.paymentStatus).toBe(PaymentStatus.SUCCEEDED);

    const attempts = await dataSource.getRepository(PaymentAttempt).findBy({ paymentId: seededPayment.id });
    expect(attempts).toHaveLength(1);
    expect(rabbitmqPublisher.publishMessage).toHaveBeenCalledTimes(1);
  });
});
