import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'wallet' })
export class Wallet {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  userId: number;

  @Column({ type: 'integer', default: 0 })
  balance: number;

  @Column({ length: 3, default: 'VND' })
  currency: string;

  @Column()
  createdAt: Date;

  @Column({ nullable: true })
  updatedAt?: Date | null;

  constructor(partial: Partial<Wallet> = {}) {
    Object.assign(this, partial);
    this.createdAt = partial.createdAt ?? new Date();
  }
}
