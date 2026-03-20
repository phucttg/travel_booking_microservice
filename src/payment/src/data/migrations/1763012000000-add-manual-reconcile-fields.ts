import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddManualReconcileFields1763012000000 implements MigrationInterface {
  name = 'AddManualReconcileFields1763012000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "payment_intent" ADD "paymentCode" character varying`);
    await queryRunner.query(`UPDATE "payment_intent" SET "paymentCode" = 'TBK-' || "bookingId" WHERE "paymentCode" IS NULL`);
    await queryRunner.query(`ALTER TABLE "payment_intent" ALTER COLUMN "paymentCode" SET NOT NULL`);
    await queryRunner.query(
      `ALTER TABLE "payment_intent" ADD CONSTRAINT "UQ_payment_intent_payment_code" UNIQUE ("paymentCode")`
    );

    await queryRunner.query(`ALTER TABLE "payment_intent" ADD "providerTxnId" character varying`);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_payment_intent_provider_txn_id" ON "payment_intent" ("providerTxnId") WHERE "providerTxnId" IS NOT NULL`
    );

    await queryRunner.query(`ALTER TABLE "payment_intent" ADD "reconciledAt" TIMESTAMP`);
    await queryRunner.query(`ALTER TABLE "payment_intent" ADD "reconciledBy" integer`);
    await queryRunner.query(`ALTER TABLE "payment_intent" ADD "providerTransferContent" character varying(500)`);
    await queryRunner.query(`ALTER TABLE "payment_intent" ADD "providerTransferredAmount" double precision`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "payment_intent" DROP COLUMN "providerTransferredAmount"`);
    await queryRunner.query(`ALTER TABLE "payment_intent" DROP COLUMN "providerTransferContent"`);
    await queryRunner.query(`ALTER TABLE "payment_intent" DROP COLUMN "reconciledBy"`);
    await queryRunner.query(`ALTER TABLE "payment_intent" DROP COLUMN "reconciledAt"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_payment_intent_provider_txn_id"`);
    await queryRunner.query(`ALTER TABLE "payment_intent" DROP COLUMN "providerTxnId"`);
    await queryRunner.query(`ALTER TABLE "payment_intent" DROP CONSTRAINT "UQ_payment_intent_payment_code"`);
    await queryRunner.query(`ALTER TABLE "payment_intent" DROP COLUMN "paymentCode"`);
  }
}
