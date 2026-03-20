import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddFlightProcessedMessage1763008000000 implements MigrationInterface {
  name = 'AddFlightProcessedMessage1763008000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "flight_processed_message" ("id" SERIAL NOT NULL, "consumer" character varying NOT NULL, "messageKey" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL, CONSTRAINT "PK_flight_processed_message_id" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_flight_processed_message_consumer_key" ON "flight_processed_message" ("consumer", "messageKey")`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_flight_processed_message_consumer_key"`);
    await queryRunner.query(`DROP TABLE "flight_processed_message"`);
  }
}
