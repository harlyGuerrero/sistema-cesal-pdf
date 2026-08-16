-- AlterTable
ALTER TABLE "responsables" ADD COLUMN "email" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "responsables_email_key" ON "responsables"("email");
