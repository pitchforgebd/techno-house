import type { Metadata } from "next";
import { HomePage } from "@/features/home/home-page";

export const metadata: Metadata = {
  title: "Techno House",
  description: "Technology products for work, study, and building a PC.",
};

export default function Home() {
  return <HomePage />;
}
