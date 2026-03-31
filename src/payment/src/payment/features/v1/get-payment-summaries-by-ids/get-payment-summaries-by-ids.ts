import { ApiBearerAuth, ApiBody, ApiResponse, ApiTags } from '@nestjs/swagger';
import { BadRequestException, Body, Controller, Inject, Post, Req, UnauthorizedException, UseGuards } from '@nestjs/common';
import { IQueryHandler, QueryBus, QueryHandler } from '@nestjs/cqrs';
import { Request } from 'express';
import { JwtGuard } from 'building-blocks/passport/jwt.guard';
import { PaymentSummaryDto } from 'building-blocks/contracts/payment.contract';
import { Role } from 'building-blocks/contracts/identity.contract';
import { PaymentIdsRequestDto } from '@/payment/dtos/payment-ids-request.dto';
import { IPaymentRepository } from '@/payment/repositories/payment.repository';
import { toPaymentSummaryDto } from '@/payment/utils/payment.mapper';
import { RateLimitPolicy } from 'building-blocks/rate-limit/rate-limit.decorator';

type JwtRequest = Request & {
  user?: {
    userId?: number | string;
    role?: number | string;
  };
};

export class GetPaymentSummariesByIds {
  ids: number[] = [];
  currentUserId: number;
  isAdmin = false;

  constructor(partial: Partial<GetPaymentSummariesByIds> = {}) {
    Object.assign(this, partial);
  }
}

@ApiBearerAuth()
@ApiTags('Payments')
@Controller({
  path: '/payment',
  version: '1'
})
export class GetPaymentSummariesByIdsController {
  constructor(private readonly queryBus: QueryBus) {}

  @Post('get-summaries-by-ids')
  @UseGuards(JwtGuard)
  @RateLimitPolicy('read.authenticated.default')
  @ApiBody({ type: PaymentIdsRequestDto })
  @ApiResponse({ status: 200, description: 'OK' })
  public async getPaymentSummariesByIds(
    @Body() request: PaymentIdsRequestDto,
    @Req() rawRequest: JwtRequest
  ): Promise<PaymentSummaryDto[]> {
    const currentUserId = Number(rawRequest.user?.userId);

    if (!Number.isInteger(currentUserId) || currentUserId <= 0) {
      throw new UnauthorizedException('Invalid token payload');
    }

    return await this.queryBus.execute(
      new GetPaymentSummariesByIds({
        ids: request.ids || [],
        currentUserId,
        isAdmin: Number(rawRequest.user?.role) === Role.ADMIN
      })
    );
  }
}

@QueryHandler(GetPaymentSummariesByIds)
export class GetPaymentSummariesByIdsHandler implements IQueryHandler<GetPaymentSummariesByIds> {
  constructor(@Inject('IPaymentRepository') private readonly paymentRepository: IPaymentRepository) {}

  async execute(query: GetPaymentSummariesByIds): Promise<PaymentSummaryDto[]> {
    const uniqueIds = [...new Set((query.ids || []).filter((id) => Number.isInteger(id) && id > 0))];

    if (!uniqueIds.length) {
      return [];
    }

    if (uniqueIds.length > 100) {
      throw new BadRequestException('Maximum 100 ids are allowed');
    }

    const payments = await this.paymentRepository.findPaymentSummariesByIds(
      uniqueIds,
      query.isAdmin ? undefined : query.currentUserId
    );
    const summaryById = new Map(payments.map((payment) => [payment.id, toPaymentSummaryDto(payment)]));

    return uniqueIds
      .map((id) => summaryById.get(id))
      .filter((summary): summary is PaymentSummaryDto => Boolean(summary));
  }
}
