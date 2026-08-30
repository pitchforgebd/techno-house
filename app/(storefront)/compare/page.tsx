import type { Metadata } from "next";
import { CompareView } from "@/features/lists/compare-view";

export const metadata: Metadata = {
  title: "Compare — Techno House",
};

export default function ComparePage() {
  return <CompareView />;
}
