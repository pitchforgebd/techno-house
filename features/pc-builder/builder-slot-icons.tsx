import type { LucideIcon } from "lucide-react";
import {
  Box,
  Cpu,
  Fan,
  Gpu,
  HardDrive,
  MemoryStick,
  Monitor,
  CircuitBoard,
  Zap,
} from "lucide-react";
import type { BuilderSlot } from "@/lib/data";

export const BUILDER_SLOT_ICONS: Record<BuilderSlot, LucideIcon> = {
  cpu: Cpu,
  cpu_cooler: Fan,
  motherboard: CircuitBoard,
  ram: MemoryStick,
  gpu: Gpu,
  ssd: HardDrive,
  hdd: HardDrive,
  psu: Zap,
  case: Box,
  case_fans: Fan,
  monitor: Monitor,
};

export function BuilderSlotIcon({
  slotId,
  className,
}: {
  slotId: BuilderSlot;
  className?: string;
}) {
  const Icon = BUILDER_SLOT_ICONS[slotId];
  return <Icon aria-hidden className={className} strokeWidth={1.75} />;
}
