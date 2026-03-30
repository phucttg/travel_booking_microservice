import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSeatHoldStateMachine1763035000000 implements MigrationInterface {
  name = 'AddSeatHoldStateMachine1763035000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "seat" ADD "seatState" integer NOT NULL DEFAULT 0`);
    await queryRunner.query(`ALTER TABLE "seat" ADD "holdToken" character varying`);
    await queryRunner.query(`ALTER TABLE "seat" ADD "holdExpiresAt" TIMESTAMP`);
    await queryRunner.query(`ALTER TABLE "seat" ADD "heldAt" TIMESTAMP`);
    await queryRunner.query(`ALTER TABLE "seat" ADD "reservedBookingId" integer`);
    await queryRunner.query(`UPDATE "seat" SET "seatState" = CASE WHEN "isReserved" = true THEN 2 ELSE 0 END`);
    await queryRunner.query(
      `CREATE INDEX "IDX_seat_state_hold_expires_at" ON "seat" ("seatState", "holdExpiresAt")`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_seat_state_hold_expires_at"`);
    await queryRunner.query(`ALTER TABLE "seat" DROP COLUMN "reservedBookingId"`);
    await queryRunner.query(`ALTER TABLE "seat" DROP COLUMN "heldAt"`);
    await queryRunner.query(`ALTER TABLE "seat" DROP COLUMN "holdExpiresAt"`);
    await queryRunner.query(`ALTER TABLE "seat" DROP COLUMN "holdToken"`);
    await queryRunner.query(`ALTER TABLE "seat" DROP COLUMN "seatState"`);
  }
}
