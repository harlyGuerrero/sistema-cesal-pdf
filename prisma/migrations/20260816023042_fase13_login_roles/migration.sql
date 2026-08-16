-- CreateEnum
CREATE TYPE "RolUsuario" AS ENUM ('SUPER_ADMIN', 'ADMIN');

-- AlterTable
ALTER TABLE "usuarios" ADD COLUMN     "passwordHash" TEXT NOT NULL,
ADD COLUMN     "rol" "RolUsuario" NOT NULL DEFAULT 'ADMIN',
ALTER COLUMN "email" SET NOT NULL;
