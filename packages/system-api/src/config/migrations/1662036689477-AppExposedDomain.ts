import { MigrationInterface, QueryRunner } from 'typeorm';

export class AppExposedDomain1662036689477 implements MigrationInterface {
  name = 'AppExposedDomain1662036689477';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "app" ADD "exposed" boolean DEFAULT false');
    // populate all apps with exposed to false
    await queryRunner.query('UPDATE "app" SET "exposed" = false');
    // add NOT NULL constraint
    await queryRunner.query('ALTER TABLE "app" ALTER COLUMN "exposed" SET NOT NULL');

    await queryRunner.query('ALTER TABLE "app" ADD "domain" character varying');
    await queryRunner.query('ALTER TABLE "app" ALTER COLUMN "version" SET DEFAULT \'1\'');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "app" ALTER COLUMN "version" SET DEFAULT \'0\'');
    await queryRunner.query('ALTER TABLE "app" DROP COLUMN "domain"');
    await queryRunner.query('ALTER TABLE "app" DROP COLUMN "exposed"');
  }
}
