export type AdminAttributeSeed = {
  id: string;
  name: string;
  /** Catalog filter key when applicable. */
  key: string;
  values: string[];
};

export type AdminAttribute = AdminAttributeSeed & {
  isFilterable: boolean;
  position: number;
};

/**
 * Gadget/electronics attributes for Techno House catalog UI.
 * Values are display-only mocks aligned with storefront filter keys.
 */
export const MOCK_ADMIN_ATTRIBUTES: AdminAttributeSeed[] = [
  {
    id: "attr-processor",
    name: "Processors",
    key: "processor",
    values: [
      "Intel Core i3",
      "Intel Core i5",
      "Intel Core i7",
      "Intel Core i9",
      "AMD Ryzen 5",
      "AMD Ryzen 7",
      "AMD Ryzen 9",
      "Apple M1",
      "Apple M2",
      "Apple M3",
    ],
  },
  {
    id: "attr-ram",
    name: "RAM",
    key: "ram",
    values: ["4GB", "8GB", "12GB", "16GB", "24GB", "32GB", "64GB"],
  },
  {
    id: "attr-storage",
    name: "Storage",
    key: "storage",
    values: [
      "64GB",
      "128GB",
      "256GB",
      "512GB",
      "1TB",
      "2TB",
      "4/64GB",
      "6/128GB",
      "8/256GB",
      "12/256GB",
      "16GB/512GB",
    ],
  },
  {
    id: "attr-graphics",
    name: "Graphics",
    key: "graphics",
    values: [
      "Intel UHD",
      "Intel Arc",
      "NVIDIA RTX 3050",
      "NVIDIA RTX 4060",
      "NVIDIA RTX 4070",
      "AMD Radeon",
    ],
  },
  {
    id: "attr-display-size",
    name: "Display size",
    key: "size",
    values: [
      "13.3 Inch",
      "14 Inch",
      "15.6 Inch",
      "16 Inch",
      "24 Inch",
      "27 Inch",
      "32 Inch",
      "43 Inch",
      "55 Inch",
      "65 Inch",
    ],
  },
  {
    id: "attr-panel",
    name: "Panel type",
    key: "panel",
    values: ["IPS", "VA", "TN", "OLED", "Mini-LED"],
  },
  {
    id: "attr-socket",
    name: "CPU socket",
    key: "socket",
    values: ["LGA1700", "LGA1851", "AM4", "AM5", "sTR5"],
  },
  {
    id: "attr-cores",
    name: "CPU cores",
    key: "cores",
    values: ["4", "6", "8", "12", "16", "24"],
  },
  {
    id: "attr-ram-type",
    name: "RAM type",
    key: "ramType",
    values: ["DDR4", "DDR5", "LPDDR5", "LPDDR5X"],
  },
  {
    id: "attr-form-factor",
    name: "Form factor",
    key: "formFactor",
    values: ["ATX", "Micro-ATX", "Mini-ITX", "E-ATX"],
  },
  {
    id: "attr-capacity",
    name: "Drive capacity",
    key: "capacity",
    values: ["256GB", "512GB", "1TB", "2TB", "4TB", "8TB"],
  },
  {
    id: "attr-wattage",
    name: "PSU wattage",
    key: "wattage",
    values: ["450W", "550W", "650W", "750W", "850W", "1000W"],
  },
  {
    id: "attr-cooler",
    name: "Cooler type",
    key: "coolerType",
    values: ["Air", "AIO 120mm", "AIO 240mm", "AIO 360mm"],
  },
  {
    id: "attr-memory-gpu",
    name: "GPU memory",
    key: "memory",
    values: ["4GB", "6GB", "8GB", "12GB", "16GB", "24GB"],
  },
  {
    id: "attr-color",
    name: "Color",
    key: "color",
    values: ["Black", "Silver", "Space Gray", "White", "Blue", "Midnight"],
  },
  {
    id: "attr-connectivity",
    name: "Connectivity",
    key: "connectivity",
    values: [
      "Wi-Fi 6",
      "Wi-Fi 6E",
      "Wi-Fi 7",
      "Bluetooth 5.2",
      "Bluetooth 5.3",
    ],
  },
  {
    id: "attr-refresh",
    name: "Refresh rate",
    key: "refreshRate",
    values: ["60Hz", "75Hz", "120Hz", "144Hz", "165Hz", "240Hz"],
  },
  {
    id: "attr-warranty",
    name: "Warranty",
    key: "warranty",
    values: ["6 months", "1 year", "2 years", "3 years"],
  },
];
