import { MigrationInterface, QueryRunner } from 'typeorm';

export class HardenFlightSeatAndStatus1763002000000 implements MigrationInterface {
  name = 'HardenFlightSeatAndStatus1763002000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM pg_type
          WHERE typname = 'flight_flightstatus_enum'
            AND typnamespace = 'public'::regnamespace
        )
        AND NOT EXISTS (
          SELECT 1
          FROM pg_enum
          WHERE enumlabel = '5'
            AND enumtypid = '"public"."flight_flightstatus_enum"'::regtype
        ) THEN
          ALTER TYPE "public"."flight_flightstatus_enum" RENAME TO "flight_flightstatus_enum_old";
          CREATE TYPE "public"."flight_flightstatus_enum" AS ENUM ('0', '1', '2', '3', '4', '5');
          ALTER TABLE "flight" ALTER COLUMN "flightStatus" DROP DEFAULT;
          ALTER TABLE "flight"
            ALTER COLUMN "flightStatus" TYPE "public"."flight_flightstatus_enum"
            USING ("flightStatus"::text::"public"."flight_flightstatus_enum");
          DROP TYPE "public"."flight_flightstatus_enum_old";
        END IF;
      END
      $$;
    `);

    await queryRunner.query(`ALTER TABLE "flight" ALTER COLUMN "flightStatus" SET DEFAULT '5'`);
    await queryRunner.query(`UPDATE "flight" SET "flightStatus" = '5' WHERE "flightStatus" = '0'`);

    await queryRunner.query(`
      DELETE FROM "seat" a
      USING "seat" b
      WHERE a.id > b.id
        AND a."flightId" = b."flightId"
        AND a."seatNumber" = b."seatNumber"
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_seat_flightId_seatNumber"
      ON "seat" ("flightId", "seatNumber")
    `);

    await queryRunner.query(`
      DELETE FROM "flight" a
      USING "flight" b
      WHERE a.id > b.id
        AND a."flightNumber" = b."flightNumber"
        AND a."flightDate" = b."flightDate"
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_flight_flightNumber_flightDate"
      ON "flight" ("flightNumber", "flightDate")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_flight_flightNumber_flightDate"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_seat_flightId_seatNumber"`);
    await queryRunner.query(`ALTER TABLE "flight" ALTER COLUMN "flightStatus" SET DEFAULT '0'`);
    await queryRunner.query(`UPDATE "flight" SET "flightStatus" = '0' WHERE "flightStatus" = '5'`);
  }
}
