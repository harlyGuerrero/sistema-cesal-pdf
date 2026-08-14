-- CreateEnum
CREATE TYPE "CategoryCode" AS ENUM ('EQUIPOS_INFORMATICOS', 'EQUIPOS_DE_OFICINA', 'MUEBLES_DE_OFICINA', 'BIENES_VEHICULARES', 'EQUIPOS_DE_MAQUINARIA', 'BIENES_INMUEBLES');

-- CreateEnum
CREATE TYPE "Relevance" AS ENUM ('PRODUCT', 'CONSUMABLE', 'SERVICE', 'OTHER');

-- CreateEnum
CREATE TYPE "ImportStatus" AS ENUM ('UPLOADED', 'PROCESSING', 'READY_FOR_REVIEW', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "ImportItemStatus" AS ENUM ('REVIEW_REQUIRED', 'CONFIRMED', 'REJECTED', 'IGNORED');

-- CreateEnum
CREATE TYPE "ClassificationMethod" AS ENUM ('RULE', 'OLLAMA', 'MANUAL');

-- CreateEnum
CREATE TYPE "ProcessingEngine" AS ENUM ('DOCLING', 'OCR', 'GLM_OCR', 'GRANITE_DOCLING', 'OLLAMA');

-- CreateEnum
CREATE TYPE "ProcessingAttemptStatus" AS ENUM ('RUNNING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "categories" (
    "id" TEXT NOT NULL,
    "code" "CategoryCode" NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "imports" (
    "id" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileHash" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "status" "ImportStatus" NOT NULL DEFAULT 'UPLOADED',
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "imports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "import_items" (
    "id" TEXT NOT NULL,
    "importId" TEXT NOT NULL,
    "rawText" TEXT NOT NULL,
    "sourcePage" INTEGER NOT NULL,
    "sourceTable" INTEGER NOT NULL,
    "sourceRow" INTEGER NOT NULL,
    "normalizedName" TEXT,
    "quantity" DECIMAL(14,3),
    "unitPrice" DECIMAL(14,2),
    "totalPrice" DECIMAL(14,2),
    "currency" TEXT,
    "relevance" "Relevance",
    "categoryId" TEXT,
    "classificationMethod" "ClassificationMethod",
    "confidence" DOUBLE PRECISION,
    "status" "ImportItemStatus" NOT NULL DEFAULT 'REVIEW_REQUIRED',
    "reviewNotes" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewedBy" TEXT,
    "productId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "import_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "processing_attempts" (
    "id" TEXT NOT NULL,
    "importId" TEXT NOT NULL,
    "engine" "ProcessingEngine" NOT NULL,
    "model" TEXT,
    "status" "ProcessingAttemptStatus" NOT NULL DEFAULT 'RUNNING',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "durationMs" INTEGER,
    "errorMessage" TEXT,
    "metadata" JSONB,

    CONSTRAINT "processing_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "categories_code_key" ON "categories"("code");

-- CreateIndex
CREATE INDEX "products_normalizedName_idx" ON "products"("normalizedName");

-- CreateIndex
CREATE INDEX "products_categoryId_idx" ON "products"("categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "imports_fileHash_key" ON "imports"("fileHash");

-- CreateIndex
CREATE INDEX "imports_status_idx" ON "imports"("status");

-- CreateIndex
CREATE INDEX "import_items_importId_idx" ON "import_items"("importId");

-- CreateIndex
CREATE INDEX "import_items_status_idx" ON "import_items"("status");

-- CreateIndex
CREATE INDEX "import_items_categoryId_idx" ON "import_items"("categoryId");

-- CreateIndex
CREATE INDEX "import_items_productId_idx" ON "import_items"("productId");

-- CreateIndex
CREATE INDEX "processing_attempts_importId_idx" ON "processing_attempts"("importId");

-- CreateIndex
CREATE INDEX "processing_attempts_engine_idx" ON "processing_attempts"("engine");

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "import_items" ADD CONSTRAINT "import_items_importId_fkey" FOREIGN KEY ("importId") REFERENCES "imports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "import_items" ADD CONSTRAINT "import_items_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "import_items" ADD CONSTRAINT "import_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "processing_attempts" ADD CONSTRAINT "processing_attempts_importId_fkey" FOREIGN KEY ("importId") REFERENCES "imports"("id") ON DELETE CASCADE ON UPDATE CASCADE;
