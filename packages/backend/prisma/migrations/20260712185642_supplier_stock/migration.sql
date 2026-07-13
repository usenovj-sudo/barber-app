-- CreateEnum
CREATE TYPE "StockMoveType" AS ENUM ('INBOUND', 'OUTBOUND', 'ADJUSTMENT');

-- CreateTable
CREATE TABLE "SupplierStockMovement" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "type" "StockMoveType" NOT NULL,
    "quantity" DECIMAL(12,4) NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupplierStockMovement_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "SupplierStockMovement" ADD CONSTRAINT "SupplierStockMovement_productId_fkey" FOREIGN KEY ("productId") REFERENCES "SupplierProduct"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
