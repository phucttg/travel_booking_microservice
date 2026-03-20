import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePaymentTables1763004000000 implements MigrationInterface {
  name = 'CreatePaymentTables1763004000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TYPE "public"."payment_intent_paymentstatus_enum" AS ENUM('0', '1', '2', '3', '4')`);
    await queryRunner.query(`CREATE TYPE "public"."payment_intent_refundstatus_enum" AS ENUM('0', '1', '2', '3')`);
    await queryRunner.query(`CREATE TYPE "public"."payment_attempt_scenario_enum" AS ENUM('SUCCESS', 'DECLINE', 'TIMEOUT')`);
    await queryRunner.query(`CREATE TYPE "public"."payment_attempt_paymentstatus_enum" AS ENUM('0', '1', '2', '3', '4')`);
    await queryRunner.query(`CREATE TYPE "public"."refund_refundstatus_enum" AS ENUM('0', '1', '2', '3')`);
    await queryRunner.query(
      `CREATE TABLE "payment_intent" ("id" SERIAL NOT NULL, "bookingId" integer NOT NULL, "userId" integer NOT NULL, "amount" double precision NOT NULL, "currency" character varying(3) NOT NULL, "paymentStatus" "public"."payment_intent_paymentstatus_enum" NOT NULL DEFAULT '0', "refundStatus" "public"."payment_intent_refundstatus_enum" NOT NULL DEFAULT '0', "expiresAt" TIMESTAMP NOT NULL, "completedAt" TIMESTAMP, "refundedAt" TIMESTAMP, "createdAt" TIMESTAMP NOT NULL, "updatedAt" TIMESTAMP, CONSTRAINT "UQ_payment_intent_booking_id" UNIQUE ("bookingId"), CONSTRAINT "PK_payment_intent_id" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `CREATE TABLE "payment_attempt" ("id" SERIAL NOT NULL, "paymentId" integer NOT NULL, "scenario" "public"."payment_attempt_scenario_enum" NOT NULL, "paymentStatus" "public"."payment_attempt_paymentstatus_enum" NOT NULL, "createdAt" TIMESTAMP NOT NULL, "updatedAt" TIMESTAMP, CONSTRAINT "PK_payment_attempt_id" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `CREATE TABLE "refund" ("id" SERIAL NOT NULL, "paymentId" integer NOT NULL, "amount" double precision NOT NULL, "currency" character varying(3) NOT NULL, "refundStatus" "public"."refund_refundstatus_enum" NOT NULL, "createdAt" TIMESTAMP NOT NULL, "updatedAt" TIMESTAMP, "completedAt" TIMESTAMP, CONSTRAINT "PK_refund_id" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `CREATE TABLE "payment_idempotency_record" ("id" SERIAL NOT NULL, "scope" character varying NOT NULL, "idempotencyKey" character varying NOT NULL, "requestHash" character varying NOT NULL, "userId" integer, "responseBody" text NOT NULL, "statusCode" integer NOT NULL, "createdAt" TIMESTAMP NOT NULL, "updatedAt" TIMESTAMP, CONSTRAINT "PK_payment_idempotency_record_id" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_payment_idempotency_scope_key" ON "payment_idempotency_record" ("scope", "idempotencyKey")`
    );
    await queryRunner.query(
      `CREATE TABLE "payment_processed_message" ("id" SERIAL NOT NULL, "consumer" character varying NOT NULL, "messageKey" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL, CONSTRAINT "PK_payment_processed_message_id" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_payment_processed_message_consumer_key" ON "payment_processed_message" ("consumer", "messageKey")`
    );
    await queryRunner.query(
      `ALTER TABLE "payment_attempt" ADD CONSTRAINT "FK_payment_attempt_payment" FOREIGN KEY ("paymentId") REFERENCES "payment_intent"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "refund" ADD CONSTRAINT "FK_refund_payment" FOREIGN KEY ("paymentId") REFERENCES "payment_intent"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "refund" DROP CONSTRAINT "FK_refund_payment"`);
    await queryRunner.query(`ALTER TABLE "payment_attempt" DROP CONSTRAINT "FK_payment_attempt_payment"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_payment_processed_message_consumer_key"`);
    await queryRunner.query(`DROP TABLE "payment_processed_message"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_payment_idempotency_scope_key"`);
    await queryRunner.query(`DROP TABLE "payment_idempotency_record"`);
    await queryRunner.query(`DROP TABLE "refund"`);
    await queryRunner.query(`DROP TABLE "payment_attempt"`);
    await queryRunner.query(`DROP TABLE "payment_intent"`);
    await queryRunner.query(`DROP TYPE "public"."refund_refundstatus_enum"`);
    await queryRunner.query(`DROP TYPE "public"."payment_attempt_paymentstatus_enum"`);
    await queryRunner.query(`DROP TYPE "public"."payment_attempt_scenario_enum"`);
    await queryRunner.query(`DROP TYPE "public"."payment_intent_refundstatus_enum"`);
    await queryRunner.query(`DROP TYPE "public"."payment_intent_paymentstatus_enum"`);
  }
}
