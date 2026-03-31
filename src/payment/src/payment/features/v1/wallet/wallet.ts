import { ApiBearerAuth, ApiResponse, ApiTags } from '@nestjs/swagger';
import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  ForbiddenException,
  Get,
  Inject,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UnauthorizedException,
  UseGuards
} from '@nestjs/common';
import { CommandBus, CommandHandler, ICommandHandler, IQueryHandler, QueryBus, QueryHandler } from '@nestjs/cqrs';
import { Request } from 'express';
import { DataSource, EntityManager, QueryFailedError } from 'typeorm';
import { JwtGuard } from 'building-blocks/passport/jwt.guard';
import { Role } from 'building-blocks/contracts/identity.contract';
import {
  CreateWalletTopupRequestDto,
  PaymentExpired,
  PaymentStatus,
  PaymentSucceeded,
  ReviewWalletTopupRequestDto,
  WalletDto,
  WalletPayBookingRequestDto,
  WalletPayBookingResponseDto,
  WalletTopupRequestDto
} from 'building-blocks/contracts/payment.contract';
import { prepareOutboxMessage } from 'building-blocks/rabbitmq/outbox-message';
import { Wallet } from '@/payment/entities/wallet.entity';
import { WalletTopupRequest } from '@/payment/entities/wallet-topup-request.entity';
import { WalletLedger } from '@/payment/entities/wallet-ledger.entity';
import { WalletLedgerReferenceType } from '@/payment/enums/wallet-ledger-reference-type.enum';
import { WalletLedgerType } from '@/payment/enums/wallet-ledger-type.enum';
import { IPaymentRepository } from '@/payment/repositories/payment.repository';
import { toPaymentDto } from '@/payment/utils/payment.mapper';
import { toWalletDto, toWalletTopupRequestDto } from '@/payment/utils/wallet.mapper';
import { PaymentIntent } from '@/payment/entities/payment-intent.entity';
import { PaymentAttempt } from '@/payment/entities/payment-attempt.entity';
import { FakePaymentScenario } from '@/payment/enums/fake-payment-scenario.enum';
import { WalletTopupRequestsQueryDto } from '@/payment/dtos/wallet-topup-requests-query.dto';
import { WalletTopupRequestStatus as WalletTopupRequestStatusEntity } from '@/payment/enums/wallet-topup-request-status.enum';
import { OutboxMessage } from '@/payment/entities/outbox-message.entity';
import { RateLimitPolicy } from 'building-blocks/rate-limit/rate-limit.decorator';

type JwtRequest = Request & {
  user?: {
    userId?: number | string;
    role?: number | string;
  };
};

const MAX_PENDING_TOPUP_REQUESTS = 3;
const WALLET_CURRENCY = 'VND';
const PG_UNIQUE_VIOLATION_CODE = '23505';

const createBadRequest = (type: string, message: string, extra: Record<string, unknown> = {}) => {
  const exception = new BadRequestException({
    message,
    type,
    ...extra
  });
  (exception as any).message = message;
  return exception;
};

const createConflict = (type: string, message: string, extra: Record<string, unknown> = {}) => {
  const exception = new ConflictException({
    message,
    type,
    ...extra
  });
  (exception as any).message = message;
  return exception;
};

const createNotFound = (type: string, message: string, extra: Record<string, unknown> = {}) => {
  const exception = new NotFoundException({
    message,
    type,
    ...extra
  });
  (exception as any).message = message;
  return exception;
};

export class GetMyWallet {
  currentUserId: number;

  constructor(partial: Partial<GetMyWallet> = {}) {
    Object.assign(this, partial);
  }
}

export class CreateWalletTopupRequest {
  currentUserId: number;
  amount: number;
  transferContent: string;
  providerTxnId: string;

  constructor(partial: Partial<CreateWalletTopupRequest> = {}) {
    Object.assign(this, partial);
  }
}

export class GetMyWalletTopupRequests {
  currentUserId: number;

  constructor(partial: Partial<GetMyWalletTopupRequests> = {}) {
    Object.assign(this, partial);
  }
}

export class GetWalletTopupRequests {
  currentUserId: number;
  status?: WalletTopupRequestStatusEntity;
  isAdmin = false;

