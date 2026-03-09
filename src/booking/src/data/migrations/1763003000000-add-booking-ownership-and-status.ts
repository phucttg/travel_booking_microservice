import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBookingOwnershipAndStatus1763003000000 implements MigrationInterface {
  name = 'AddBookingOwnershipAndStatus1763003000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TYPE "public"."booking_bookingstatus_enum" AS ENUM('0', '1')`);
    await queryRunner.query(`ALTER TABLE "booking" ADD "flightId" integer`);
    await queryRunner.query(`ALTER TABLE "booking" ADD "userId" integer`);
    await queryRunner.query(`ALTER TABLE "booking" ADD "passengerId" integer`);
    await queryRunner.query(
      `ALTER TABLE "booking" ADD "bookingStatus" "public"."booking_bookingstatus_enum" NOT NULL DEFAULT '0'`
    );
    await queryRunner.query(`ALTER TABLE "booking" ADD "canceledAt" TIMESTAMP`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "booking" DROP COLUMN "canceledAt"`);
    await queryRunner.query(`ALTER TABLE "booking" DROP COLUMN "bookingStatus"`);
    await queryRunner.query(`ALTER TABLE "booking" DROP COLUMN "passengerId"`);
    await queryRunner.query(`ALTER TABLE "booking" DROP COLUMN "userId"`);
    await queryRunner.query(`ALTER TABLE "booking" DROP COLUMN "flightId"`);
    await queryRunner.query(`DROP TYPE "public"."booking_bookingstatus_enum"`);
  }
}
