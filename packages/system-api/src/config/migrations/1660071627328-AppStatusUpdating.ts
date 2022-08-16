import { MigrationInterface, QueryRunner } from 'typeorm';

export class AppStatusUpdating1660071627328 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TYPE "public"."app_status_enum" ADD VALUE \'updating\'');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TYPE "public"."app_status_enum" DROP VALUE \'updating\'');
  }
}
