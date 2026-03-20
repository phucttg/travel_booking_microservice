import { ApiBearerAuth, ApiResponse, ApiTags } from '@nestjs/swagger';
import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  ForbiddenException,
  HttpStatus,
  Inject,
  Param,
  Patch,
  Req,
  Res,
  UnauthorizedException,
  UseGuards
} from '@nestjs/common';
import { CommandBus, CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Request, Response } from 'express';
import { JwtGuard } from 'building-blocks/passport/jwt.guard';
import {
  ConfirmPaymentRequestDto,
  FakePaymentScenario,
  PaymentDto,
  PaymentFailed,
  PaymentStatus,
  PaymentSucceeded
} from 'building-blocks/contracts/payment.contract';
import { Role } from 'building-blocks/contracts/identity.contract';
import { IPaymentRepository } from '@/payment/repositories/payment.repository';
import { PaymentAttempt } from '@/payment/entities/payment-attempt.entity';
import { toPaymentDto } from '@/payment/utils/payment.mapper';
import { IIdempotencyRepository } from '@/payment/repositories/idempotency.repository';
import { IdempotencyRecord } from '@/payment/entities/idempotency-record.entity';
import { createRequestHash } from '@/payment/utils/request-hash';
import { IRabbitmqPublisher } from 'building-blocks/rabbitmq/rabbitmq-publisher';

type JwtRequest = Request & {
  user?: {
    userId?: number | string;
    role?: number | string;
  };
};

export class ConfirmPayment {
  id: number;
  scenario: FakePaymentScenario;
  currentUserId: number;
  isAdmin = false;
  idempotencyKey: string;

  constructor(partial: Partial<ConfirmPayment> = {}) {
    Object.assign(this, partial);
  }
}

@ApiBearerAuth()
@ApiTags('Payments')
@Controller({
  path: '/payment',
  version: '1'
})
export class ConfirmPaymentController {
  constructor(private readonly commandBus: CommandBus) {}

  @Patch('confirm/:id')
  @UseGuards(JwtGuard)
  @ApiResponse({ status: 200, description: 'OK' })
  public async confirmPayment(
    @Param('id') id: string,
    @Body() request: ConfirmPaymentRequestDto,
    @Req() httpRequest: JwtRequest,
    @Res() response: Response
  ): Promise<PaymentDto> {
    const currentUserId = Number(httpRequest.user?.userId);
    const idempotencyKey = httpRequest.headers['idempotency-key'];
    const isAdmin = Number(httpRequest.user?.role) === Role.ADMIN;

    if (!Number.isInteger(currentUserId) || currentUserId <= 0) {
      throw new UnauthorizedException('Invalid token payload');
    }

    if (!isAdmin) {
      throw new ForbiddenException('Only admins can confirm payments manually');
    }

    if (typeof idempotencyKey !== 'string' || idempotencyKey.trim() === '') {
      throw new BadRequestException('Idempotency-Key header is required');
    }

    const result = await this.commandBus.execute(
      new ConfirmPayment({
        id: Number(id),
        scenario: request.scenario,
        currentUserId,
        isAdmin,
        idempotencyKey
      })
    );

    response.status(HttpStatus.OK).send(result);
    return result;
  }
}

@CommandHandler(ConfirmPayment)
export class ConfirmPaymentHandler implements ICommandHandler<ConfirmPayment> {
  constructor(
    @Inject('IPaymentRepository') private readonly paymentRepository: IPaymentRepository,
    @Inject('IIdempotencyRepository') private readonly idempotencyRepository: IIdempotencyRepository,
    @Inject('IRabbitmqPublisher') private readonly rabbitmqPublisher: IRabbitmqPublisher
  ) {}

