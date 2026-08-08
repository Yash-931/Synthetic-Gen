/*
  Warnings:

  - You are about to drop the column `url` on the `Items` table. All the data in the column will be lost.
  - You are about to drop the column `workflow_id` on the `Items` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Items" DROP COLUMN "url",
DROP COLUMN "workflow_id",
ADD COLUMN     "prompt" TEXT,
ADD COLUMN     "status" "CompletionStatus" NOT NULL DEFAULT 'PENDING';
