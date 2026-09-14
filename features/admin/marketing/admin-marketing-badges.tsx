import { Badge } from "@/components/ui/badge";
import type { CampaignStatus } from "@/lib/admin/marketing-mock";
import type { CouponAdminStatus } from "@/lib/admin/marketing-mock";

export function campaignStatusTone(
  status: CampaignStatus,
): "stock" | "sale" | "warranty" | "neutral" {
  if (status === "active") {
    return "stock";
  }
  if (status === "scheduled") {
    return "warranty";
  }
  if (status === "draft" || status === "paused") {
    return "neutral";
  }
  return "sale";
}

export function couponStatusTone(
  status: CouponAdminStatus,
): "stock" | "sale" | "warranty" | "neutral" {
  if (status === "active") {
    return "stock";
  }
  if (status === "scheduled") {
    return "warranty";
  }
  if (status === "disabled") {
    return "neutral";
  }
  return "sale";
}

export function CampaignStatusBadge({ status }: { status: CampaignStatus }) {
  return <Badge tone={campaignStatusTone(status)}>{status}</Badge>;
}

export function CouponStatusBadge({ status }: { status: CouponAdminStatus }) {
  return <Badge tone={couponStatusTone(status)}>{status}</Badge>;
}
