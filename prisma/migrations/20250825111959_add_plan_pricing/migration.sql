-- CreateTable
CREATE TABLE "public"."PlanPricing" (
    "id" TEXT NOT NULL DEFAULT 'global',
    "currency" TEXT NOT NULL DEFAULT 'PHP',
    "starterMonthly" INTEGER NOT NULL DEFAULT 499,
    "starterYearly" INTEGER NOT NULL DEFAULT 4990,
    "proMonthly" INTEGER NOT NULL DEFAULT 999,
    "proYearly" INTEGER NOT NULL DEFAULT 9990,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlanPricing_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."PlanPricing" ADD CONSTRAINT "PlanPricing_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