  constructor(partial: Partial<GetWalletTopupRequests> = {}) {
    Object.assign(this, partial);
  }
}

export class ApproveWalletTopupRequest {
  topupRequestId: number;
  currentUserId: number;
  isAdmin = false;

  constructor(partial: Partial<ApproveWalletTopupRequest> = {}) {
    Object.assign(this, partial);
  }
}

export class RejectWalletTopupRequest {
  topupRequestId: number;
  rejectionReason: string;
  currentUserId: number;
  isAdmin = false;

  constructor(partial: Partial<RejectWalletTopupRequest> = {}) {
    Object.assign(this, partial);
  }
}

export class PayBookingWithWallet {
  paymentId: number;
  currentUserId: number;

  constructor(partial: Partial<PayBookingWithWallet> = {}) {
    Object.assign(this, partial);
  }
}

@ApiBearerAuth()
@ApiTags('Wallet')
@Controller({
  path: '/wallet',
  version: '1'
})
export class WalletController {
  constructor(private readonly commandBus: CommandBus, private readonly queryBus: QueryBus) {}

  @Get('me')
  @UseGuards(JwtGuard)
  @RateLimitPolicy('read.authenticated.default')
  @ApiResponse({ status: 200, description: 'OK' })
  async getMyWallet(@Req() request: JwtRequest): Promise<WalletDto> {
    const currentUserId = Number(request.user?.userId);
    if (!Number.isInteger(currentUserId) || currentUserId <= 0) {
      throw new UnauthorizedException('Invalid token payload');
    }

    return await this.queryBus.execute(new GetMyWallet({ currentUserId }));
  }

  @Post('topup-requests')
  @UseGuards(JwtGuard)
  @RateLimitPolicy('wallet.topup_create')
  @ApiResponse({ status: 201, description: 'CREATED' })
  async createTopupRequest(
    @Body() request: CreateWalletTopupRequestDto,
    @Req() httpRequest: JwtRequest
  ): Promise<WalletTopupRequestDto> {
    const currentUserId = Number(httpRequest.user?.userId);
    if (!Number.isInteger(currentUserId) || currentUserId <= 0) {
      throw new UnauthorizedException('Invalid token payload');
    }

    return await this.commandBus.execute(
      new CreateWalletTopupRequest({
        currentUserId,
        ...request
      })
    );
  }

  @Get('topup-requests/my')
  @UseGuards(JwtGuard)
  @RateLimitPolicy('read.authenticated.default')
  @ApiResponse({ status: 200, description: 'OK' })
  async getMyTopupRequests(@Req() request: JwtRequest): Promise<WalletTopupRequestDto[]> {
    const currentUserId = Number(request.user?.userId);
    if (!Number.isInteger(currentUserId) || currentUserId <= 0) {
      throw new UnauthorizedException('Invalid token payload');
    }

    return await this.queryBus.execute(new GetMyWalletTopupRequests({ currentUserId }));
  }

  @Get('topup-requests')
  @UseGuards(JwtGuard)
  @RateLimitPolicy('read.authenticated.default')
  @ApiResponse({ status: 200, description: 'OK' })
  async getTopupRequests(
    @Query() query: WalletTopupRequestsQueryDto,
    @Req() request: JwtRequest
  ): Promise<WalletTopupRequestDto[]> {
    const currentUserId = Number(request.user?.userId);
    const isAdmin = Number(request.user?.role) === Role.ADMIN;

    if (!Number.isInteger(currentUserId) || currentUserId <= 0) {
      throw new UnauthorizedException('Invalid token payload');
    }
    if (!isAdmin) {
      throw new ForbiddenException('Only admins can view all top-up requests');
    }

    return await this.queryBus.execute(
      new GetWalletTopupRequests({
        currentUserId,
        isAdmin,
        status: query.status
      })
    );
  }

