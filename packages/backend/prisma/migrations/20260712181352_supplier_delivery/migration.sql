-- CreateEnum
CREATE TYPE "DeliveryStatus" AS ENUM ('PREPARING', 'SHIPPED', 'IN_TRANSIT', 'DELIVERED');

-- AlterTable
ALTER TABLE "PurchaseRequest" ADD COLUMN     "deliveryStatus" "DeliveryStatus";
