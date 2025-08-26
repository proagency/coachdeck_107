-- CreateTable
CREATE TABLE "public"."AdminConfig" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "externalPaymentWebhookUrl" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdminConfig_pkey" PRIMARY KEY ("id")
);
