import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBookingOutbox1763024000000 implements MigrationInterface {
  name = 'AddBookingOutbox1763024000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "booking_outbox_message" ("id" SERIAL NOT NULL, "exchangeName" character varying NOT NULL, "payload" text NOT NULL, "messageId" character varying NOT NULL, "traceId" character varying NOT NULL, "idempotencyKey" character varying NOT NULL, "producer" character varying NOT NULL, "occurredAt" TIMESTAMP NOT NULL, "useEnvelope" boolean NOT NULL DEFAULT true, "attempts" integer NOT NULL DEFAULT '0', "nextAttemptAt" TIMESTAMP NOT NULL, "lastError" text, "deliveredAt" TIMESTAMP, "createdAt" TIMESTAMP NOT NULL, "updatedAt" TIMESTAMP, CONSTRAINT "UQ_booking_outbox_message_message_id" UNIQUE ("messageId"), CONSTRAINT "PK_booking_outbox_message_id" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_booking_outbox_pending" ON "booking_outbox_message" ("nextAttemptAt") WHERE "deliveredAt" IS NULL`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_booking_outbox_pending"`);
    await queryRunner.query(`DROP TABLE "booking_outbox_message"`);
  }
}
