import {
  AirVent,
  AppWindow,
  BatteryCharging,
  Box,
  Briefcase,
  Cable,
  Camera,
  CircuitBoard,
  Cpu,
  Fan,
  Folder,
  Gamepad2,
  HardDrive,
  Laptop,
  MemoryStick,
  Monitor,
  Network,
  Printer,
  Server,
  Shield,
  Smartphone,
  Speaker,
  Tablet,
  Tv,
  Watch,
  Wifi,
  Zap,
  type LucideIcon,
} from "lucide-react";

const ICON_MAP: Record<string, LucideIcon> = {
  laptop: Laptop,
  server: Server,
  monitor: Monitor,
  cpu: Cpu,
  fan: Fan,
  circuit: CircuitBoard,
  memory: MemoryStick,
  gpu: CircuitBoard,
  harddrive: HardDrive,
  zap: Zap,
  box: Box,
  gamepad: Gamepad2,
  tv: Tv,
  tablet: Tablet,
  phone: Smartphone,
  watch: Watch,
  printer: Printer,
  camera: Camera,
  shield: Shield,
  wifi: Wifi,
  network: Network,
  speaker: Speaker,
  briefcase: Briefcase,
  cable: Cable,
  battery: BatteryCharging,
  app: AppWindow,
  air: AirVent,
  folder: Folder,
};

export function AdminCategoryIcon({
  iconKey,
  className = "size-5",
}: {
  iconKey: string;
  className?: string;
}) {
  const Icon = ICON_MAP[iconKey] ?? Folder;
  return <Icon className={className} aria-hidden />;
}
