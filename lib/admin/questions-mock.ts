export type ProductQuestionStatus = "pending" | "answered";

export type AdminProductQuestion = {
  id: string;
  date: string;
  productName: string;
  productSlug: string;
  question: string;
  customerName: string;
  customerEmail: string;
  status: ProductQuestionStatus;
  answer?: string;
};

/** Mock product Q&A rows for admin (single-vendor). */
export const MOCK_PRODUCT_QUESTIONS: AdminProductQuestion[] = [
  {
    id: "pq-001",
    date: "2026-08-28",
    productName: "NovaCore i7 Gaming Desktop",
    productSlug: "novacore-i7-gaming-desktop",
    question: "Does this include Windows 11 pre-installed?",
    customerName: "Rahim Uddin",
    customerEmail: "rahim@example.com",
    status: "answered",
    answer: "Yes — Windows 11 Home is pre-installed on all NovaCore builds.",
  },
  {
    id: "pq-002",
    date: "2026-08-30",
    productName: "Pulse RTX 4070 Graphics Card",
    productSlug: "pulse-rtx-4070",
    question: "What is the warranty period for this GPU?",
    customerName: "Sadia Khan",
    customerEmail: "sadia@example.com",
    status: "pending",
  },
  {
    id: "pq-003",
    date: "2026-09-01",
    productName: "Volt DDR5 32GB Kit",
    productSlug: "volt-ddr5-32gb-kit",
    question: "Is this compatible with Intel Z790 boards?",
    customerName: "Tanvir Ahmed",
    customerEmail: "tanvir@example.com",
    status: "answered",
    answer: "Yes, this kit supports Intel Z790 and AMD AM5 platforms.",
  },
  {
    id: "pq-004",
    date: "2026-09-02",
    productName: "Frame 2TB NVMe SSD",
    productSlug: "frame-2tb-nvme-ssd",
    question: "Can I use this as external storage with an enclosure?",
    customerName: "Nusrat Jahan",
    customerEmail: "nusrat@example.com",
    status: "pending",
  },
  {
    id: "pq-005",
    date: "2026-09-03",
    productName: "AeroMesh Mid-Tower Case",
    productSlug: "aeromesh-mid-tower-case",
    question: "How many 120mm fans can fit in the front panel?",
    customerName: "Imran Hossain",
    customerEmail: "imran@example.com",
    status: "answered",
    answer: "Up to three 120mm fans in the front; two included with the case.",
  },
  {
    id: "pq-006",
    date: "2026-09-03",
    productName: "CoreFlow 750W PSU",
    productSlug: "coreflow-750w-psu",
    question: "Is this 80+ Gold certified?",
    customerName: "Farhana Islam",
    customerEmail: "farhana@example.com",
    status: "pending",
  },
];

export function getProductQuestionById(
  id: string,
): AdminProductQuestion | undefined {
  return MOCK_PRODUCT_QUESTIONS.find((item) => item.id === id);
}
