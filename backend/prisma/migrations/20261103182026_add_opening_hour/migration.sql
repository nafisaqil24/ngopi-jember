-- CreateTable
CREATE TABLE "OpeningHour" (
    "id" TEXT NOT NULL,
    "coffeeShopId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "openMinutes" INTEGER NOT NULL,
    "closeMinutes" INTEGER NOT NULL,
    "isClosed" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "OpeningHour_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OpeningHour_coffeeShopId_idx" ON "OpeningHour"("coffeeShopId");

-- CreateIndex
CREATE UNIQUE INDEX "OpeningHour_coffeeShopId_dayOfWeek_key" ON "OpeningHour"("coffeeShopId", "dayOfWeek");

-- AddForeignKey
ALTER TABLE "OpeningHour" ADD CONSTRAINT "OpeningHour_coffeeShopId_fkey" FOREIGN KEY ("coffeeShopId") REFERENCES "CoffeeShop"("id") ON DELETE CASCADE ON UPDATE CASCADE;
