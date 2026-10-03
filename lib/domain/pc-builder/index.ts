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
  attrListsOverlap,
  formatAttrList,
  parseAttrList,
  toggleAttrValue,
} from "@/lib/domain/pc-builder/attr-values";
export {
  evaluateCompatibility,
  rankCandidatesForSlot,
  RULE_EVALUATORS,
  type CandidateCompatibility,
  type CandidateCompatibilityStatus,
  type CompatibilityPart,
  type CompatibilityResult,
  type RuleEvaluation,
  type RuleEvaluator,
} from "@/lib/domain/pc-builder/compatibility";
export {
  enabledRuleTypeSet,
  isPcBuilderRuleType,
  isRuleTypeEnabled,
  PC_RULE_TYPES,
  type CompatibilityRule,
  type PcBuilderRuleType,
} from "@/lib/domain/pc-builder/rules";
export {
  buildCandidateSlugs,
  candidateToCompatibilityPart,
  compatibilityPartsFromCandidates,
} from "@/lib/domain/pc-builder/components";
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
  isPersistedShareSlug,
  SHARE_SLUG_PREFIX,
  sharePathForSelection,
  sharePathForSlug,
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
  assembleValidatedBuild,
  type BuildValidateCandidate,
  type BuildValidationIssue,
  type ValidatedBuildSnapshot,
} from "@/lib/domain/pc-builder/validate";
export {
  planBuildToCart,
  planValidatedBuildToCart,
  type BuildToCartPlan,
  type BuildToCartProduct,
} from "@/lib/domain/pc-builder/build-to-cart";
