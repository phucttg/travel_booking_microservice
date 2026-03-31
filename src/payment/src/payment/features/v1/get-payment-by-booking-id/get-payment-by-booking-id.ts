import { ApiBearerAuth, ApiResponse, ApiTags } from '@nestjs/swagger';
import {
  Controller,
  ForbiddenException,
  Get,
  Inject,
  NotFoundException,
  Query,
  Req,
  UnauthorizedException,
  UseGuards
} from '@nestjs/common';
import { IQueryHandler, QueryBus, QueryHandler } from '@nestjs/cqrs';
import { Request } from 'express';
import { JwtGuard } from 'building-blocks/passport/jwt.guard';
import { PaymentDto } from 'building-blocks/contracts/payment.contract';
import { Role } from 'building-blocks/contracts/identity.contract';
import { IPaymentRepository } from '@/payment/repositories/payment.repository';
import { toPaymentDto } from '@/payment/utils/payment.mapper';
import { PaymentBookingIdQueryDto } from '@/payment/dtos/payment-booking-id-query.dto';
import { RateLimitPolicy } from 'building-blocks/rate-limit/rate-limit.decorator';

type JwtRequest = Request & {
  user?: {
    userId?: number | string;
    role?: number | string;
  };
};

export class GetPaymentByBookingId {
  bookingId: number;
  currentUserId: number;
  isAdmin = false;

  constructor(partial: Partial<GetPaymentByBookingId> = {}) {
    Object.assign(this, partial);
  }
}

@ApiBearerAuth()
@ApiTags('Payments')
@Controller({
  path: '/payment',
  version: '1'
})
export class GetPaymentByBookingIdController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get('get-by-booking-id')
  @UseGuards(JwtGuard)
  @RateLimitPolicy('read.authenticated.default')
  @ApiResponse({ status: 200, description: 'OK' })
  public async getPaymentByBookingId(
    @Query() query: PaymentBookingIdQueryDto,
    @Req() request: JwtRequest
  ): Promise<PaymentDto> {
    const currentUserId = Number(request.user?.userId);

    if (!Number.isInteger(currentUserId) || currentUserId <= 0) {
      throw new UnauthorizedException('Invalid token payload');
    }

    return await this.queryBus.execute(
      new GetPaymentByBookingId({
        bookingId: query.bookingId,
        currentUserId,
        isAdmin: Number(request.user?.role) === Role.ADMIN
      })
    );
  }
}

@QueryHandler(GetPaymentByBookingId)
export class GetPaymentByBookingIdHandler implements IQueryHandler<GetPaymentByBookingId> {
  constructor(@Inject('IPaymentRepository') private readonly paymentRepository: IPaymentRepository) {}

  async execute(query: GetPaymentByBookingId): Promise<PaymentDto> {
    const payment = await this.paymentRepository.findPaymentByBookingId(query.bookingId);

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    if (!query.isAdmin && payment.userId !== query.currentUserId) {
      throw new ForbiddenException('You do not have access to this payment');
    }

    return toPaymentDto(payment);
  }
}
