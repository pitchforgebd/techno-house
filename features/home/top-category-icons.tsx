import {
  AirVent,
  Camera,
  CircuitBoard,
  Cpu,
  Gamepad2,
  Laptop,
  Printer,
  Smartphone,
  Speaker,
  Tv,
} from "lucide-react";
import { createLucideIcon } from "@/components/icons/create-lucide-icon";

export const IconTopLaptop = createLucideIcon(Laptop, "size-12");
export const IconTopProcessor = createLucideIcon(Cpu, "size-12");
export const IconTopMobile = createLucideIcon(Smartphone, "size-12");
export const IconTopSpeaker = createLucideIcon(Speaker, "size-12");
export const IconTopAc = createLucideIcon(AirVent, "size-12");
export const IconTopTv = createLucideIcon(Tv, "size-12");
export const IconTopGaming = createLucideIcon(Gamepad2, "size-12");
export const IconTopPrinter = createLucideIcon(Printer, "size-12");
export const IconTopGpu = createLucideIcon(CircuitBoard, "size-12");
export const IconTopCamera = createLucideIcon(Camera, "size-12");
