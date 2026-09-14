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
  { href: "/category/laptops", label: "Laptop", Icon: IconTopLaptop },
  { href: "/category/cpu", label: "Processor", Icon: IconTopProcessor },
  { href: "/category/phones", label: "Mobile", Icon: IconTopMobile },
  { href: "/category/sound", label: "Speaker", Icon: IconTopSpeaker },
  { href: "/category/appliances", label: "AC", Icon: IconTopAc },
  { href: "/category/tvs", label: "TV", Icon: IconTopTv },
  { href: "/category/gaming", label: "Gaming", Icon: IconTopGaming },
  { href: "/category/printers", label: "Printer", Icon: IconTopPrinter },
  { href: "/category/graphics-cards", label: "GPU", Icon: IconTopGpu },
  { href: "/category/cameras", label: "Camera", Icon: IconTopCamera },
];
