-- CreateEnum
CREATE TYPE "CompletionStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILURE');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "credits" INTEGER NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Batch" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "status" "CompletionStatus" NOT NULL DEFAULT 'PENDING',
    "base_prompt" TEXT NOT NULL,
    "variables" JSONB NOT NULL,

    CONSTRAINT "Batch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "items" (
    "id" TEXT NOT NULL,
    "batch_id" TEXT NOT NULL,
    "url" TEXT,
    "labels" JSONB NOT NULL,
    "workflow_id" TEXT,

    CONSTRAINT "items_pkey" PRIMARY KEY ("id")
);
