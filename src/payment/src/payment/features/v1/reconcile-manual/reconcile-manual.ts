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
import { JwtGuard } from 'building-blocks/passport/jwt.guard';
import {
  ManualReconcilePaymentRequestDto,
  ManualReconcilePaymentResponseDto,
  ManualReconcileResult,
  PaymentStatus,
  PaymentSucceeded
} from 'building-blocks/contracts/payment.contract';
import { Role } from 'building-blocks/contracts/identity.contract';
import { IPaymentRepository } from '@/payment/repositories/payment.repository';
import { toPaymentDto } from '@/payment/utils/payment.mapper';
import { extractPaymentCode } from '@/payment/utils/payment-code';
import { IRabbitmqPublisher } from 'building-blocks/rabbitmq/rabbitmq-publisher';
import { PaymentAttempt } from '@/payment/entities/payment-attempt.entity';
import { FakePaymentScenario } from '@/payment/enums/fake-payment-scenario.enum';

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
    @Inject('IRabbitmqPublisher') private readonly rabbitmqPublisher: IRabbitmqPublisher
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
    await this.paymentRepository.createAttempt(
      new PaymentAttempt({
        paymentId: payment.id,
        scenario: FakePaymentScenario.SUCCESS,
        paymentStatus: PaymentStatus.SUCCEEDED
      })
    );

    payment.paymentStatus = PaymentStatus.SUCCEEDED;
    payment.completedAt = transferredAt;
    payment.providerTxnId = providerTxnId;
    payment.providerTransferContent = command.transferContent.trim();
    payment.providerTransferredAmount = Number(command.transferredAmount);
    payment.reconciledAt = now;
    payment.reconciledBy = command.currentUserId;
    payment.updatedAt = now;

    const updatedPayment = await this.paymentRepository.updatePaymentIntent(payment);
    await this.rabbitmqPublisher.publishMessage(
      new PaymentSucceeded({
        paymentId: updatedPayment.id,
        bookingId: updatedPayment.bookingId,
        userId: updatedPayment.userId,
        amount: updatedPayment.amount,
        currency: updatedPayment.currency,
        occurredAt: transferredAt
      })
    );

    return new ManualReconcilePaymentResponseDto({
      result: ManualReconcileResult.CREDITED,
      payment: toPaymentDto(updatedPayment)
    });
  }

  private isExactAmount(expectedAmount: number, transferredAmount: number): boolean {
    return Math.abs(Number(expectedAmount) - Number(transferredAmount)) < 0.0001;
  }
}