  @Patch('topup-requests/:id/approve')
  @UseGuards(JwtGuard)
  @RateLimitPolicy('admin.write.default')
  @ApiResponse({ status: 200, description: 'OK' })
  async approveTopupRequest(@Param('id') id: string, @Req() request: JwtRequest): Promise<WalletTopupRequestDto> {
    const currentUserId = Number(request.user?.userId);
    const isAdmin = Number(request.user?.role) === Role.ADMIN;
    const topupRequestId = Number(id);

    if (!Number.isInteger(currentUserId) || currentUserId <= 0) {
      throw new UnauthorizedException('Invalid token payload');
    }
    if (!Number.isInteger(topupRequestId) || topupRequestId <= 0) {
      throw createBadRequest('INVALID_TOPUP_REQUEST_ID', 'Top-up request id is invalid');
    }
    if (!isAdmin) {
      throw new ForbiddenException('Only admins can approve top-up requests');
    }

    return await this.commandBus.execute(
      new ApproveWalletTopupRequest({
        topupRequestId,
        currentUserId,
        isAdmin
      })
    );
  }

  @Patch('topup-requests/:id/reject')
  @UseGuards(JwtGuard)
  @RateLimitPolicy('admin.write.default')
  @ApiResponse({ status: 200, description: 'OK' })
  async rejectTopupRequest(
    @Param('id') id: string,
    @Body() request: ReviewWalletTopupRequestDto,
    @Req() httpRequest: JwtRequest
  ): Promise<WalletTopupRequestDto> {
    const currentUserId = Number(httpRequest.user?.userId);
    const isAdmin = Number(httpRequest.user?.role) === Role.ADMIN;
    const topupRequestId = Number(id);

    if (!Number.isInteger(currentUserId) || currentUserId <= 0) {
      throw new UnauthorizedException('Invalid token payload');
    }
    if (!Number.isInteger(topupRequestId) || topupRequestId <= 0) {
      throw createBadRequest('INVALID_TOPUP_REQUEST_ID', 'Top-up request id is invalid');
    }
    if (!isAdmin) {
      throw new ForbiddenException('Only admins can reject top-up requests');
    }

    return await this.commandBus.execute(
      new RejectWalletTopupRequest({
        topupRequestId,
        rejectionReason: request.rejectionReason,
        currentUserId,
        isAdmin
      })
    );
  }

  @Post('pay-booking')
  @UseGuards(JwtGuard)
  @RateLimitPolicy('wallet.pay_booking')
  @ApiResponse({ status: 200, description: 'OK' })
  async payBooking(
    @Body() request: WalletPayBookingRequestDto,
    @Req() httpRequest: JwtRequest
  ): Promise<WalletPayBookingResponseDto> {
    const currentUserId = Number(httpRequest.user?.userId);
    if (!Number.isInteger(currentUserId) || currentUserId <= 0) {
      throw new UnauthorizedException('Invalid token payload');
    }

    return await this.commandBus.execute(
      new PayBookingWithWallet({
        currentUserId,
        paymentId: request.paymentId
      })
    );
  }
}

@QueryHandler(GetMyWallet)
export class GetMyWalletHandler implements IQueryHandler<GetMyWallet> {
  constructor(private readonly dataSource: DataSource) {}

  async execute(query: GetMyWallet): Promise<WalletDto> {
    const walletRepository = this.dataSource.getRepository(Wallet);
    const wallet = await walletRepository.findOne({
      where: { userId: query.currentUserId }
    });

    return toWalletDto(wallet, query.currentUserId);
  }
}

@CommandHandler(CreateWalletTopupRequest)
export class CreateWalletTopupRequestHandler implements ICommandHandler<CreateWalletTopupRequest> {
  constructor(private readonly dataSource: DataSource) {}

  async execute(command: CreateWalletTopupRequest): Promise<WalletTopupRequestDto> {
    const topupRequestRepository = this.dataSource.getRepository(WalletTopupRequest);
    const providerTxnId = command.providerTxnId.trim();
    const transferContent = command.transferContent.trim();
    const amount = Number(command.amount);

    const existingByProviderTxnId = await topupRequestRepository.findOne({
      where: {
        providerTxnId
      }
    });
    if (existingByProviderTxnId) {
      throw createConflict('DUPLICATE_PROVIDER_TXN_ID', 'Mã giao dịch đã tồn tại');
    }

    const pendingCount = await topupRequestRepository.count({
      where: {
        userId: command.currentUserId,
        status: WalletTopupRequestStatusEntity.PENDING
      }
    });
    if (pendingCount >= MAX_PENDING_TOPUP_REQUESTS) {
      throw createConflict('TOPUP_PENDING_LIMIT_REACHED', 'Bạn đã có tối đa 3 yêu cầu nạp tiền đang chờ duyệt', {
        pendingLimit: MAX_PENDING_TOPUP_REQUESTS
      });
    }

    try {
      const createdRequest = await topupRequestRepository.save(
        new WalletTopupRequest({
          userId: command.currentUserId,
          amount,
          currency: WALLET_CURRENCY,
          transferContent,
          providerTxnId,
          status: WalletTopupRequestStatusEntity.PENDING
        })
      );

      return toWalletTopupRequestDto(createdRequest);
    } catch (error) {
      if (error instanceof QueryFailedError && (error as any)?.driverError?.code === PG_UNIQUE_VIOLATION_CODE) {
        throw createConflict('DUPLICATE_PROVIDER_TXN_ID', 'Mã giao dịch đã tồn tại');
      }

      throw error;
    }
  }
}

