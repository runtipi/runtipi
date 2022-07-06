import { MigrationInterface, QueryRunner } from 'typeorm';

export class Initial1657122167397 implements MigrationInterface {
  name = 'Initial1657122167397';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "user" ("id" SERIAL NOT NULL, "username" character varying NOT NULL, "password" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_78a916df40e02a9deb1c4b75edb" UNIQUE ("username"), CONSTRAINT "PK_cace4a159ff9f2512dd42373760" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(`CREATE TYPE "public"."app_status_enum" AS ENUM('running', 'stopped', 'installing', 'uninstalling', 'stopping', 'starting', 'missing')`);
    await queryRunner.query(
      `CREATE TABLE "app" ("id" character varying NOT NULL, "status" "public"."app_status_enum" NOT NULL DEFAULT 'stopped', "lastOpened" TIMESTAMP WITH TIME ZONE DEFAULT now(), "numOpened" integer NOT NULL DEFAULT '0', "config" jsonb NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_9478629fc093d229df09e560aea" UNIQUE ("id"), CONSTRAINT "PK_9478629fc093d229df09e560aea" PRIMARY KEY ("id"))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "app"`);
    await queryRunner.query(`DROP TYPE "public"."app_status_enum"`);
    await queryRunner.query(`DROP TABLE "user"`);
  }
}
