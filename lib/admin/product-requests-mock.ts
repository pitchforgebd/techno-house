export type ProductRequestStatus = "new" | "reviewed" | "closed";

export type AdminProductRequest = {
  id: string;
  date: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  productWanted: string;
  notes: string;
  status: ProductRequestStatus;
  staffNotes?: string;
};

/** Mock product request inbox rows (single-vendor). */
export const MOCK_PRODUCT_REQUESTS: AdminProductRequest[] = [
  {
    id: "pr-001",
    date: "2026-09-01",
    customerName: "Rahim Uddin",
    customerEmail: "rahim@example.com",
    customerPhone: "+880 1712-345678",
    productWanted: "Logitech MX Master 3S (Graphite)",
    notes: "Need for office use. Any color is fine if graphite is unavailable.",
    status: "new",
  },
  {
    id: "pr-002",
    date: "2026-09-02",
    customerName: "Sadia Khan",
    customerEmail: "sadia@example.com",
    customerPhone: "+880 1812-987654",
    productWanted: "Samsung Odyssey G7 32\" QHD",
    notes: "Looking for the 2024 revision if possible.",
    status: "reviewed",
    staffNotes: "Contacted supplier — ETA 2 weeks.",
  },
  {
    id: "pr-003",
    date: "2026-09-02",
    customerName: "Tanvir Ahmed",
    customerEmail: "tanvir@example.com",
    customerPhone: "+880 1911-223344",
    productWanted: "Apple Magic Keyboard with Touch ID",
    notes: "Must be US layout.",
    status: "new",
  },
  {
    id: "pr-004",
    date: "2026-08-29",
    customerName: "Nusrat Jahan",
    customerEmail: "nusrat@example.com",
    customerPhone: "+880 1612-556677",
    productWanted: "Corsair RM850x SHIFT 850W ATX 3.0",
    notes: "For a new build. Prefer white cable version.",
    status: "closed",
    staffNotes: "Added to catalog as Pulse RM850x SHIFT.",
  },
  {
    id: "pr-005",
    date: "2026-08-27",
    customerName: "Karim Hassan",
    customerEmail: "karim@example.com",
    customerPhone: "+880 1512-778899",
    productWanted: "Intel Core i9-14900K (boxed)",
    notes: "Need invoice for corporate purchase.",
    status: "reviewed",
    staffNotes: "Stock confirmed — customer notified via email.",
  },
  {
    id: "pr-006",
    date: "2026-08-25",
    customerName: "Farhana Begum",
    customerEmail: "farhana@example.com",
    customerPhone: "+880 1711-445566",
    productWanted: "ASUS ROG Strix B760-I ITX",
    notes: "Small form factor build. Wi-Fi 6E preferred.",
    status: "closed",
    staffNotes: "Customer purchased alternative from stock.",
  },
];

export function getProductRequestById(
  id: string,
): AdminProductRequest | undefined {
  return MOCK_PRODUCT_REQUESTS.find((item) => item.id === id);
}
