import type { LucideIcon } from "lucide-react";
import {
  BatteryCharging,
  Box,
  Cpu,
  Fan,
  Gpu,
  HardDrive,
  Headphones,
  Keyboard,
  MemoryStick,
  Monitor,
  Mouse,
  CircuitBoard,
  ShieldCheck,
  Speaker,
  Wifi,
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
  keyboard: Keyboard,
  mouse: Mouse,
  ups: BatteryCharging,
  speaker: Speaker,
  headphone: Headphones,
  network_adapter: Wifi,
  antivirus: ShieldCheck,
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
