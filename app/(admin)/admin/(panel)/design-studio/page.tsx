import type { Metadata } from "next";
import { AdminDesignStudioHub } from "@/features/admin/design-studio/admin-design-studio-hub";

export const metadata: Metadata = {
  title: "Design Studio",
};

export default function AdminDesignStudioPage() {
  return <AdminDesignStudioHub />;
}
