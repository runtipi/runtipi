import { MigrationInterface, QueryRunner } from 'typeorm';

export class AppVersion1659645508713 implements MigrationInterface {
  name = 'AppVersion1659645508713';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "app" ADD "version" integer DEFAULT \'0\'');
    // populate all apps with a version
    await queryRunner.query('UPDATE "app" SET "version" = \'1\'');
    // add NOT NULL constraint
    await queryRunner.query('ALTER TABLE "app" ALTER COLUMN "version" SET NOT NULL');

    await queryRunner.query('ALTER TABLE "app" ADD CONSTRAINT "UQ_9478629fc093d229df09e560aea" UNIQUE ("id")');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "app" DROP CONSTRAINT "UQ_9478629fc093d229df09e560aea"');
    await queryRunner.query('ALTER TABLE "app" DROP COLUMN "version"');
  }
}
