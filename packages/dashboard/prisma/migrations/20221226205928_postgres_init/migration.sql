-- CreateEnum
CREATE TYPE "app_status_enum" AS ENUM ('running', 'stopped', 'installing', 'uninstalling', 'stopping', 'starting', 'missing', 'updating');

-- CreateEnum
CREATE TYPE "update_status_enum" AS ENUM ('FAILED', 'SUCCESS');

-- CreateTable
CREATE TABLE "app" (
    "id" VARCHAR NOT NULL,
    "status" "app_status_enum" NOT NULL DEFAULT 'stopped',
    "lastOpened" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "numOpened" INTEGER NOT NULL DEFAULT 0,
    "config" JSONB NOT NULL,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "version" INTEGER NOT NULL DEFAULT 1,
    "exposed" BOOLEAN NOT NULL DEFAULT false,
    "domain" VARCHAR,

    CONSTRAINT "PK_9478629fc093d229df09e560aea" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "migrations" (
    "id" SERIAL NOT NULL,
    "timestamp" BIGINT NOT NULL,
    "name" VARCHAR NOT NULL,

    CONSTRAINT "PK_8c82d7f526340ab734260ea46be" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "update" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR NOT NULL,
    "status" "update_status_enum" NOT NULL,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PK_575f77a0576d6293bc1cb752847" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user" (
    "id" SERIAL NOT NULL,
    "username" VARCHAR NOT NULL,
    "password" VARCHAR NOT NULL,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PK_cace4a159ff9f2512dd42373760" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UQ_9478629fc093d229df09e560aea" ON "app"("id");

-- CreateIndex
CREATE UNIQUE INDEX "UQ_6e7d7ecccdc972caa0ad33cb014" ON "update"("name");

-- CreateIndex
CREATE UNIQUE INDEX "UQ_78a916df40e02a9deb1c4b75edb" ON "user"("username");