@QueryHandler(GetMyWalletTopupRequests)
export class GetMyWalletTopupRequestsHandler implements IQueryHandler<GetMyWalletTopupRequests> {
  constructor(private readonly dataSource: DataSource) {}

  async execute(query: GetMyWalletTopupRequests): Promise<WalletTopupRequestDto[]> {
    const topupRequestRepository = this.dataSource.getRepository(WalletTopupRequest);
    const requests = await topupRequestRepository.find({
      where: { userId: query.currentUserId },
      order: { id: 'DESC' }
    });

    return requests.map((item) => toWalletTopupRequestDto(item));
  }
}

@QueryHandler(GetWalletTopupRequests)
export class GetWalletTopupRequestsHandler implements IQueryHandler<GetWalletTopupRequests> {
  constructor(private readonly dataSource: DataSource) {}

  async execute(query: GetWalletTopupRequests): Promise<WalletTopupRequestDto[]> {
    if (!query.isAdmin) {
      throw new ForbiddenException('Only admins can view all top-up requests');
    }

    const topupRequestRepository = this.dataSource.getRepository(WalletTopupRequest);
    const where = query.status ? { status: query.status } : undefined;
    const requests = await topupRequestRepository.find({
      where,
      order: { id: 'DESC' }
    });

    return requests.map((item) => toWalletTopupRequestDto(item));
  }
}

@CommandHandler(ApproveWalletTopupRequest)
export class ApproveWalletTopupRequestHandler implements ICommandHandler<ApproveWalletTopupRequest> {
  constructor(private readonly dataSource: DataSource) {}

  async execute(command: ApproveWalletTopupRequest): Promise<WalletTopupRequestDto> {
    const updatedRequest = await this.dataSource.transaction(async (manager) => {
      const topupRequestRepository = manager.getRepository(WalletTopupRequest);
      const walletLedgerRepository = manager.getRepository(WalletLedger);
      const now = new Date();

      const topupRequest = await topupRequestRepository
        .createQueryBuilder('request')
        .setLock('pessimistic_write')
        .where('request.id = :id', { id: command.topupRequestId })
        .getOne();

      if (!topupRequest) {
        throw createNotFound('TOPUP_REQUEST_NOT_FOUND', 'Không tìm thấy yêu cầu nạp tiền');
      }

      if (topupRequest.status !== WalletTopupRequestStatusEntity.PENDING) {
        throw createConflict('TOPUP_REQUEST_NOT_PENDING', 'Yêu cầu nạp tiền không còn ở trạng thái chờ duyệt', {
          currentStatus: topupRequest.status
        });
      }

      const wallet = await this.ensureWalletForUpdate(manager, topupRequest.userId);
      const balanceBefore = Number(wallet.balance || 0);
      const amount = Number(topupRequest.amount || 0);
      const balanceAfter = balanceBefore + amount;

      wallet.balance = balanceAfter;
      wallet.currency = WALLET_CURRENCY;
      wallet.updatedAt = now;
      await manager.getRepository(Wallet).save(wallet);

      await walletLedgerRepository.save(
        new WalletLedger({
          userId: topupRequest.userId,
          type: WalletLedgerType.TOPUP_APPROVED,
          amount,
          currency: WALLET_CURRENCY,
          balanceBefore,
          balanceAfter,
          referenceType: WalletLedgerReferenceType.TOPUP_REQUEST,
          referenceId: topupRequest.id
        })
      );

      topupRequest.status = WalletTopupRequestStatusEntity.APPROVED;
      topupRequest.rejectionReason = null;
      topupRequest.reviewedBy = command.currentUserId;
      topupRequest.reviewedAt = now;
      topupRequest.updatedAt = now;

      return await topupRequestRepository.save(topupRequest);
    });

    return toWalletTopupRequestDto(updatedRequest);
  }

