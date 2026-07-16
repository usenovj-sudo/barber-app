-- CreateEnum
CREATE TYPE "DeliveryMethod" AS ENUM ('SELF', 'COURIER', 'TAXI');

-- AlterTable
ALTER TABLE "PurchaseRequest" ADD COLUMN     "deliveryMethod" "DeliveryMethod",
ADD COLUMN     "respondBy" TIMESTAMP(3),
ADD COLUMN     "shipBy" TIMESTAMP(3);
