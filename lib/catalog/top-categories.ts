import type { ComponentType } from "react";
import {
  IconTopAc,
  IconTopCamera,
  IconTopGaming,
  IconTopGpu,
  IconTopLaptop,
  IconTopMobile,
  IconTopPrinter,
  IconTopProcessor,
  IconTopSpeaker,
  IconTopTv,
} from "@/features/home/top-category-icons";

export type TopCategoryItem = {
  href: string;
  label: string;
  Icon: ComponentType<{ className?: string }>;
};

/** Homepage “Top Categories” shortcuts — layout from UI reference, Techno House links. */
export const TOP_CATEGORIES: readonly TopCategoryItem[] = [
  { href: "/category/laptop", label: "Laptop", Icon: IconTopLaptop },
  { href: "/category/processor", label: "Processor", Icon: IconTopProcessor },
  { href: "/category/phone", label: "Mobile", Icon: IconTopMobile },
  { href: "/category/speaker-and-home-theater", label: "Speaker", Icon: IconTopSpeaker },
  { href: "/category/ac", label: "AC", Icon: IconTopAc },
  { href: "/category/tv", label: "TV", Icon: IconTopTv },
  { href: "/category/gaming", label: "Gaming", Icon: IconTopGaming },
  { href: "/category/printer", label: "Printer", Icon: IconTopPrinter },
  { href: "/category/graphics-card", label: "GPU", Icon: IconTopGpu },
  { href: "/category/camera", label: "Camera", Icon: IconTopCamera },
];