  private async ensureWalletForUpdate(manager: EntityManager, userId: number): Promise<Wallet> {
    await manager
      .createQueryBuilder()
      .insert()
      .into(Wallet)
      .values(
        new Wallet({
          userId,
          balance: 0,
          currency: WALLET_CURRENCY
        })
      )
      .orIgnore()
      .execute();

    return await manager
      .getRepository(Wallet)
      .createQueryBuilder('wallet')
      .setLock('pessimistic_write')
      .where('wallet.userId = :userId', { userId })
      .getOne();
  }
}

@CommandHandler(RejectWalletTopupRequest)
export class RejectWalletTopupRequestHandler implements ICommandHandler<RejectWalletTopupRequest> {
  constructor(private readonly dataSource: DataSource) {}

  async execute(command: RejectWalletTopupRequest): Promise<WalletTopupRequestDto> {
    const updatedRequest = await this.dataSource.transaction(async (manager) => {
      const topupRequestRepository = manager.getRepository(WalletTopupRequest);
      const now = new Date();

      const topupRequest = await topupRequestRepository
        .createQueryBuilder('request')
        .setLock('pessimistic_write')
        .where('request.id = :id', { id: command.topupRequestId })
        .getOne();

      if (!topupRequest) {
        throw createNotFound('TOPUP_REQUEST_NOT_FOUND', 'Không tìm thấy yêu cầu nạp tiền');
      }

      if (topupRequest.status !== WalletTopupRequestStatusEntity.PENDING) {
        throw createConflict('TOPUP_REQUEST_NOT_PENDING', 'Yêu cầu nạp tiền không còn ở trạng thái chờ duyệt', {
          currentStatus: topupRequest.status
        });
      }

      topupRequest.status = WalletTopupRequestStatusEntity.REJECTED;
      topupRequest.rejectionReason = command.rejectionReason.trim();
      topupRequest.reviewedBy = command.currentUserId;
      topupRequest.reviewedAt = now;
      topupRequest.updatedAt = now;

      return await topupRequestRepository.save(topupRequest);
    });

    return toWalletTopupRequestDto(updatedRequest);
  }
}

@CommandHandler(PayBookingWithWallet)
export class PayBookingWithWalletHandler implements ICommandHandler<PayBookingWithWallet> {
  constructor(
    private readonly dataSource: DataSource,
    @Inject('IPaymentRepository') private readonly paymentRepository: IPaymentRepository
  ) {}

