import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBookingSeatHoldTracking1763036000000 implements MigrationInterface {
  name = 'AddBookingSeatHoldTracking1763036000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "booking" ADD "seatHoldToken" character varying`);
    await queryRunner.query(`ALTER TABLE "booking" ADD "seatHoldExpiresAt" TIMESTAMP`);
    await queryRunner.query(`ALTER TABLE "booking" ADD "seatCommitRequestedAt" TIMESTAMP`);
    await queryRunner.query(`ALTER TABLE "booking" ADD "seatCommittedAt" TIMESTAMP`);
    await queryRunner.query(
      `CREATE INDEX "IDX_booking_pending_seat_hold_expires_at" ON "booking" ("seatHoldExpiresAt") WHERE "bookingStatus" = 0 AND "seatHoldExpiresAt" IS NOT NULL`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_booking_confirmed_seat_committed_at" ON "booking" ("seatCommittedAt") WHERE "bookingStatus" = 1`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_booking_confirmed_seat_committed_at"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_booking_pending_seat_hold_expires_at"`);
    await queryRunner.query(`ALTER TABLE "booking" DROP COLUMN "seatCommittedAt"`);
    await queryRunner.query(`ALTER TABLE "booking" DROP COLUMN "seatCommitRequestedAt"`);
    await queryRunner.query(`ALTER TABLE "booking" DROP COLUMN "seatHoldExpiresAt"`);
    await queryRunner.query(`ALTER TABLE "booking" DROP COLUMN "seatHoldToken"`);
  }
}
