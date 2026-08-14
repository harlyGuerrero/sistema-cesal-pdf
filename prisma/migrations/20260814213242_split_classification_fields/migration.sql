/*
  Warnings:

  - You are about to drop the column `classificationMethod` on the `import_items` table. All the data in the column will be lost.
  - You are about to drop the column `confidence` on the `import_items` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "import_items" DROP COLUMN "classificationMethod",
DROP COLUMN "confidence",
ADD COLUMN     "categoryConfidence" DOUBLE PRECISION,
ADD COLUMN     "categoryMethod" "ClassificationMethod",
ADD COLUMN     "relevanceConfidence" DOUBLE PRECISION,
ADD COLUMN     "relevanceMethod" "ClassificationMethod";
