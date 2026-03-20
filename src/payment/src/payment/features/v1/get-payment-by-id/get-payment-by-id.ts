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
import { PaymentIdQueryDto } from '@/payment/dtos/payment-id-query.dto';

type JwtRequest = Request & {
  user?: {
    userId?: number | string;
    role?: number | string;
  };
};

export class GetPaymentById {
  id: number;
  currentUserId: number;
  isAdmin = false;

  constructor(partial: Partial<GetPaymentById> = {}) {
    Object.assign(this, partial);
  }
}

@ApiBearerAuth()
@ApiTags('Payments')
@Controller({
  path: '/payment',
  version: '1'
})
export class GetPaymentByIdController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get('get-by-id')
  @UseGuards(JwtGuard)
  @ApiResponse({ status: 200, description: 'OK' })
  public async getPaymentById(@Query() query: PaymentIdQueryDto, @Req() request: JwtRequest): Promise<PaymentDto> {
    const currentUserId = Number(request.user?.userId);

    if (!Number.isInteger(currentUserId) || currentUserId <= 0) {
      throw new UnauthorizedException('Invalid token payload');
    }

    return await this.queryBus.execute(
      new GetPaymentById({
        id: query.id,
        currentUserId,
        isAdmin: Number(request.user?.role) === Role.ADMIN
      })
    );
  }
}

@QueryHandler(GetPaymentById)
export class GetPaymentByIdHandler implements IQueryHandler<GetPaymentById> {
  constructor(@Inject('IPaymentRepository') private readonly paymentRepository: IPaymentRepository) {}

  async execute(query: GetPaymentById): Promise<PaymentDto> {
    const payment = await this.paymentRepository.findPaymentById(query.id);

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    if (!query.isAdmin && payment.userId !== query.currentUserId) {
      throw new ForbiddenException('You do not have access to this payment');
    }

    return toPaymentDto(payment);
  }
}
