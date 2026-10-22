-- Admin-configurable section order for the Add/Edit Product form (AD-383).

-- CreateTable
CREATE TABLE "AdminProductFormLayout" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "sectionOrderJson" TEXT NOT NULL DEFAULT '[]',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdminProductFormLayout_pkey" PRIMARY KEY ("id")
);
