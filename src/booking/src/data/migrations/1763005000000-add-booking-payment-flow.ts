import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBookingPaymentFlow1763005000000 implements MigrationInterface {
  name = 'AddBookingPaymentFlow1763005000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "booking" ADD "currency" character varying NOT NULL DEFAULT 'VND'`);
    await queryRunner.query(`ALTER TABLE "booking" ADD "seatClass" integer NOT NULL DEFAULT 0`);
    await queryRunner.query(`ALTER TABLE "booking" ADD "paymentId" integer`);
    await queryRunner.query(`ALTER TABLE "booking" ADD "paymentExpiresAt" TIMESTAMP`);
    await queryRunner.query(`ALTER TABLE "booking" ADD "confirmedAt" TIMESTAMP`);
    await queryRunner.query(`ALTER TABLE "booking" ADD "expiredAt" TIMESTAMP`);
    await queryRunner.query(`ALTER TABLE "booking" ADD "bookingStatus_v2" integer NOT NULL DEFAULT 0`);
    await queryRunner.query(
      `UPDATE "booking" SET "bookingStatus_v2" = CASE "bookingStatus"::text WHEN '0' THEN 1 WHEN '1' THEN 3 ELSE 0 END`
    );
    await queryRunner.query(
      `UPDATE "booking" SET "confirmedAt" = "createdAt" WHERE "bookingStatus_v2" = 1 AND "confirmedAt" IS NULL`
    );
    await queryRunner.query(`ALTER TABLE "booking" DROP COLUMN "bookingStatus"`);
    await queryRunner.query(`DROP TYPE "public"."booking_bookingstatus_enum"`);
    await queryRunner.query(`ALTER TABLE "booking" RENAME COLUMN "bookingStatus_v2" TO "bookingStatus"`);
    await queryRunner.query(`CREATE UNIQUE INDEX "IDX_booking_payment_id" ON "booking" ("paymentId") WHERE "paymentId" IS NOT NULL`);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_booking_active_user_flight" ON "booking" ("userId", "flightId") WHERE "userId" IS NOT NULL AND "flightId" IS NOT NULL AND "bookingStatus" IN (0, 1)`
    );

    await queryRunner.query(
      `CREATE TABLE "booking_idempotency_record" ("id" SERIAL NOT NULL, "scope" character varying NOT NULL, "idempotencyKey" character varying NOT NULL, "requestHash" character varying NOT NULL, "userId" integer, "responseBody" text NOT NULL, "statusCode" integer NOT NULL, "createdAt" TIMESTAMP NOT NULL, "updatedAt" TIMESTAMP, CONSTRAINT "PK_booking_idempotency_record_id" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_booking_idempotency_scope_key" ON "booking_idempotency_record" ("scope", "idempotencyKey")`
    );
    await queryRunner.query(
      `CREATE TABLE "booking_processed_message" ("id" SERIAL NOT NULL, "consumer" character varying NOT NULL, "messageKey" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL, CONSTRAINT "PK_booking_processed_message_id" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_booking_processed_message_consumer_key" ON "booking_processed_message" ("consumer", "messageKey")`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_booking_processed_message_consumer_key"`);
    await queryRunner.query(`DROP TABLE "booking_processed_message"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_booking_idempotency_scope_key"`);
    await queryRunner.query(`DROP TABLE "booking_idempotency_record"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_booking_active_user_flight"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_booking_payment_id"`);
    await queryRunner.query(`ALTER TABLE "booking" RENAME COLUMN "bookingStatus" TO "bookingStatus_v2"`);
    await queryRunner.query(`CREATE TYPE "public"."booking_bookingstatus_enum" AS ENUM('0', '1')`);
    await queryRunner.query(`ALTER TABLE "booking" ADD "bookingStatus" "public"."booking_bookingstatus_enum" NOT NULL DEFAULT '0'`);
    await queryRunner.query(
      `UPDATE "booking" SET "bookingStatus" = CASE "bookingStatus_v2" WHEN 1 THEN '0' WHEN 3 THEN '1' ELSE '0' END`
    );
    await queryRunner.query(`ALTER TABLE "booking" DROP COLUMN "bookingStatus_v2"`);
    await queryRunner.query(`ALTER TABLE "booking" DROP COLUMN "expiredAt"`);
    await queryRunner.query(`ALTER TABLE "booking" DROP COLUMN "confirmedAt"`);
    await queryRunner.query(`ALTER TABLE "booking" DROP COLUMN "paymentExpiresAt"`);
    await queryRunner.query(`ALTER TABLE "booking" DROP COLUMN "paymentId"`);
    await queryRunner.query(`ALTER TABLE "booking" DROP COLUMN "seatClass"`);
    await queryRunner.query(`ALTER TABLE "booking" DROP COLUMN "currency"`);
  }
}
