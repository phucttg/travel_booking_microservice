import { ConflictException } from '@nestjs/common';
import { CreateWalletTopupRequest, CreateWalletTopupRequestHandler } from '@/payment/features/v1/wallet/wallet';
import { WalletTopupRequestStatus } from '@/payment/enums/wallet-topup-request-status.enum';

describe('CreateWalletTopupRequestHandler', () => {
  const makeHandler = () => {
    const topupRequestRepository = {
      findOne: jest.fn(),
      count: jest.fn(),
      save: jest.fn()
    };
    const dataSource = {
      getRepository: jest.fn().mockReturnValue(topupRequestRepository)
    };

    return {
      handler: new CreateWalletTopupRequestHandler(dataSource as any),
      topupRequestRepository
    };
  };

  it('creates a pending topup request successfully', async () => {
    const { handler, topupRequestRepository } = makeHandler();
    topupRequestRepository.findOne.mockResolvedValue(null);
    topupRequestRepository.count.mockResolvedValue(0);
    topupRequestRepository.save.mockImplementation(async (input) => ({
      ...input,
      id: 1,
      status: WalletTopupRequestStatus.PENDING,
      createdAt: new Date('2099-03-10T07:00:00.000Z')
    }));

    const result = await handler.execute(
      new CreateWalletTopupRequest({
        currentUserId: 42,
        amount: 500000,
        transferContent: 'TOPUP USER 42',
        providerTxnId: 'VCB-001'
      })
    );

    expect(result).toEqual(
      expect.objectContaining({
        id: 1,
        userId: 42,
        amount: 500000,
        providerTxnId: 'VCB-001',
        status: WalletTopupRequestStatus.PENDING
      })
    );
  });

  it('rejects duplicate providerTxnId', async () => {
    const { handler, topupRequestRepository } = makeHandler();
    topupRequestRepository.findOne.mockResolvedValue({
      id: 88,
      providerTxnId: 'VCB-001'
    });

    await expect(
      handler.execute(
        new CreateWalletTopupRequest({
          currentUserId: 42,
          amount: 500000,
          transferContent: 'TOPUP USER 42',
          providerTxnId: 'VCB-001'
        })
      )
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects when pending topup requests reaches limit', async () => {
    const { handler, topupRequestRepository } = makeHandler();
    topupRequestRepository.findOne.mockResolvedValue(null);
    topupRequestRepository.count.mockResolvedValue(3);

    await expect(
      handler.execute(
        new CreateWalletTopupRequest({
          currentUserId: 42,
          amount: 500000,
          transferContent: 'TOPUP USER 42',
          providerTxnId: 'VCB-002'
        })
      )
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
