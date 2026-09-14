-- CreateTable
CREATE TABLE "ProductUnit" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductUnit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductNotePreset" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductNotePreset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductLabelPreset" (
    "id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "backgroundColor" TEXT NOT NULL,
    "textTone" TEXT NOT NULL DEFAULT 'light',
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductLabelPreset_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProductUnit_name_key" ON "ProductUnit"("name");

-- CreateIndex
CREATE INDEX "ProductNotePreset_type_idx" ON "ProductNotePreset"("type");

-- CreateIndex
CREATE INDEX "ProductLabelPreset_isActive_idx" ON "ProductLabelPreset"("isActive");
