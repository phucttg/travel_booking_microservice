import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { WalletTopupRequestStatus } from '@/payment/enums/wallet-topup-request-status.enum';

@Entity({ name: 'wallet_topup_request' })
export class WalletTopupRequest {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @Column({ type: 'integer' })
  amount: number;

  @Column({ length: 3, default: 'VND' })
  currency: string;

  @Column({ length: 500 })
  transferContent: string;

  @Column({ length: 120, unique: true })
  providerTxnId: string;

  @Column({
    type: 'enum',
    enum: WalletTopupRequestStatus,
    default: WalletTopupRequestStatus.PENDING
  })
  status: WalletTopupRequestStatus;

  @Column({ nullable: true, length: 500 })
  rejectionReason?: string | null;

  @Column({ nullable: true })
  reviewedBy?: number | null;

  @Column({ nullable: true })
  reviewedAt?: Date | null;

  @Column()
  createdAt: Date;

  @Column({ nullable: true })
  updatedAt?: Date | null;

  constructor(partial: Partial<WalletTopupRequest> = {}) {
    Object.assign(this, partial);
    this.createdAt = partial.createdAt ?? new Date();
  }
}
