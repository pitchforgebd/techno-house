export {
  BUILDER_SLOTS,
  getBuilderSlotMeta,
  requiredBuilderSlots,
  type BuilderSlotMeta,
} from "@/lib/domain/pc-builder/slots";
export {
  emptyBuildSelection,
  isSlotFilled,
  type BuildSelection,
  type CompatibilityStatus,
  type CompatibilityWarning,
} from "@/lib/domain/pc-builder/types";
export {
  BUILDER_STORAGE_KEY,
  clearSlotSelection,
  countFilledSlots,
  isBuilderSlotId,
  builderSelectPath,
  normalizeBuildSelection,
  selectedSlugs,
  setSlotSelection,
  slotMetaList,
} from "@/lib/domain/pc-builder/selection";
export {
  evaluateCompatibility,
  type CompatibilityPart,
  type CompatibilityResult,
} from "@/lib/domain/pc-builder/compatibility";
export {
  estimateBuildPower,
  summarizeBuildPricing,
  summarizeBuildStock,
  type BuildPowerSummary,
  type BuildPriceLine,
  type BuildPricingSummary,
  type BuildStockSummary,
} from "@/lib/domain/pc-builder/totals";
export {
  decodeShareId,
  encodeShareId,
  sharePathForSelection,
} from "@/lib/domain/pc-builder/share";
export {
  BUILDER_SAVED_STORAGE_KEY,
  MAX_SAVED_BUILD_NAME,
  MAX_SAVED_BUILDS,
  addSavedBuild,
  createSavedBuildId,
  normalizeSavedBuildName,
  normalizeSavedBuilds,
  removeSavedBuild,
  type SavedBuild,
} from "@/lib/domain/pc-builder/saved-builds";
export {
  planBuildToCart,
  type BuildToCartPlan,
  type BuildToCartProduct,
} from "@/lib/domain/pc-builder/build-to-cart";
