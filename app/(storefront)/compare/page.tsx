import type { Metadata } from "next";
import { CompareView } from "@/features/lists/compare-view";
import { NO_INDEX } from "@/lib/seo/robots";

export const metadata: Metadata = {
  title: "Compare — Techno House",
  robots: NO_INDEX,
};

export default function ComparePage() {
  return <CompareView />;
}
