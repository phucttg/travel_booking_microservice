import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { WalletLedgerType } from '@/payment/enums/wallet-ledger-type.enum';
import { WalletLedgerReferenceType } from '@/payment/enums/wallet-ledger-reference-type.enum';

@Entity({ name: 'wallet_ledger' })
export class WalletLedger {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @Column({
    type: 'enum',
    enum: WalletLedgerType
  })
  type: WalletLedgerType;

  @Column({ type: 'integer' })
  amount: number;

  @Column({ length: 3, default: 'VND' })
  currency: string;

  @Column({ type: 'integer' })
  balanceBefore: number;

  @Column({ type: 'integer' })
  balanceAfter: number;

  @Column({
    type: 'enum',
    enum: WalletLedgerReferenceType
  })
  referenceType: WalletLedgerReferenceType;

  @Column()
  referenceId: number;

  @Column()
  createdAt: Date;

  @Column({ nullable: true })
  updatedAt?: Date | null;

  constructor(partial: Partial<WalletLedger> = {}) {
    Object.assign(this, partial);
    this.createdAt = partial.createdAt ?? new Date();
  }
}
