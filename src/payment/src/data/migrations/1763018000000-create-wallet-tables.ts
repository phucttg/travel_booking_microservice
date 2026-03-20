import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateWalletTables1763018000000 implements MigrationInterface {
  name = 'CreateWalletTables1763018000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."wallet_topup_request_status_enum" AS ENUM('PENDING', 'APPROVED', 'REJECTED')`
    );
    await queryRunner.query(
      `CREATE TYPE "public"."wallet_ledger_type_enum" AS ENUM('TOPUP_APPROVED', 'BOOKING_DEBIT', 'BOOKING_REFUND')`
    );
    await queryRunner.query(
      `CREATE TYPE "public"."wallet_ledger_reference_type_enum" AS ENUM('TOPUP_REQUEST', 'BOOKING', 'REFUND')`
    );

    await queryRunner.query(
      `CREATE TABLE "wallet" ("id" SERIAL NOT NULL, "userId" integer NOT NULL, "balance" integer NOT NULL DEFAULT 0, "currency" character varying(3) NOT NULL DEFAULT 'VND', "createdAt" TIMESTAMP NOT NULL, "updatedAt" TIMESTAMP, CONSTRAINT "UQ_wallet_user_id" UNIQUE ("userId"), CONSTRAINT "PK_wallet_id" PRIMARY KEY ("id"))`
    );

    await queryRunner.query(
      `CREATE TABLE "wallet_topup_request" ("id" SERIAL NOT NULL, "userId" integer NOT NULL, "amount" integer NOT NULL, "currency" character varying(3) NOT NULL DEFAULT 'VND', "transferContent" character varying(500) NOT NULL, "providerTxnId" character varying(120) NOT NULL, "status" "public"."wallet_topup_request_status_enum" NOT NULL DEFAULT 'PENDING', "rejectionReason" character varying(500), "reviewedBy" integer, "reviewedAt" TIMESTAMP, "createdAt" TIMESTAMP NOT NULL, "updatedAt" TIMESTAMP, CONSTRAINT "UQ_wallet_topup_provider_txn_id" UNIQUE ("providerTxnId"), CONSTRAINT "PK_wallet_topup_request_id" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_wallet_topup_user_status" ON "wallet_topup_request" ("userId", "status")`
    );

    await queryRunner.query(
      `CREATE TABLE "wallet_ledger" ("id" SERIAL NOT NULL, "userId" integer NOT NULL, "type" "public"."wallet_ledger_type_enum" NOT NULL, "amount" integer NOT NULL, "currency" character varying(3) NOT NULL DEFAULT 'VND', "balanceBefore" integer NOT NULL, "balanceAfter" integer NOT NULL, "referenceType" "public"."wallet_ledger_reference_type_enum" NOT NULL, "referenceId" integer NOT NULL, "createdAt" TIMESTAMP NOT NULL, "updatedAt" TIMESTAMP, CONSTRAINT "PK_wallet_ledger_id" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(`CREATE INDEX "IDX_wallet_ledger_user_id" ON "wallet_ledger" ("userId")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_wallet_ledger_user_id"`);
    await queryRunner.query(`DROP TABLE "wallet_ledger"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_wallet_topup_user_status"`);
    await queryRunner.query(`DROP TABLE "wallet_topup_request"`);
    await queryRunner.query(`DROP TABLE "wallet"`);
    await queryRunner.query(`DROP TYPE "public"."wallet_ledger_reference_type_enum"`);
    await queryRunner.query(`DROP TYPE "public"."wallet_ledger_type_enum"`);
    await queryRunner.query(`DROP TYPE "public"."wallet_topup_request_status_enum"`);
  }
}
