import fs from "node:fs";
import path from "node:path";

const dir = path.join("public", "products");
fs.mkdirSync(dir, { recursive: true });

function svg({ title, subtitle, shape, accent }) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600" role="img" aria-label="${title}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#F4F6F8"/>
      <stop offset="100%" stop-color="#EEF2F5"/>
    </linearGradient>
  </defs>
  <rect width="800" height="600" fill="url(#g)"/>
  <rect x="40" y="40" width="720" height="520" rx="8" fill="#FFFFFF" stroke="#D7DEE5" stroke-width="2"/>
  <g transform="translate(400 250)" fill="none" stroke="${accent}" stroke-width="8" stroke-linecap="round" stroke-linejoin="round">
    ${shape}
  </g>
  <text x="400" y="430" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" font-size="28" font-weight="700" fill="#0E1A24">${title}</text>
  <text x="400" y="468" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" font-size="16" fill="#5B6B78">${subtitle}</text>
  <text x="400" y="520" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" font-size="13" fill="#125E6A">Techno House demo</text>
</svg>
`;
}

const items = [
  [
    "lumen-14",
    "Lumen 14",
    "Office laptop",
    "#125E6A",
    '<rect x="-140" y="-70" width="280" height="170" rx="12"/><rect x="-120" y="-50" width="240" height="130" rx="4" fill="#EEF2F5" stroke="none"/><line x1="-40" y1="115" x2="40" y2="115"/>',
  ],
  [
    "ridge-16",
    "Ridge 16",
    "Gaming laptop",
    "#B8612C",
    '<rect x="-150" y="-75" width="300" height="180" rx="12"/><rect x="-130" y="-55" width="260" height="140" rx="4" fill="#0E1A24" stroke="none"/><circle cx="90" cy="-20" r="10" fill="#B8612C" stroke="none"/>',
  ],
  [
    "ridge-16-kb",
    "Ridge 16",
    "Keyboard detail",
    "#B8612C",
    '<rect x="-160" y="-40" width="320" height="120" rx="8"/><line x1="-130" y1="-10" x2="130" y2="-10"/><line x1="-130" y1="20" x2="130" y2="20"/><line x1="-130" y1="50" x2="90" y2="50"/>',
  ],
  [
    "ridge-16-ports",
    "Ridge 16",
    "Ports detail",
    "#B8612C",
    '<rect x="-40" y="-90" width="80" height="180" rx="8"/><circle cx="0" cy="-40" r="10"/><circle cx="0" cy="0" r="10"/><rect x="-14" y="40" width="28" height="18" rx="3"/>',
  ],
  [
    "north-desktop",
    "North Desktop",
    "Prebuilt PC",
    "#0E1A24",
    '<rect x="-70" y="-110" width="140" height="200" rx="8"/><rect x="-50" y="-80" width="100" height="40" rx="4" fill="#EEF2F5" stroke="none"/><circle cx="0" cy="40" r="18"/>',
  ],
  [
    "coreline-6c",
    "CoreLine 6C",
    "Processor",
    "#125E6A",
    '<rect x="-70" y="-70" width="140" height="140" rx="12"/><rect x="-40" y="-40" width="80" height="80" rx="4"/><line x1="-90" y1="0" x2="-70" y2="0"/><line x1="70" y1="0" x2="90" y2="0"/><line x1="0" y1="-90" x2="0" y2="-70"/><line x1="0" y1="70" x2="0" y2="90"/>',
  ],
  [
    "coreline-8c",
    "CoreLine 8C",
    "Processor",
    "#0E4B55",
    '<rect x="-70" y="-70" width="140" height="140" rx="12"/><rect x="-45" y="-45" width="90" height="90" rx="4"/><circle cx="0" cy="0" r="18"/>',
  ],
  [
    "volt-b650",
    "Volt B650",
    "Motherboard",
    "#0369A1",
    '<rect x="-120" y="-90" width="240" height="180" rx="6"/><rect x="-90" y="-50" width="70" height="70" rx="4"/><rect x="20" y="-60" width="60" height="30" rx="3"/><rect x="20" y="0" width="60" height="30" rx="3"/>',
  ],
  [
    "volt-ddr5",
    "Volt DDR5 16GB",
    "Memory",
    "#125E6A",
    '<rect x="-130" y="-25" width="260" height="50" rx="6"/><circle cx="-100" cy="0" r="6" fill="#125E6A" stroke="none"/><circle cx="100" cy="0" r="6" fill="#125E6A" stroke="none"/>',
  ],
  [
    "volt-ddr4",
    "Volt DDR4 16GB",
    "Memory",
    "#5B6B78",
    '<rect x="-130" y="-25" width="260" height="50" rx="6"/><line x1="-90" y1="-10" x2="-90" y2="10"/><line x1="-60" y1="-10" x2="-60" y2="10"/>',
  ],
  [
    "apex-arc",
    "Apex Arc 8GB",
    "Graphics card",
    "#B8612C",
    '<rect x="-140" y="-40" width="280" height="90" rx="8"/><rect x="-120" y="-20" width="80" height="50" rx="4"/><circle cx="40" cy="5" r="22"/><circle cx="95" cy="5" r="22"/>',
  ],
  [
    "frame-ssd",
    "Frame 1TB SSD",
    "NVMe storage",
    "#125E6A",
    '<rect x="-100" y="-30" width="200" height="60" rx="6"/><rect x="-80" y="-12" width="40" height="24" rx="2" fill="#125E6A" stroke="none"/>',
  ],
  [
    "frame-hdd",
    "Frame 2TB HDD",
    "Hard drive",
    "#5B6B78",
    '<rect x="-90" y="-55" width="180" height="110" rx="8"/><circle cx="0" cy="0" r="28"/><circle cx="0" cy="0" r="8" fill="#5B6B78" stroke="none"/>',
  ],
  [
    "frame-psu",
    "Frame 650W",
    "Power supply",
    "#0E1A24",
    '<rect x="-100" y="-55" width="200" height="110" rx="8"/><circle cx="-40" cy="0" r="20"/><rect x="20" y="-20" width="50" height="40" rx="3"/>',
  ],
  [
    "shell-case",
    "Shell Mesh",
    "PC case",
    "#0E1A24",
    '<rect x="-70" y="-110" width="140" height="220" rx="8"/><line x1="-50" y1="-80" x2="50" y2="-80"/><line x1="-50" y1="-50" x2="50" y2="-50"/><line x1="-50" y1="-20" x2="50" y2="-20"/>',
  ],
  [
    "breeze-fan",
    "Breeze 120",
    "Case fan",
    "#0369A1",
    '<circle r="70"/><circle r="18"/><line x1="0" y1="-70" x2="0" y2="-25"/><line x1="0" y1="25" x2="0" y2="70"/><line x1="-70" y1="0" x2="-25" y2="0"/><line x1="25" y1="0" x2="70" y2="0"/>',
  ],
  [
    "frost-cooler",
    "Frost Air",
    "CPU cooler",
    "#125E6A",
    '<rect x="-40" y="-80" width="80" height="160" rx="6"/><line x1="-55" y1="-60" x2="55" y2="-60"/><line x1="-55" y1="-20" x2="55" y2="-20"/><line x1="-55" y1="20" x2="55" y2="20"/><circle cx="0" cy="70" r="22"/>',
  ],
  [
    "view-24",
    "View 24 IPS",
    "Monitor",
    "#125E6A",
    '<rect x="-140" y="-80" width="280" height="160" rx="8"/><rect x="-120" y="-60" width="240" height="120" fill="#0E1A24" stroke="none"/><rect x="-20" y="85" width="40" height="25"/><line x1="-60" y1="110" x2="60" y2="110"/>',
  ],
  [
    "view-27",
    "View 27 QHD",
    "Monitor",
    "#0E4B55",
    '<rect x="-150" y="-85" width="300" height="170" rx="8"/><rect x="-128" y="-63" width="256" height="126" fill="#0E1A24" stroke="none"/><rect x="-18" y="90" width="36" height="22"/>',
  ],
  [
    "lumen-phone",
    "Lumen Phone SE",
    "Mobile phone",
    "#125E6A",
    '<rect x="-45" y="-95" width="90" height="180" rx="14"/><rect x="-32" y="-75" width="64" height="130" rx="4" fill="#EEF2F5" stroke="none"/><circle cx="0" cy="70" r="6"/>',
  ],
  [
    "ridge-tablet",
    "Ridge Tab 10",
    "Tablet",
    "#B8612C",
    '<rect x="-110" y="-80" width="220" height="160" rx="12"/><rect x="-90" y="-60" width="180" height="120" rx="4" fill="#EEF2F5" stroke="none"/>',
  ],
  [
    "view-43-tv",
    "View 43 TV",
    "Smart TV",
    "#0E1A24",
    '<rect x="-170" y="-90" width="340" height="190" rx="6"/><rect x="-150" y="-70" width="300" height="150" fill="#0E1A24" stroke="none"/><line x1="-40" y1="110" x2="40" y2="110"/><line x1="0" y1="110" x2="0" y2="130"/>',
  ],
  [
    "apex-headset",
    "Apex Pulse",
    "Gaming headset",
    "#B8612C",
    '<path d="M-70 20v-20a70 70 0 0 1 140 0v20"/><rect x="-95" y="10" width="30" height="50" rx="8"/><rect x="65" y="10" width="30" height="50" rx="8"/>',
  ],
  [
    "shell-keyboard",
    "Shell Key75",
    "Mechanical keyboard",
    "#0E1A24",
    '<rect x="-160" y="-45" width="320" height="90" rx="8"/><rect x="-140" y="-25" width="28" height="28" rx="3"/><rect x="-100" y="-25" width="28" height="28" rx="3"/><rect x="-60" y="-25" width="28" height="28" rx="3"/><rect x="-20" y="-25" width="80" height="28" rx="3"/>',
  ],
];

for (const [file, title, subtitle, accent, shape] of items) {
  fs.writeFileSync(
    path.join(dir, `${file}.svg`),
    svg({ title, subtitle, shape, accent }),
  );
}

console.log(`wrote ${items.length} product images`);
