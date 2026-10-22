-- AlterTable
ALTER TABLE "CoffeeShop" ADD COLUMN     "googleRating" DOUBLE PRECISION,
ADD COLUMN     "googleRatingAt" TIMESTAMP(3),
ADD COLUMN     "googleReviewCount" INTEGER;
