import {
  getAnalyticsSnapshot,
  type AnalyticsSnapshot,
} from "@/lib/admin/analytics-mock";
import type { AnalyticsParams } from "@/lib/admin/analytics-list-params";

export function loadAdminAnalytics(
  params: AnalyticsParams,
): AnalyticsSnapshot {
  return getAnalyticsSnapshot(params.period);
}