  async execute(command: PayBookingWithWallet): Promise<WalletPayBookingResponseDto> {
    let updatedPaymentId = 0;
    let walletSnapshot: Wallet = null;
    let paymentExpiredException: BadRequestException | null = null;

    await this.dataSource.transaction(async (manager) => {
      const paymentRepository = manager.getRepository(PaymentIntent);
      const paymentAttemptRepository = manager.getRepository(PaymentAttempt);
      const walletLedgerRepository = manager.getRepository(WalletLedger);
      const outboxRepository = manager.getRepository(OutboxMessage);
      const now = new Date();

      const payment = await this.getPaymentForUpdate(manager, command.paymentId);

      if (!payment) {
        throw createNotFound('PAYMENT_NOT_FOUND', 'Không tìm thấy lệnh thanh toán');
      }

      if (payment.userId !== command.currentUserId) {
        throw new ForbiddenException('You do not have access to this payment');
      }

      if (payment.paymentStatus !== PaymentStatus.SUCCEEDED && payment.expiresAt <= now) {
        payment.paymentStatus = PaymentStatus.EXPIRED;
        payment.updatedAt = now;
        await paymentRepository.save(payment);

        await outboxRepository.insert(
          prepareOutboxMessage(
            new PaymentExpired({
              paymentId: payment.id,
              bookingId: payment.bookingId,
              userId: payment.userId,
              occurredAt: now
            }),
            {
              occurredAt: now
            }
          )
        );

        paymentExpiredException = createBadRequest('PAYMENT_EXPIRED', 'Phiên thanh toán đã hết hạn');
        updatedPaymentId = payment.id;
        walletSnapshot = await this.ensureWalletForUpdate(manager, command.currentUserId);

        return;
      }

      if (payment.paymentStatus === PaymentStatus.EXPIRED) {
        throw createBadRequest('PAYMENT_EXPIRED', 'Phiên thanh toán đã hết hạn');
      }

      if (payment.paymentStatus === PaymentStatus.SUCCEEDED) {
        updatedPaymentId = payment.id;
        walletSnapshot = await this.ensureWalletForUpdate(manager, command.currentUserId);
        return;
      }

      if (payment.paymentStatus === PaymentStatus.PROCESSING) {
        throw createConflict('PAYMENT_PROCESSING', 'Lệnh thanh toán đang được xử lý');
      }

      const wallet = await this.ensureWalletForUpdate(manager, command.currentUserId);
      const walletBalance = Number(wallet.balance || 0);
      const requiredAmount = Number(payment.amount || 0);

      if (walletBalance < requiredAmount) {
        throw createBadRequest('INSUFFICIENT_WALLET_BALANCE', 'Số dư ví không đủ để thanh toán booking', {
          currentBalance: walletBalance,
          requiredAmount
        });
      }

      const balanceBefore = walletBalance;
      const balanceAfter = balanceBefore - requiredAmount;

      wallet.balance = balanceAfter;
      wallet.updatedAt = now;
      walletSnapshot = await manager.getRepository(Wallet).save(wallet);

      await walletLedgerRepository.save(
        new WalletLedger({
          userId: payment.userId,
          type: WalletLedgerType.BOOKING_DEBIT,
          amount: requiredAmount,
          currency: WALLET_CURRENCY,
          balanceBefore,
          balanceAfter,
          referenceType: WalletLedgerReferenceType.BOOKING,
          referenceId: payment.bookingId
        })
      );

      await paymentAttemptRepository.save(
        new PaymentAttempt({
          paymentId: payment.id,
          scenario: FakePaymentScenario.SUCCESS,
          paymentStatus: PaymentStatus.SUCCEEDED
        })
      );

      payment.paymentStatus = PaymentStatus.SUCCEEDED;
      payment.completedAt = now;
      payment.updatedAt = now;

      await paymentRepository.save(payment);
      updatedPaymentId = payment.id;
      await outboxRepository.insert(
        prepareOutboxMessage(
          new PaymentSucceeded({
            paymentId: payment.id,
            bookingId: payment.bookingId,
            userId: payment.userId,
            amount: payment.amount,
            currency: payment.currency,
            occurredAt: now
          }),
          {
            occurredAt: now
          }
        )
      );
    });

    if (paymentExpiredException) {
      throw paymentExpiredException;
    }

    const payment = await this.paymentRepository.findPaymentById(updatedPaymentId);

    return new WalletPayBookingResponseDto({
      payment: toPaymentDto(payment),
      wallet: toWalletDto(walletSnapshot, command.currentUserId)
    });
  }

  private async ensureWalletForUpdate(manager: EntityManager, userId: number): Promise<Wallet> {
    await manager
      .createQueryBuilder()
      .insert()
      .into(Wallet)
      .values(
        new Wallet({
          userId,
          balance: 0,
          currency: WALLET_CURRENCY
        })
      )
      .orIgnore()
      .execute();

    return await manager
      .getRepository(Wallet)
      .createQueryBuilder('wallet')
      .setLock('pessimistic_write')
      .where('wallet.userId = :userId', { userId })
      .getOne();
  }

  private async getPaymentForUpdate(manager: EntityManager, paymentId: number): Promise<PaymentIntent | null> {
    // Keep lock query focused on the main table only.
    // Postgres rejects `FOR UPDATE` when selecting nullable rows from OUTER JOINs.
    return await manager
      .getRepository(PaymentIntent)
      .createQueryBuilder('payment')
      .setLock('pessimistic_write')
      .where('payment.id = :id', { id: paymentId })
      .getOne();
  }
}