  async execute(command: ConfirmPayment): Promise<PaymentDto> {
    const requestHash = createRequestHash({
      paymentId: command.id,
      userId: command.currentUserId,
      scenario: command.scenario
    });
    const idempotencyScope = 'payment-confirm';
    const existingRecord = await this.idempotencyRepository.findByScopeAndKey(
      idempotencyScope,
      command.idempotencyKey
    );

    if (existingRecord) {
      if (existingRecord.requestHash !== requestHash) {
        throw new ConflictException('Idempotency key is already used for another payment request');
      }

      return JSON.parse(existingRecord.responseBody) as PaymentDto;
    }

    const payment = await this.paymentRepository.findPaymentById(command.id);
    if (!payment) {
      throw new BadRequestException('Payment not found');
    }

    if (!command.isAdmin && payment.userId !== command.currentUserId) {
      throw new ForbiddenException('You do not have access to this payment');
    }

    if (payment.paymentStatus === PaymentStatus.PROCESSING) {
      throw new ConflictException('Payment is still processing');
    }

    if (payment.paymentStatus !== PaymentStatus.SUCCEEDED && payment.expiresAt <= new Date()) {
      payment.paymentStatus = PaymentStatus.EXPIRED;
      payment.updatedAt = new Date();
      const expiredPayment = await this.paymentRepository.updatePaymentIntent(payment);
      const expiredDto = toPaymentDto(expiredPayment);

      await this.idempotencyRepository.saveRecord(
        new IdempotencyRecord({
          scope: idempotencyScope,
          idempotencyKey: command.idempotencyKey,
          requestHash,
          userId: command.currentUserId,
          responseBody: JSON.stringify(expiredDto),
          statusCode: HttpStatus.OK
        })
      );

      return expiredDto;
    }

    if (payment.paymentStatus === PaymentStatus.SUCCEEDED || payment.paymentStatus === PaymentStatus.EXPIRED) {
      const currentDto = toPaymentDto(payment);
      await this.idempotencyRepository.saveRecord(
        new IdempotencyRecord({
          scope: idempotencyScope,
          idempotencyKey: command.idempotencyKey,
          requestHash,
          userId: command.currentUserId,
          responseBody: JSON.stringify(currentDto),
          statusCode: HttpStatus.OK
        })
      );

      return currentDto;
    }

    const now = new Date();
    let nextStatus = PaymentStatus.PENDING;

    if (command.scenario === FakePaymentScenario.SUCCESS) {
      nextStatus = PaymentStatus.SUCCEEDED;
      payment.completedAt = now;
    } else if (command.scenario === FakePaymentScenario.DECLINE) {
      nextStatus = PaymentStatus.FAILED;
    } else {
      nextStatus = PaymentStatus.PROCESSING;
    }

    await this.paymentRepository.createAttempt(
      new PaymentAttempt({
        paymentId: payment.id,
        scenario: command.scenario,
        paymentStatus: nextStatus
      })
    );

    payment.paymentStatus = nextStatus;
    payment.updatedAt = now;

    const updatedPayment = await this.paymentRepository.updatePaymentIntent(payment);

    if (nextStatus === PaymentStatus.SUCCEEDED) {
      await this.rabbitmqPublisher.publishMessage(
        new PaymentSucceeded({
          paymentId: updatedPayment.id,
          bookingId: updatedPayment.bookingId,
          userId: updatedPayment.userId,
          amount: updatedPayment.amount,
          currency: updatedPayment.currency,
          occurredAt: now
        })
      );
    }

    if (nextStatus === PaymentStatus.FAILED) {
      await this.rabbitmqPublisher.publishMessage(
        new PaymentFailed({
          paymentId: updatedPayment.id,
          bookingId: updatedPayment.bookingId,
          userId: updatedPayment.userId,
          scenario: command.scenario,
          occurredAt: now
        })
      );
    }

    const result = toPaymentDto(updatedPayment);

    await this.idempotencyRepository.saveRecord(
      new IdempotencyRecord({
        scope: idempotencyScope,
        idempotencyKey: command.idempotencyKey,
        requestHash,
        userId: command.currentUserId,
        responseBody: JSON.stringify(result),
        statusCode: HttpStatus.OK
      })
    );

    return result;
  }
}
