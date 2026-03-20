import { IsEnum, IsOptional } from 'class-validator';
import { WalletTopupRequestStatus } from '@/payment/enums/wallet-topup-request-status.enum';

export class WalletTopupRequestsQueryDto {
  @IsOptional()
  @IsEnum(WalletTopupRequestStatus)
  status?: WalletTopupRequestStatus;

  constructor(partial: Partial<WalletTopupRequestsQueryDto> = {}) {
    Object.assign(this, partial);
  }
}
