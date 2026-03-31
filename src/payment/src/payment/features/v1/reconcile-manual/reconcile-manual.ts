import { ApiBearerAuth, ApiResponse, ApiTags } from '@nestjs/swagger';
import {
  Body,
  Controller,
  ForbiddenException,
  Inject,
  Post,
  Req,
  UnauthorizedException,
  UseGuards
} from '@nestjs/common';
import { CommandBus, CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Request } from 'express';
import { DataSource } from 'typeorm';
import { JwtGuard } from 'building-blocks/passport/jwt.guard';
import {
  ManualReconcilePaymentRequestDto,
  ManualReconcilePaymentResponseDto,
  ManualReconcileResult,
  PaymentStatus,
  PaymentSucceeded
} from 'building-blocks/contracts/payment.contract';
import { prepareOutboxMessage } from 'building-blocks/rabbitmq/outbox-message';
import { Role } from 'building-blocks/contracts/identity.contract';
import { IPaymentRepository } from '@/payment/repositories/payment.repository';
import { toPaymentDto } from '@/payment/utils/payment.mapper';
import { extractPaymentCode } from '@/payment/utils/payment-code';
import { PaymentAttempt } from '@/payment/entities/payment-attempt.entity';
import { FakePaymentScenario } from '@/payment/enums/fake-payment-scenario.enum';
import { PaymentIntent } from '@/payment/entities/payment-intent.entity';
import { OutboxMessage } from '@/payment/entities/outbox-message.entity';
import { RateLimitPolicy } from 'building-blocks/rate-limit/rate-limit.decorator';

type JwtRequest = Request & {
  user?: {
    userId?: number | string;
    role?: number | string;
  };
};

export class ManualReconcilePayment {
  providerTxnId: string;
  transferContent: string;
  transferredAmount: number;
  transferredAt: Date;
  currentUserId: number;
  isAdmin = false;

  constructor(partial: Partial<ManualReconcilePayment> = {}) {
    Object.assign(this, partial);
  }
}

@ApiBearerAuth()
@ApiTags('Payments')
@Controller({
  path: '/payment',
  version: '1'
})
export class ManualReconcilePaymentController {
  constructor(private readonly commandBus: CommandBus) {}

  @Post('reconcile-manual')
  @UseGuards(JwtGuard)
  @RateLimitPolicy('payment.reconcile_admin')
  @ApiResponse({ status: 200, description: 'OK' })
  public async reconcileManual(
    @Body() request: ManualReconcilePaymentRequestDto,
    @Req() httpRequest: JwtRequest
  ): Promise<ManualReconcilePaymentResponseDto> {
    const currentUserId = Number(httpRequest.user?.userId);
    const isAdmin = Number(httpRequest.user?.role) === Role.ADMIN;

    if (!Number.isInteger(currentUserId) || currentUserId <= 0) {
      throw new UnauthorizedException('Invalid token payload');
    }

    if (!isAdmin) {
      throw new ForbiddenException('Only admins can reconcile payments');
    }

    return await this.commandBus.execute(
      new ManualReconcilePayment({
        ...request,
        currentUserId,
        isAdmin
      })
    );
  }
}

@CommandHandler(ManualReconcilePayment)
export class ManualReconcilePaymentHandler implements ICommandHandler<ManualReconcilePayment> {
  constructor(
    @Inject('IPaymentRepository') private readonly paymentRepository: IPaymentRepository,
    private readonly dataSource: DataSource
  ) {}

  async execute(command: ManualReconcilePayment): Promise<ManualReconcilePaymentResponseDto> {
    const providerTxnId = command.providerTxnId.trim();
    const existingByProviderTxnId = await this.paymentRepository.findPaymentByProviderTxnId(providerTxnId);

    if (existingByProviderTxnId) {
      return new ManualReconcilePaymentResponseDto({
        result: ManualReconcileResult.ALREADY_CREDITED,
        payment: toPaymentDto(existingByProviderTxnId)
      });
    }

    const paymentCode = extractPaymentCode(command.transferContent);
    if (!paymentCode) {
      return new ManualReconcilePaymentResponseDto({
        result: ManualReconcileResult.REJECTED_NOT_FOUND
      });
    }

    const payment = await this.paymentRepository.findPaymentByCode(paymentCode);
    if (!payment) {
      return new ManualReconcilePaymentResponseDto({
        result: ManualReconcileResult.REJECTED_NOT_FOUND
      });
    }

    if (payment.paymentStatus === PaymentStatus.SUCCEEDED || !!payment.providerTxnId) {
      return new ManualReconcilePaymentResponseDto({
        result: ManualReconcileResult.ALREADY_CREDITED,
        payment: toPaymentDto(payment)
      });
    }

    const transferredAt = new Date(command.transferredAt);
    const isExpired = transferredAt.getTime() > new Date(payment.expiresAt).getTime();
    if (isExpired || payment.paymentStatus === PaymentStatus.EXPIRED) {
      return new ManualReconcilePaymentResponseDto({
        result: ManualReconcileResult.REJECTED_EXPIRED,
        payment: toPaymentDto(payment)
      });
    }

    if (!this.isExactAmount(payment.amount, command.transferredAmount)) {
      return new ManualReconcilePaymentResponseDto({
        result: ManualReconcileResult.REJECTED_AMOUNT_MISMATCH,
        payment: toPaymentDto(payment)
      });
    }

    const now = new Date();
    const updatedPayment = await this.dataSource.transaction(async (manager) => {
      const paymentRepository = manager.getRepository(PaymentIntent);
      const outboxRepository = manager.getRepository(OutboxMessage);
      const lockedPayment = await paymentRepository
        .createQueryBuilder('payment')
        .setLock('pessimistic_write')
        .where('payment.id = :id', { id: payment.id })
        .getOne();

      if (!lockedPayment) {
        throw new ForbiddenException('Payment no longer available for reconciliation');
      }

      if (lockedPayment.paymentStatus === PaymentStatus.SUCCEEDED || !!lockedPayment.providerTxnId) {
        return lockedPayment;
      }

      await manager.getRepository(PaymentAttempt).save(
        new PaymentAttempt({
          paymentId: lockedPayment.id,
          scenario: FakePaymentScenario.SUCCESS,
          paymentStatus: PaymentStatus.SUCCEEDED
        })
      );

      lockedPayment.paymentStatus = PaymentStatus.SUCCEEDED;
      lockedPayment.completedAt = transferredAt;
      lockedPayment.providerTxnId = providerTxnId;
      lockedPayment.providerTransferContent = command.transferContent.trim();
      lockedPayment.providerTransferredAmount = Number(command.transferredAmount);
      lockedPayment.reconciledAt = now;
      lockedPayment.reconciledBy = command.currentUserId;
      lockedPayment.updatedAt = now;

      const savedPayment = await paymentRepository.save(lockedPayment);

      await outboxRepository.insert(
        prepareOutboxMessage(
          new PaymentSucceeded({
            paymentId: savedPayment.id,
            bookingId: savedPayment.bookingId,
            userId: savedPayment.userId,
            amount: savedPayment.amount,
            currency: savedPayment.currency,
            occurredAt: transferredAt
          }),
          {
            occurredAt: transferredAt
          }
        )
      );

      return savedPayment;
    });

    return new ManualReconcilePaymentResponseDto({
      result: ManualReconcileResult.CREDITED,
      payment: toPaymentDto(updatedPayment)
    });
  }

  private isExactAmount(expectedAmount: number, transferredAmount: number): boolean {
    return Math.abs(Number(expectedAmount) - Number(transferredAmount)) < 0.0001;
  }
}
