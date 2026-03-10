import { MigrationInterface, QueryRunner } from 'typeorm';

export class SetSeatCreatedAtDefault1763006000000 implements MigrationInterface {
  name = 'SetSeatCreatedAtDefault1763006000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "seat" ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "seat" ALTER COLUMN "createdAt" DROP DEFAULT`);
  }
}

