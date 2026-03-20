import { ApiBearerAuth, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Body, Controller, HttpStatus, Inject, Post, Res, UseGuards } from '@nestjs/common';
import { CommandBus, CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Response } from 'express';
import { JwtGuard } from 'building-blocks/passport/jwt.guard';
import {
  CreatePaymentIntentRequestDto,
  PaymentDto,
  PaymentStatus,
  RefundStatus
} from 'building-blocks/contracts/payment.contract';
import { IPaymentRepository } from '@/payment/repositories/payment.repository';
import { PaymentIntent } from '@/payment/entities/payment-intent.entity';
import { toPaymentDto } from '@/payment/utils/payment.mapper';
import { createPaymentCode } from '@/payment/utils/payment-code';

export class CreatePaymentIntent {
  bookingId: number;
  userId: number;
  amount: number;
  currency: string;
  expiresAt: Date;

  constructor(partial: Partial<CreatePaymentIntent> = {}) {
    Object.assign(this, partial);
  }
}

@ApiBearerAuth()
@ApiTags('Payments')
@Controller({
  path: '/payment',
  version: '1'
})
export class CreatePaymentIntentController {
  constructor(private readonly commandBus: CommandBus) {}

  @Post('create-intent')
  @UseGuards(JwtGuard)
  @ApiResponse({ status: 201, description: 'CREATED' })
  public async createIntent(
    @Body() request: CreatePaymentIntentRequestDto,
    @Res() response: Response
  ): Promise<PaymentDto> {
    const result = await this.commandBus.execute(new CreatePaymentIntent(request));
    response.status(HttpStatus.CREATED).send(result);
    return result;
  }
}

@CommandHandler(CreatePaymentIntent)
export class CreatePaymentIntentHandler implements ICommandHandler<CreatePaymentIntent> {
  constructor(@Inject('IPaymentRepository') private readonly paymentRepository: IPaymentRepository) {}

  async execute(command: CreatePaymentIntent): Promise<PaymentDto> {
    const existingPayment = await this.paymentRepository.findPaymentByBookingId(command.bookingId);

    if (existingPayment) {
      if (!existingPayment.paymentCode) {
        existingPayment.paymentCode = createPaymentCode(existingPayment.bookingId);
        existingPayment.updatedAt = new Date();
        await this.paymentRepository.updatePaymentIntent(existingPayment);
      }

      return toPaymentDto(existingPayment);
    }

    const createdPayment = await this.paymentRepository.createPaymentIntent(
      new PaymentIntent({
        bookingId: command.bookingId,
        userId: command.userId,
        amount: command.amount,
        currency: command.currency,
        paymentCode: createPaymentCode(command.bookingId),
        paymentStatus: PaymentStatus.PENDING,
        refundStatus: RefundStatus.NONE,
        expiresAt: new Date(command.expiresAt)
      })
    );

    return toPaymentDto(await this.paymentRepository.findPaymentById(createdPayment.id));
  }
}
